<?php

namespace App\Services;

use App\Models\AuditEvent;
use App\Models\Book;
use App\Models\BookCopy;
use App\Models\CirculationRequest;
use App\Models\CopyAllocation;
use App\Models\LibraryPolicy;
use App\Models\Loan;
use App\Models\Member;
use App\Models\User;
use Closure;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

class CirculationService
{
    public function __construct(private LibraryCalendar $calendar) {}

    public function requestBook(User $actor, int $bookId): CirculationRequest
    {
        return $this->mutate(function (LibraryPolicy $policy) use ($actor, $bookId): CirculationRequest {
            $member = Member::where('user_id', $actor->id)->firstOrFail();
            $book = Book::findOrFail($bookId);
            $key = $member->id.':'.$book->id;
            if ($existing = CirculationRequest::where('active_key', $key)->first()) {
                return $existing;
            }
            $this->assertEligible($member, $policy->terms(), true);
            if ($member->loans()->where('status', 'active')->whereHas('copy', fn ($query) => $query->where('book_id', $bookId))->exists()) {
                $this->fail('Ya tienes un ejemplar de este título en préstamo.');
            }
            $request = CirculationRequest::create([
                'member_id' => $member->id, 'book_id' => $bookId, 'active_key' => $key,
                'status' => 'pending', 'requested_at' => now()->utc(),
            ]);
            $this->audit('request.created', $request, $actor);

            return $request;
        });
    }

    public function prepare(User $actor, int $requestId): CirculationRequest
    {
        $this->staff($actor);

        return $this->mutate(function (LibraryPolicy $policy) use ($actor, $requestId): CirculationRequest {
            $request = CirculationRequest::with('member')->findOrFail($requestId);
            if ($request->status === 'ready') {
                return $request;
            }
            if (! in_array($request->status, ['pending', 'waiting'], true)) {
                $this->fail('Esta solicitud ya está cerrada.');
            }
            if (! Book::whereKey($request->book_id)->exists()) {
                $this->fail('La ficha está archivada y no puede circular.');
            }
            $this->assertEligible($request->member, $policy->terms());
            if ($request->status === 'pending') {
                $request->update(['status' => 'waiting', 'approved_by' => $actor->id]);
                $this->audit('request.approved', $request, $actor);
            }
            $this->assignNext($request->book_id, $policy, $actor);

            return $request->refresh();
        });
    }

    public function issue(User $actor, int $requestId): Loan
    {
        $this->staff($actor);

        return $this->mutate(function (LibraryPolicy $policy) use ($actor, $requestId): Loan {
            $request = CirculationRequest::with('member')->findOrFail($requestId);
            if ($request->status === 'fulfilled') {
                return Loan::where('circulation_request_id', $requestId)->firstOrFail();
            }
            $terms = $policy->terms();
            if ($request->status !== 'ready') {
                $this->fail('Primero valida la solicitud y prepara un ejemplar.');
            }
            if ($request->ready_until->toDateString() < $this->calendar->today($terms)->toDateString()) {
                $this->fail('Venció el plazo de recogida. Actualiza las reservas antes de continuar.');
            }
            $this->assertEligible($request->member, $terms);
            if (! Book::whereKey($request->book_id)->exists()) {
                $this->fail('La ficha está archivada y no puede entregarse.');
            }
            $allocation = CopyAllocation::where('circulation_request_id', $requestId)->firstOrFail();
            $copy = BookCopy::lockForUpdate()->findOrFail($allocation->copy_id);
            if ($copy->status !== 'held' || $copy->book_id !== $request->book_id) {
                $this->fail('El ejemplar no coincide con la asignación preparada.');
            }
            $loan = Loan::create([
                'circulation_request_id' => $requestId, 'member_id' => $request->member_id,
                'book_copy_id' => $copy->id, 'active_copy_id' => $copy->id,
                'status' => 'active', 'checked_out_at' => now()->utc(),
                'due_on' => $this->calendar->dueDate($this->calendar->today($terms), $terms['loan_days'], $terms),
                'issued_by' => $actor->id, 'terms' => $terms,
            ]);
            $copy->update(['status' => 'loaned']);
            $request->update(['status' => 'fulfilled', 'active_key' => null, 'closed_at' => now()->utc()]);
            $this->audit('loan.issued', $loan, $actor, ['due_on' => $loan->due_on->toDateString(), 'policy_version' => $terms['version']]);

            return $loan;
        });
    }

    public function receive(User $actor, int $loanId, string $condition): Loan
    {
        $this->staff($actor);
        if (! in_array($condition, BookCopy::CONDITIONS, true)) {
            $this->fail('Selecciona una condición física válida.');
        }

        return $this->mutate(function (LibraryPolicy $policy) use ($actor, $loanId, $condition): Loan {
            $loan = Loan::findOrFail($loanId);
            if ($loan->status !== 'active') {
                if ($loan->returned_condition === $condition) {
                    return $loan;
                }
                $this->fail('El préstamo ya está cerrado; no se puede cambiar su devolución.');
            }
            $copy = BookCopy::lockForUpdate()->findOrFail($loan->book_copy_id);
            $loan->update([
                'status' => $condition === 'lost' ? 'lost' : 'returned', 'active_copy_id' => null,
                'returned_at' => now()->utc(), 'returned_condition' => $condition, 'received_by' => $actor->id,
            ]);
            CopyAllocation::where('copy_id', $copy->id)->where('circulation_request_id', $loan->circulation_request_id)->delete();
            $copy->update(['condition' => $condition, 'status' => match ($condition) {
                'damaged' => 'repair', 'lost' => 'lost', default => 'available',
            }]);
            $this->audit($condition === 'lost' ? 'loan.lost' : 'loan.returned', $loan, $actor, ['condition' => $condition]);
            $this->assignNext($copy->book_id, $policy, $actor);

            return $loan;
        });
    }

    public function cancel(User $actor, int $requestId): CirculationRequest
    {
        return $this->mutate(function (LibraryPolicy $policy) use ($actor, $requestId): CirculationRequest {
            $request = CirculationRequest::with('member')->findOrFail($requestId);
            abort_unless($request->member->user_id === $actor->id || $actor->canManageBooks(), 404);
            if ($request->status === 'cancelled') {
                return $request;
            }
            $this->closeRequest($request, 'cancelled', 'Cancelada por el solicitante o el personal.');
            $this->audit('request.cancelled', $request, $actor);
            $this->assignNext($request->book_id, $policy, $actor);

            return $request;
        });
    }

    public function reject(User $actor, int $requestId, string $reason): CirculationRequest
    {
        $this->staff($actor);
        $reason = trim($reason);
        if ($reason === '' || mb_strlen($reason) > 500) {
            $this->fail('Escribe un motivo de rechazo de hasta 500 caracteres.');
        }

        return $this->mutate(function (LibraryPolicy $policy) use ($actor, $requestId, $reason): CirculationRequest {
            $request = CirculationRequest::findOrFail($requestId);
            if ($request->status === 'rejected' && $request->decision_reason === $reason) {
                return $request;
            }
            $this->closeRequest($request, 'rejected', $reason);
            $this->audit('request.rejected', $request, $actor);
            $this->assignNext($request->book_id, $policy, $actor);

            return $request;
        });
    }

    private function closeRequest(CirculationRequest $request, string $status, string $reason): void
    {
        if (! in_array($request->status, CirculationRequest::OPEN, true)) {
            $this->fail('La solicitud ya está cerrada.');
        }
        $allocation = CopyAllocation::where('circulation_request_id', $request->id)->first();
        if ($allocation) {
            BookCopy::whereKey($allocation->copy_id)->where('status', 'held')->update(['status' => 'available']);
            $allocation->delete();
        }
        $request->update(['status' => $status, 'active_key' => null, 'closed_at' => now()->utc(), 'decision_reason' => $reason]);
    }

    private function assignNext(int $bookId, LibraryPolicy $policy, User $actor): void
    {
        if (! Book::whereKey($bookId)->exists()) {
            return;
        }
        $terms = $policy->terms();
        $waiting = CirculationRequest::with('member')->where('book_id', $bookId)->where('status', 'waiting')->orderBy('priority')->orderBy('requested_at')->orderBy('id')->get();
        foreach ($waiting as $request) {
            $copy = BookCopy::where('book_id', $bookId)->where('status', 'available')->whereIn('condition', ['good', 'worn'])->whereNotIn('id', CopyAllocation::select('copy_id'))->lockForUpdate()->first();
            if (! $copy) {
                break;
            }
            try {
                $this->assertEligible($request->member, $terms);
            } catch (ValidationException) {
                continue;
            }
            CopyAllocation::create(['copy_id' => $copy->id, 'circulation_request_id' => $request->id]);
            $copy->update(['status' => 'held']);
            $request->update(['status' => 'ready', 'ready_until' => $this->calendar->dueDate($this->calendar->today($terms), $terms['pickup_days'], $terms)]);
            $this->audit('request.ready', $request, $actor, ['copy_id' => $copy->id, 'ready_until' => $request->ready_until->toDateString()]);
        }
    }

    private function assertEligible(Member $member, array $terms, bool $includeRequests = false): void
    {
        $member = $member->fresh('user');
        $today = $this->calendar->today($terms)->toDateString();
        if ($member->status !== 'active' || $member->user->trashed() || ($member->expires_on && $member->expires_on->toDateString() < $today)) {
            $this->fail('La membresía está suspendida, vencida o desactivada. Consulta al personal.');
        }
        $count = $member->loans()->where('status', 'active')->count();
        if ($includeRequests) {
            $count += $member->requests()->whereIn('status', CirculationRequest::OPEN)->count();
        }
        if ($count >= ($member->loan_limit ?? $terms['max_loans'])) {
            $this->fail('Alcanzaste el límite de préstamos y solicitudes permitido.');
        }
        if ($terms['block_overdue'] && $member->loans()->where('status', 'active')->whereDate('due_on', '<', $today)->exists()) {
            $this->fail('Hay préstamos vencidos. Devuélvelos antes de solicitar o renovar.');
        }
    }

    private function staff(User $actor): void
    {
        abort_if($actor->trashed(), 403);
        Gate::forUser($actor)->authorize('circulate');
    }

    private function audit(string $action, Model $subject, User $actor, array $metadata = []): void
    {
        AuditEvent::create(['user_id' => $actor->id, 'action' => $action, 'subject_type' => class_basename($subject), 'subject_id' => $subject->getKey(), 'metadata' => $metadata]);
    }

    private function fail(string $message): never
    {
        throw ValidationException::withMessages(['circulation' => $message]);
    }

    /**
     * @template T
     *
     * @param  Closure(LibraryPolicy): T  $action
     * @return T
     */
    private function mutate(Closure $action): mixed
    {
        return DB::transaction(fn () => $action(LibraryPolicy::lockForUpdate()->findOrFail(1)), 3);
    }
}
