<?php

namespace App\Services;

use App\Models\AuditEvent;
use App\Models\FinancialEntry;
use App\Models\LibraryPolicy;
use App\Models\Loan;
use App\Models\Member;
use App\Models\User;
use Carbon\CarbonImmutable;
use Closure;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class LedgerService
{
    public function __construct(private LibraryCalendar $calendar) {}

    /** @return array{recorded_cents: int, pending_cents: int, balance_cents: int, currency: string} */
    public function summary(Member $member): array
    {
        $recorded = (int) $member->entries()->sum('amount_cents');
        $pending = 0;
        foreach ($this->unsettledLoans($member) as $loan) {
            $pending += array_sum(array_column($this->pendingLoan($loan), 'amount_cents'));
        }

        return ['recorded_cents' => $recorded, 'pending_cents' => $pending, 'balance_cents' => $recorded + $pending, 'currency' => LibraryPolicy::current()->currency];
    }

    public function assessMember(int $memberId, ?User $actor = null): int
    {
        return $this->mutate(function (LibraryPolicy $policy) use ($memberId, $actor): int {
            $member = Member::findOrFail($memberId);
            if ($actor) {
                $actor = User::findOrFail($actor->id);
                abort_unless($actor->id === $member->user_id || $actor->isAdmin(), 404);
            }

            return $this->assessMemberLocked($member, $actor);
        });
    }

    public function assessLoan(int $loanId, ?User $actor = null): int
    {
        return $this->mutate(function (LibraryPolicy $policy) use ($loanId, $actor): int {
            $loan = Loan::with('renewals')->findOrFail($loanId);
            if ($actor) {
                $actor = User::findOrFail($actor->id);
                Gate::forUser($actor)->authorize('view', $loan);
            }

            return $this->assessLoanLocked($loan, $actor);
        });
    }

    public function assessAll(): int
    {
        $created = 0;
        $lastId = (int) Loan::max('id');
        Loan::where('id', '<=', $lastId)->where(fn ($query) => $query->where('status', 'active')->orWhereNull('fee_settled_at'))
            ->chunkById(100, function ($loans) use (&$created): void {
                foreach ($loans as $loan) {
                    $created += $this->assessLoan($loan->id);
                }
            });

        return $created;
    }

    public function manual(User $actor, int $memberId, string $kind, mixed $amountCents, string $operationKey, string $reason, ?string $reference = null): FinancialEntry
    {
        if (! in_array($kind, FinancialEntry::MANUAL_KINDS, true) || ! is_int($amountCents) || $amountCents === 0 || abs($amountCents) > 1_000_000_000 || ($kind !== 'adjustment' && $amountCents < 0)) {
            $this->fail('Selecciona un movimiento válido e indica centavos enteros distintos de cero, hasta 1000000000.');
        }
        $key = $this->manualKey($operationKey);
        $reason = $this->reason($reason);
        $reference = trim($reference ?? '') ?: null;
        if ($reference !== null && mb_strlen($reference) > 100) {
            $this->fail('La referencia admite hasta 100 caracteres.');
        }

        return $this->mutate(function (LibraryPolicy $policy) use ($actor, $memberId, $kind, $amountCents, $key, $reason, $reference): FinancialEntry {
            $this->admin($actor);
            $member = Member::findOrFail($memberId);
            $amount = in_array($kind, ['payment', 'credit'], true) ? -$amountCents : $amountCents;
            $intent = ['member_id' => $memberId, 'actor_id' => $actor->id, 'kind' => $kind, 'amount_cents' => $amount, 'reason' => $reason, 'reference' => $reference, 'reversal_of' => null];
            if ($existing = $this->replay($key, $intent)) {
                return $existing;
            }
            $this->assessMemberLocked($member, $actor);
            if ((int) $member->entries()->sum('amount_cents') + $amount < 0) {
                $this->fail('El movimiento superaría el saldo pendiente. No se registran sobrepagos ni saldos a favor en esta versión.');
            }

            return $this->append($intent + ['loan_id' => null, 'currency' => $policy->currency, 'event_key' => $key,
                'occurred_on' => $this->calendar->today($policy->terms())->toDateString(), 'timezone' => $policy->timezone]);
        });
    }

    public function reverse(User $actor, int $entryId, string $operationKey, string $reason): FinancialEntry
    {
        $key = $this->manualKey($operationKey);
        $reason = $this->reason($reason);

        return $this->mutate(function (LibraryPolicy $policy) use ($actor, $entryId, $key, $reason): FinancialEntry {
            $this->admin($actor);
            $original = FinancialEntry::findOrFail($entryId);
            $intent = ['member_id' => $original->member_id, 'actor_id' => $actor->id, 'kind' => 'reversal', 'amount_cents' => -$original->amount_cents,
                'reason' => $reason, 'reference' => $original->reference, 'reversal_of' => $original->id];
            if ($existing = $this->replay($key, $intent)) {
                return $existing;
            }
            if ($original->kind === 'reversal' || FinancialEntry::where('reversal_of', $original->id)->exists()) {
                $this->fail('Este movimiento ya fue revertido o es una reversión.');
            }
            $member = Member::findOrFail($original->member_id);
            $this->assessMemberLocked($member, $actor);
            if ((int) $member->entries()->sum('amount_cents') - $original->amount_cents < 0) {
                $this->fail('La reversión crearía un saldo a favor. Revierte primero los pagos o abonos que corresponda.');
            }

            return $this->append($intent + ['loan_id' => $original->loan_id, 'currency' => $original->currency, 'event_key' => $key,
                'occurred_on' => $this->calendar->today($policy->terms())->toDateString(), 'timezone' => $policy->timezone]);
        });
    }

    /** @return Collection<int, Loan> */
    private function unsettledLoans(Member $member): Collection
    {
        return $member->loans()->with('renewals')->where(fn ($query) => $query->where('status', 'active')->orWhereNull('fee_settled_at'))->get();
    }

    private function assessMemberLocked(Member $member, ?User $actor): int
    {
        $created = 0;
        foreach ($this->unsettledLoans($member) as $loan) {
            $created += $this->assessLoanLocked($loan, $actor);
        }

        return $created;
    }

    private function assessLoanLocked(Loan $loan, ?User $actor): int
    {
        $pending = $this->pendingLoan($loan);
        foreach ($pending as $attributes) {
            $this->append($attributes + ['actor_id' => $actor?->id, 'reversal_of' => null, 'reference' => null]);
        }
        if ($loan->status !== 'active' && $loan->getRawOriginal('fee_settled_at') === null) {
            $loan->update(['fee_settled_at' => now()->utc()]);
        }

        return count($pending);
    }

    /** @return list<array<string, mixed>> */
    private function pendingLoan(Loan $loan): array
    {
        if ($loan->status !== 'active' && $loan->getRawOriginal('fee_settled_at') !== null) {
            return [];
        }
        $terms = $loan->terms;
        $end = $loan->returned_at ? CarbonImmutable::instance($loan->returned_at)->setTimezone($terms['timezone'])->toDateString() : $this->calendar->today($terms)->toDateString();
        $base = ['member_id' => $loan->member_id, 'loan_id' => $loan->id, 'currency' => $terms['currency'], 'timezone' => $terms['timezone']];
        $candidates = [];
        if ($terms['daily_fine_cents'] > 0) {
            $segments = [[$loan->due_on->toDateString(), $end]];
            foreach ($loan->renewals as $renewal) {
                $segments[] = [$renewal->getRawOriginal('previous_due_on'), CarbonImmutable::instance($renewal->created_at)->setTimezone($terms['timezone'])->toDateString()];
            }
            foreach ($segments as [$due, $through]) {
                foreach ($this->calendar->overdueDates($due, $through, $terms) as $date) {
                    $key = 'overdue:'.$loan->id.':'.$date;
                    $candidates[$key] = $base + ['event_key' => $key, 'kind' => 'overdue', 'amount_cents' => (int) $terms['daily_fine_cents'], 'occurred_on' => $date, 'reason' => 'Retraso del préstamo #'.$loan->id.' correspondiente al '.$date.'.'];
                }
            }
        }
        if (in_array($loan->returned_condition, ['lost', 'damaged'], true)) {
            $kind = $loan->returned_condition === 'lost' ? 'lost' : 'damage';
            $amount = (int) $terms[$kind === 'lost' ? 'lost_charge_cents' : 'damage_charge_cents'];
            if ($amount > 0) {
                $key = $kind.':'.$loan->id;
                $candidates[$key] = $base + ['event_key' => $key, 'kind' => $kind, 'amount_cents' => $amount, 'occurred_on' => $end,
                    'reason' => ($kind === 'lost' ? 'Pérdida' : 'Daño').' registrado en el préstamo #'.$loan->id.'.'];
            }
        }
        if ($candidates === []) {
            return [];
        }
        $existing = FinancialEntry::where('loan_id', $loan->id)->pluck('event_key')->all();

        return array_values(array_diff_key($candidates, array_fill_keys($existing, true)));
    }

    private function append(array $attributes): FinancialEntry
    {
        $entry = FinancialEntry::create($attributes + ['created_at' => now()->utc()]);
        AuditEvent::create(['user_id' => $entry->actor_id, 'action' => 'finance.recorded', 'subject_type' => 'FinancialEntry', 'subject_id' => $entry->id,
            'metadata' => $entry->only(['kind', 'member_id', 'loan_id', 'amount_cents', 'currency', 'reversal_of'])]);

        return $entry;
    }

    private function replay(string $key, array $intent): ?FinancialEntry
    {
        $entry = FinancialEntry::where('event_key', $key)->first();
        if ($entry) {
            foreach ($intent as $field => $value) {
                if ($entry->getAttribute($field) !== $value) {
                    $this->fail('Esta clave ya se utilizó para otro movimiento. Revisa la operación antes de confirmar.');
                }
            }
        }

        return $entry;
    }

    private function manualKey(string $key): string
    {
        if (! Str::isUuid($key)) {
            $this->fail('La clave de operación no es válida. Abre de nuevo la confirmación.');
        }

        return 'manual:'.strtolower($key);
    }

    private function reason(string $reason): string
    {
        $reason = trim($reason);
        if ($reason === '' || mb_strlen($reason) > 500) {
            $this->fail('Escribe un motivo de hasta 500 caracteres.');
        }

        return $reason;
    }

    private function admin(User $actor): void
    {
        $fresh = User::find($actor->id);
        abort_unless($fresh !== null, 403);
        Gate::forUser($fresh)->authorize('admin');
    }

    private function fail(string $message): never
    {
        throw ValidationException::withMessages(['finance' => $message]);
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
