<?php

namespace App\Services;

use App\Models\AuditEvent;
use App\Models\Book;
use App\Models\BookCopy;
use App\Models\CirculationRequest;
use App\Models\CopyAllocation;
use App\Models\LibraryNotice;
use App\Models\LibraryPolicy;
use App\Models\Loan;
use App\Models\LoanRenewal;
use App\Models\Member;
use App\Models\User;
use Carbon\CarbonImmutable;
use Closure;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CirculationService
{
    public function __construct(private LibraryCalendar $calendar) {}

    public function requestBook(User $actor, int $bookId): CirculationRequest
    {
        return $this->mutate(function (LibraryPolicy $policy) use ($actor, $bookId): CirculationRequest {
            abort_unless(User::whereKey($actor->id)->exists(), 403);
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
            $this->staff($actor);
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
            $this->staff($actor);
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
            $this->notice($loan->member_id, 'loan.issued:'.$loan->id, 'loan.issued', 'Entrega de «'.$request->book->title.'» registrada. Devuelve el ejemplar a más tardar el '.$this->dateLabel($loan->due_on->toDateString()).'.');

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
            $this->staff($actor);
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
            $this->notice($loan->member_id, 'loan.closed:'.$loan->id, 'loan.closed', 'Se registró el cierre del préstamo de «'.$copy->book->title.'». Consulta el historial de tu biblioteca.');
            $this->assignNext($copy->book_id, $policy, $actor);

            return $loan;
        });
    }

    public function cancel(User $actor, int $requestId): CirculationRequest
    {
        return $this->mutate(function (LibraryPolicy $policy) use ($actor, $requestId): CirculationRequest {
            $actor = User::findOrFail($actor->id);
            $request = CirculationRequest::with('member')->findOrFail($requestId);
            abort_unless($request->member->user_id === $actor->id || $actor->canManageBooks(), 404);
            if ($request->status === 'cancelled') {
                return $request;
            }
            $this->closeRequest($request, 'cancelled', 'Cancelada por el solicitante o el personal.');
            $this->audit('request.cancelled', $request, $actor);
            $this->notice($request->member_id, 'request.cancelled:'.$request->id, 'request.cancelled', 'Se canceló tu solicitud de «'.$request->book->title.'».');
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
            $this->staff($actor);
            $request = CirculationRequest::findOrFail($requestId);
            if ($request->status === 'rejected' && $request->decision_reason === $reason) {
                return $request;
            }
            $this->closeRequest($request, 'rejected', $reason);
            $this->audit('request.rejected', $request, $actor);
            $this->notice($request->member_id, 'request.rejected:'.$request->id, 'request.rejected', 'No se aprobó tu solicitud de «'.$request->book->title.'». Motivo: '.$reason);
            $this->assignNext($request->book_id, $policy, $actor);

            return $request;
        });
    }

    public function renew(User $actor, int $loanId, string $operationKey): LoanRenewal
    {
        if (! Str::isUuid($operationKey)) {
            $this->fail('La operación de renovación no es válida. Abre de nuevo la confirmación.');
        }
        $operationKey = strtolower($operationKey);

        return $this->mutate(function (LibraryPolicy $policy) use ($actor, $loanId, $operationKey): LoanRenewal {
            $actor = User::findOrFail($actor->id);
            $loan = Loan::with(['member', 'copy'])->findOrFail($loanId);
            Gate::forUser($actor)->authorize('view', $loan);
            if ($existing = LoanRenewal::where('operation_key', $operationKey)->first()) {
                if ($existing->loan_id !== $loanId || $existing->actor_id !== $actor->id) {
                    $this->fail('Esta operación ya se utilizó. Abre de nuevo la confirmación.');
                }

                return $existing;
            }
            if ($loan->status !== 'active') {
                $this->fail('Solo se puede renovar un préstamo activo.');
            }
            $this->assertEligible($loan->member, $policy->terms(), false, $loan->id);
            $terms = $loan->terms;
            if ($loan->renewal_count >= $terms['max_renewals']) {
                $this->fail('Este préstamo alcanzó su límite de renovaciones.');
            }
            if (CirculationRequest::where('book_id', $loan->copy->book_id)->where('member_id', '!=', $loan->member_id)->whereIn('status', CirculationRequest::OPEN)->exists()) {
                $this->fail('Otra persona espera este título. Devuelve el ejemplar para respetar la reserva.');
            }
            $today = $this->calendar->today($terms);
            $base = $loan->due_on->greaterThan($today) ? $loan->due_on : $today;
            $renewal = LoanRenewal::create([
                'loan_id' => $loan->id, 'actor_id' => $actor->id, 'operation_key' => $operationKey,
                'renewal_number' => $loan->renewal_count + 1, 'previous_due_on' => $loan->due_on->toDateString(),
                'due_on' => $this->calendar->dueDate($base, $terms['loan_days'], $terms),
            ]);
            $loan->update(['due_on' => $renewal->getRawOriginal('due_on'), 'renewal_count' => $renewal->renewal_number]);
            $this->audit('loan.renewed', $loan, $actor, $renewal->only(['id', 'renewal_number', 'previous_due_on', 'due_on']));
            $this->notice($loan->member_id, 'loan.renewed:'.$renewal->id, 'loan.renewed', 'Préstamo de «'.$loan->copy->book->title.'» renovado. Nuevo vencimiento: '.$this->dateLabel($loan->due_on->toDateString()).'.');

            return $renewal;
        });
    }

    /** @return array{expired: int, ready: int} */
    public function refreshReservations(?User $actor = null, ?int $bookId = null): array
    {
        return $this->mutate(function (LibraryPolicy $policy) use ($actor, $bookId): array {
            if ($actor) {
                $this->staff($actor);
            }
            $expired = 0;
            $today = $this->calendar->today($policy->terms())->toDateString();
            $stale = CirculationRequest::where('status', 'ready')->whereDate('ready_until', '<', $today)
                ->when($bookId !== null, fn ($query) => $query->where('book_id', $bookId))->get();
            foreach ($stale as $request) {
                $this->closeRequest($request, 'expired', 'Venció el periodo de recogida sin confirmarse la entrega.');
                $this->audit('request.expired', $request, $actor);
                $this->notice($request->member_id, 'request.expired:'.$request->id, 'request.expired', 'Venció la recogida de «'.$request->book->title.'». El ejemplar se liberó. Puedes iniciar una nueva solicitud.');
                $expired++;
            }
            $ready = 0;
            $bookIds = CirculationRequest::where('status', 'waiting')->when($bookId !== null, fn ($query) => $query->where('book_id', $bookId))->distinct()->pluck('book_id');
            foreach ($bookIds as $waitingBookId) {
                $ready += $this->assignNext($waitingBookId, $policy, $actor);
            }

            return ['expired' => $expired, 'ready' => $ready];
        });
    }

    private function dateLabel(string $date): string
    {
        return CarbonImmutable::parse($date)->locale('es')->isoFormat('D [de] MMM [de] YYYY');
    }

    private function notice(int $memberId, string $key, string $kind, string $message): void
    {
        LibraryNotice::firstOrCreate(['event_key' => $key], ['member_id' => $memberId, 'kind' => $kind, 'message' => $message]);
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

    private function assignNext(int $bookId, LibraryPolicy $policy, ?User $actor): int
    {
        $book = Book::find($bookId);
        if (! $book) {
            return 0;
        }
        $assigned = 0;
        $terms = $policy->terms();
        $waiting = CirculationRequest::with('member.user')->where('book_id', $bookId)->where('status', 'waiting')->orderBy('priority')->orderBy('requested_at')->orderBy('id')->get();
        $outOfStock = false;
        foreach ($waiting as $request) {
            if (! $this->membershipActive($request->member, $terms)) {
                $reason = 'La membresía está suspendida, vencida o desactivada. Consulta al personal.';
                $this->closeRequest($request, 'rejected', $reason);
                $this->audit('request.rejected', $request, $actor, ['reason' => 'membership_inactive']);
                $this->notice($request->member_id, 'request.rejected:'.$request->id, 'request.rejected', 'Se cerró tu reserva de «'.$book->title.'». '.$reason);

                continue;
            }
            if ($outOfStock) {
                continue;
            }
            $copy = BookCopy::where('book_id', $bookId)->where('status', 'available')->whereIn('condition', ['good', 'worn'])->whereNotIn('id', CopyAllocation::select('copy_id'))->lockForUpdate()->first();
            if (! $copy) {
                $outOfStock = true;

                continue;
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
            $this->notice($request->member_id, 'request.ready:'.$request->id, 'request.ready', 'Tu solicitud de «'.$book->title.'» está preparada. Recógela hasta el '.$this->dateLabel($request->ready_until->toDateString()).', inclusive. Consulta el ejemplar y su ubicación en Mis solicitudes.');
            $assigned++;
        }

        return $assigned;
    }

    private function assertEligible(Member $member, array $terms, bool $includeRequests = false, ?int $ignoreLoanId = null): void
    {
        $member = $member->fresh('user');
        $today = $this->calendar->today($terms)->toDateString();
        if (! $this->membershipActive($member, $terms)) {
            $this->fail('La membresía está suspendida, vencida o desactivada. Consulta al personal.');
        }
        $count = $member->loans()->where('status', 'active')->when($ignoreLoanId !== null, fn ($query) => $query->whereKeyNot($ignoreLoanId))->count();
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

    private function membershipActive(Member $member, array $terms): bool
    {
        return $member->status === 'active' && ! $member->user->trashed()
            && ($member->expires_on === null || $member->expires_on->toDateString() >= $this->calendar->today($terms)->toDateString());
    }

    private function staff(User $actor): void
    {
        $fresh = User::find($actor->id);
        abort_unless($fresh !== null, 403);
        Gate::forUser($fresh)->authorize('circulate');
    }

    private function audit(string $action, Model $subject, ?User $actor, array $metadata = []): void
    {
        AuditEvent::create(['user_id' => $actor?->id, 'action' => $action, 'subject_type' => class_basename($subject), 'subject_id' => $subject->getKey(), 'metadata' => $metadata]);
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
