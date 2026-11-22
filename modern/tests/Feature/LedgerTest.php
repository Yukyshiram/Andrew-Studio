<?php

namespace Tests\Feature;

use App\Models\AuditEvent;
use App\Models\BookCopy;
use App\Models\FinancialEntry;
use App\Models\LibraryPolicy;
use App\Models\Loan;
use App\Models\LoanRenewal;
use App\Models\Member;
use App\Models\User;
use App\Services\CirculationService;
use App\Services\LedgerService;
use Carbon\CarbonImmutable;
use Closure;
use DomainException;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use PHPUnit\Framework\Attributes\TestWith;
use Tests\TestCase;

class LedgerTest extends TestCase
{
    use RefreshDatabase;

    /** @return array{User, User, Loan} */
    private function loan(array $terms = []): array
    {
        LibraryPolicy::current()->update($terms);
        $reader = User::factory()->create();
        Member::enroll($reader);
        $staff = User::factory()->create(['role' => 'admin']);
        $copy = BookCopy::factory()->create();
        $service = app(CirculationService::class);
        $request = $service->requestBook($reader, $copy->book_id);
        $service->prepare($staff, $request->id);

        return [$reader, $staff, $service->issue($staff, $request->id)];
    }

    private function invalid(Closure $action, string $message): void
    {
        try {
            $action();
            $this->fail('La operación financiera debía rechazarse.');
        } catch (ValidationException $exception) {
            $this->assertSame($message, $exception->errors()['finance'][0]);
        }
    }

    public function test_charges_payments_and_credits_use_integer_cents_and_leave_audited_history(): void
    {
        $member = Member::factory()->create();
        $admin = User::factory()->create(['role' => 'admin']);
        $service = app(LedgerService::class);
        $charge = $service->manual($admin, $member->id, 'adjustment', 10001, (string) Str::uuid(), 'Cargo sintético QA');
        $payment = $service->manual($admin, $member->id, 'payment', 9999, (string) Str::uuid(), 'Pago registrado QA', 'REC-QA-1');
        $service->manual($admin, $member->id, 'credit', 2, (string) Str::uuid(), 'Abono de prueba');
        $this->assertSame(10001, $charge->amount_cents);
        $this->assertSame(-9999, $payment->amount_cents);
        $this->assertSame('REC-QA-1', $payment->reference);
        $this->assertSame(['recorded_cents' => 0, 'pending_cents' => 0, 'balance_cents' => 0, 'currency' => 'MXN'], $service->summary($member));
        $this->assertDatabaseCount('financial_entries', 3);
        $this->assertSame(3, AuditEvent::where('action', 'finance.recorded')->where('user_id', $admin->id)->count());
    }

    #[TestWith([1.25])]
    #[TestWith(['100'])]
    #[TestWith([null])]
    #[TestWith([[]])]
    #[TestWith([0])]
    #[TestWith([1000000001])]
    #[TestWith([-100])]
    public function test_payment_rejects_non_integer_zero_negative_or_excessive_amounts(mixed $amount): void
    {
        $member = Member::factory()->create();
        $admin = User::factory()->create(['role' => 'admin']);
        $this->invalid(fn () => app(LedgerService::class)->manual($admin, $member->id, 'payment', $amount, (string) Str::uuid(), 'Pago QA'), 'Selecciona un movimiento válido e indica centavos enteros distintos de cero, hasta 1000000000.');
        $this->assertDatabaseCount('financial_entries', 0);
    }

    public function test_overpayment_and_negative_adjustment_cannot_create_credit_balance(): void
    {
        $member = Member::factory()->create();
        $admin = User::factory()->create(['role' => 'admin']);
        $service = app(LedgerService::class);
        $service->manual($admin, $member->id, 'adjustment', 125, (string) Str::uuid(), 'Cargo QA');
        foreach (['payment' => 126, 'credit' => 126, 'adjustment' => -126] as $kind => $amount) {
            $this->invalid(fn () => $service->manual($admin, $member->id, $kind, $amount, (string) Str::uuid(), 'Movimiento QA'), 'El movimiento superaría el saldo pendiente. No se registran sobrepagos ni saldos a favor en esta versión.');
        }
        $this->assertDatabaseCount('financial_entries', 1);
        $this->assertSame(125, $service->summary($member)['balance_cents']);
    }

    public function test_manual_replay_is_case_insensitive_and_rejects_changed_intent(): void
    {
        $member = Member::factory()->create();
        $admin = User::factory()->create(['role' => 'admin']);
        $service = app(LedgerService::class);
        $key = (string) Str::uuid();
        $entry = $service->manual($admin, $member->id, 'adjustment', 125, $key, 'Cargo QA', 'QA-1');
        $this->travel(1)->days();
        $this->assertSame($entry->id, $service->manual($admin, $member->id, 'adjustment', 125, strtoupper($key), 'Cargo QA', 'QA-1')->id);
        $this->invalid(fn () => $service->manual($admin, $member->id, 'adjustment', 126, $key, 'Cargo QA', 'QA-1'), 'Esta clave ya se utilizó para otro movimiento. Revisa la operación antes de confirmar.');
        $otherAdmin = User::factory()->create(['role' => 'admin']);
        $this->invalid(fn () => $service->manual($otherAdmin, $member->id, 'adjustment', 125, $key, 'Cargo QA', 'QA-1'), 'Esta clave ya se utilizó para otro movimiento. Revisa la operación antes de confirmar.');
        $this->assertDatabaseCount('financial_entries', 1);
    }

    public function test_reversals_append_opposite_entries_and_require_reversing_payments_before_paid_charges(): void
    {
        $member = Member::factory()->create();
        $admin = User::factory()->create(['role' => 'admin']);
        $service = app(LedgerService::class);
        $charge = $service->manual($admin, $member->id, 'adjustment', 100, (string) Str::uuid(), 'Cargo QA');
        $original = $charge->fresh()->getAttributes();
        $payment = $service->manual($admin, $member->id, 'payment', 100, (string) Str::uuid(), 'Pago QA');
        $this->invalid(fn () => $service->reverse($admin, $charge->id, (string) Str::uuid(), 'Corrección QA'), 'La reversión crearía un saldo a favor. Revierte primero los pagos o abonos que corresponda.');
        $key = (string) Str::uuid();
        $reversal = $service->reverse($admin, $payment->id, $key, 'Pago duplicado QA');
        $this->assertSame(100, $reversal->amount_cents);
        $this->assertSame($payment->id, $reversal->reversal_of);
        $this->assertSame($reversal->id, $service->reverse($admin, $payment->id, $key, 'Pago duplicado QA')->id);
        $service->reverse($admin, $charge->id, (string) Str::uuid(), 'Corrección QA');
        $this->assertSame($original, $charge->fresh()->getAttributes());
        $this->assertSame(0, $service->summary($member)['balance_cents']);
        $this->assertDatabaseCount('financial_entries', 4);
        $this->invalid(fn () => $service->reverse($admin, $payment->id, (string) Str::uuid(), 'Otra corrección'), 'Este movimiento ya fue revertido o es una reversión.');
        $this->invalid(fn () => $service->reverse($admin, $reversal->id, (string) Str::uuid(), 'Otra corrección'), 'Este movimiento ya fue revertido o es una reversión.');
    }

    #[TestWith(['reader'])]
    #[TestWith(['librarian'])]
    public function test_only_current_administrators_can_record_manual_money(string $role): void
    {
        $member = Member::factory()->create();
        $actor = User::factory()->create(['role' => 'admin']);
        User::whereKey($actor->id)->update(['role' => $role]);
        try {
            app(LedgerService::class)->manual($actor, $member->id, 'adjustment', 100, (string) Str::uuid(), 'Cargo QA');
            $this->fail('El rol actual no permite modificar tesorería.');
        } catch (AuthorizationException) {
            $this->assertDatabaseCount('financial_entries', 0);
        }
    }

    #[TestWith(['update'])]
    #[TestWith(['delete'])]
    public function test_posted_entries_cannot_be_changed_or_deleted_through_models(string $action): void
    {
        $member = Member::factory()->create();
        $admin = User::factory()->create(['role' => 'admin']);
        $entry = app(LedgerService::class)->manual($admin, $member->id, 'adjustment', 100, (string) Str::uuid(), 'Cargo QA');
        try {
            $action === 'update' ? $entry->update(['amount_cents' => 0]) : $entry->delete();
            $this->fail('El historial debe ser inmutable.');
        } catch (DomainException) {
            $this->assertDatabaseHas('financial_entries', ['id' => $entry->id, 'amount_cents' => 100]);
        }
    }

    public function test_daily_fines_respect_timezone_closures_grace_and_frozen_rate_without_duplicates(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-11-20T18:00:00Z'));
        [$reader, , $loan] = $this->loan(['loan_days' => 1, 'daily_fine_cents' => 125, 'grace_days' => 1, 'closure_dates' => ['2026-11-23']]);
        LibraryPolicy::current()->update(['daily_fine_cents' => 999, 'grace_days' => 0]);
        $service = app(LedgerService::class);
        $this->travelTo(CarbonImmutable::parse('2026-11-26T05:59:59Z'));
        $this->assertSame(125, $service->summary($loan->member)['pending_cents']);
        $this->assertDatabaseCount('financial_entries', 0);
        $this->travelTo(CarbonImmutable::parse('2026-11-26T06:00:00Z'));
        $this->assertSame(250, $service->summary($loan->member)['pending_cents']);
        $this->assertSame(2, $service->assessMember($loan->member_id, $reader));
        $this->assertSame(0, $service->assessMember($loan->member_id, $reader));
        $this->assertSame(250, $service->summary($loan->member)['recorded_cents']);
        $this->assertSame(0, $service->summary($loan->member)['pending_cents']);
        $this->assertSame(['2026-11-25', '2026-11-26'], FinancialEntry::orderBy('occurred_on')->get()->map(fn ($entry) => $entry->getRawOriginal('occurred_on'))->all());
    }

    #[TestWith(['lost', 50000])]
    #[TestWith(['damaged', 7500])]
    #[TestWith(['good', 0])]
    public function test_closed_loans_assess_condition_once_and_stop_accruing_after_return(string $condition, int $amount): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-11-20T18:00:00Z'));
        [, $staff, $loan] = $this->loan(['lost_charge_cents' => 50000, 'damage_charge_cents' => 7500]);
        app(CirculationService::class)->receive($staff, $loan->id, $condition);
        $service = app(LedgerService::class);
        $service->assessLoan($loan->id, $staff);
        $this->assertSame($amount, $service->summary($loan->member)['recorded_cents']);
        $this->assertNotNull($loan->fresh()->getRawOriginal('fee_settled_at'));
        $this->travel(60)->days();
        $this->assertSame(0, $service->assessLoan($loan->id));
        $this->assertSame($amount, $service->summary($loan->member)['balance_cents']);
        $this->assertDatabaseCount('financial_entries', $amount > 0 ? 1 : 0);
    }

    public function test_preexisting_renewal_history_preserves_prior_overdue_periods(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-11-20T18:00:00Z'));
        [$reader, , $loan] = $this->loan(['loan_days' => 1, 'daily_fine_cents' => 125]);
        LoanRenewal::create(['loan_id' => $loan->id, 'actor_id' => $reader->id, 'operation_key' => (string) Str::uuid(), 'renewal_number' => 1,
            'previous_due_on' => '2026-11-21', 'due_on' => '2026-11-25', 'created_at' => '2026-11-24 18:00:00', 'updated_at' => '2026-11-24 18:00:00']);
        $loan->update(['due_on' => '2026-11-25', 'renewal_count' => 1]);
        $this->travelTo(CarbonImmutable::parse('2026-11-27T18:00:00Z'));
        $service = app(LedgerService::class);
        $this->assertSame(500, $service->summary($loan->member)['pending_cents']);
        $this->assertSame(4, $service->assessLoan($loan->id));
        $this->assertSame(0, $service->assessLoan($loan->id));
        $this->assertSame(500, $service->summary($loan->member)['recorded_cents']);
    }

    public function test_payments_assess_pending_overdue_charges_before_checking_balance(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-11-20T18:00:00Z'));
        [, $admin, $loan] = $this->loan(['loan_days' => 1, 'daily_fine_cents' => 125]);
        $this->travelTo(CarbonImmutable::parse('2026-11-23T18:00:00Z'));
        $service = app(LedgerService::class);
        $service->manual($admin, $loan->member_id, 'payment', 125, (string) Str::uuid(), 'Pago QA');
        $this->assertSame(0, $service->summary($loan->member)['balance_cents']);
        $this->assertDatabaseCount('financial_entries', 2);
        $this->assertSame(0, $service->assessAll());
    }

    public function test_assessment_command_can_be_repeated_without_creating_charges_at_zero_rates(): void
    {
        $this->loan();
        $this->artisan('library:assess-charges')->expectsOutput('Cargos nuevos registrados: 0.')->assertSuccessful();
        $this->artisan('library:assess-charges')->assertSuccessful();
        $this->assertDatabaseCount('financial_entries', 0);
    }

    public function test_reversing_an_overdue_charge_does_not_recreate_the_same_charge(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-11-20T18:00:00Z'));
        [, $admin, $loan] = $this->loan(['loan_days' => 1, 'daily_fine_cents' => 125]);
        $this->travelTo(CarbonImmutable::parse('2026-11-23T18:00:00Z'));
        $service = app(LedgerService::class);
        $service->assessLoan($loan->id);
        $charge = FinancialEntry::sole();
        $service->reverse($admin, $charge->id, (string) Str::uuid(), 'Cargo anulado QA');
        $this->assertSame(0, $service->assessLoan($loan->id));
        $this->assertSame(0, $service->summary($loan->member)['balance_cents']);
        $this->assertDatabaseCount('financial_entries', 2);
    }
}
