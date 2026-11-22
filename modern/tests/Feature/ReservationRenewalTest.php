<?php

namespace Tests\Feature;

use App\Models\AuditEvent;
use App\Models\Book;
use App\Models\BookCopy;
use App\Models\CirculationRequest;
use App\Models\LibraryNotice;
use App\Models\LibraryPolicy;
use App\Models\Loan;
use App\Models\Member;
use App\Models\User;
use App\Services\CirculationService;
use Carbon\CarbonImmutable;
use Closure;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use PHPUnit\Framework\Attributes\TestWith;
use Tests\TestCase;

class ReservationRenewalTest extends TestCase
{
    use RefreshDatabase;

    private function reader(): User
    {
        $user = User::factory()->create();
        Member::enroll($user);

        return $user;
    }

    /** @return array{User, User, Loan} */
    private function loan(): array
    {
        $reader = $this->reader();
        $staff = User::factory()->create(['role' => 'librarian']);
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
            $this->fail('La operación debía rechazarse.');
        } catch (ValidationException $exception) {
            $this->assertSame($message, $exception->errors()['circulation'][0]);
        }
    }

    public function test_pickup_expires_after_local_midnight_and_releases_to_next_approved_reader_once(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-11-20T18:00:00Z'));
        $first = $this->reader();
        $second = $this->reader();
        $staff = User::factory()->create(['role' => 'librarian']);
        $copy = BookCopy::factory()->create();
        $service = app(CirculationService::class);
        $a = $service->requestBook($first, $copy->book_id);
        $b = $service->requestBook($second, $copy->book_id);
        $service->prepare($staff, $a->id);
        $service->prepare($staff, $b->id);
        $this->assertSame('2026-11-23', $a->fresh()->ready_until->toDateString());
        $this->travelTo(CarbonImmutable::parse('2026-11-24T05:59:59Z'));
        $this->assertSame(['expired' => 0, 'ready' => 0], $service->refreshReservations());
        $this->travelTo(CarbonImmutable::parse('2026-11-24T06:00:00Z'));
        $this->assertSame(['expired' => 1, 'ready' => 1], $service->refreshReservations());
        $this->assertSame('expired', $a->fresh()->status);
        $this->assertNull($a->fresh()->active_key);
        $this->assertNull($a->fresh()->allocation);
        $this->assertSame('ready', $b->fresh()->status);
        $this->assertSame($copy->id, $b->fresh()->allocation->copy_id);
        $this->assertSame('2026-11-27', $b->fresh()->ready_until->toDateString());
        $this->assertSame(['expired' => 0, 'ready' => 0], $service->refreshReservations());
        $this->assertSame(1, LibraryNotice::where('kind', 'request.expired')->count());
        $this->assertSame(2, LibraryNotice::where('kind', 'request.ready')->count());
        $this->assertDatabaseHas('audit_events', ['action' => 'request.expired', 'subject_id' => $a->id, 'user_id' => null]);
        $this->assertDatabaseCount('loans', 0);
    }

    public function test_fifo_uses_requested_time_and_id_not_approval_order_and_skips_ineligible_members(): void
    {
        $this->freezeTime();
        $staff = User::factory()->create(['role' => 'admin']);
        $book = Book::factory()->create();
        $service = app(CirculationService::class);
        $requests = [];
        for ($i = 0; $i < 3; $i++) {
            $requests[] = $service->requestBook($this->reader(), $book->id);
        }
        foreach (array_reverse($requests) as $request) {
            $service->prepare($staff, $request->id);
        }
        $this->assertSame([1, 2, 3], CirculationRequest::withQueuePosition()->orderBy('id')->get()->pluck('queue_position')->map(fn ($position) => (int) $position)->all());
        $requests[0]->member->update(['status' => 'suspended']);
        $copy = BookCopy::factory()->create(['book_id' => $book->id]);
        $this->assertSame(['expired' => 0, 'ready' => 1], $service->refreshReservations($staff));
        $this->assertSame('waiting', $requests[0]->fresh()->status);
        $this->assertSame('ready', $requests[1]->fresh()->status);
        $this->assertSame($copy->id, $requests[1]->fresh()->allocation->copy_id);
        $this->assertSame('waiting', $requests[2]->fresh()->status);
    }

    public function test_pending_requests_are_never_assigned_without_staff_validation(): void
    {
        $copy = BookCopy::factory()->create();
        $service = app(CirculationService::class);
        $request = $service->requestBook($this->reader(), $copy->book_id);
        $this->assertSame(['expired' => 0, 'ready' => 0], $service->refreshReservations());
        $this->assertSame('pending', $request->fresh()->status);
        $this->assertSame('available', $copy->fresh()->status);
        $this->assertDatabaseCount('library_notices', 0);
    }

    public function test_renewal_keeps_agreed_terms_advances_due_date_past_closure_and_works_at_loan_limit(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-11-20T18:00:00Z'));
        LibraryPolicy::current()->update(['max_loans' => 1, 'closure_dates' => ['2026-12-18']]);
        [$reader, $staff, $loan] = $this->loan();
        LibraryPolicy::current()->update(['loan_days' => 1, 'max_renewals' => 0, 'closure_dates' => []]);
        $renewal = app(CirculationService::class)->renew($reader, $loan->id, (string) Str::uuid());
        $this->assertSame('2026-12-04', $renewal->getRawOriginal('previous_due_on'));
        $this->assertSame('2026-12-19', $loan->fresh()->due_on->toDateString());
        $this->assertSame(1, $loan->fresh()->renewal_count);
        $this->assertSame('active', $loan->fresh()->status);
        $this->assertDatabaseHas('audit_events', ['action' => 'loan.renewed', 'subject_id' => $loan->id, 'user_id' => $reader->id]);
        $this->assertSame(1, LibraryNotice::where('kind', 'loan.renewed')->count());
        app(CirculationService::class)->renew($staff, $loan->id, (string) Str::uuid());
        $this->assertSame('2027-01-02', $loan->fresh()->due_on->toDateString());
        $this->invalid(fn () => app(CirculationService::class)->renew($reader, $loan->id, (string) Str::uuid()), 'Este préstamo alcanzó su límite de renovaciones.');
        $this->assertDatabaseCount('loan_renewals', 2);
    }

    public function test_duplicate_renewal_key_returns_original_record_even_after_return_without_extending_again(): void
    {
        [$reader, $staff, $loan] = $this->loan();
        $service = app(CirculationService::class);
        $key = (string) Str::uuid();
        $renewal = $service->renew($reader, $loan->id, $key);
        $this->assertSame($renewal->id, $service->renew($reader, $loan->id, $key)->id);
        $this->assertSame($renewal->id, $service->renew($reader, $loan->id, strtoupper($key))->id);
        $service->receive($staff, $loan->id, 'good');
        $this->assertSame($renewal->id, $service->renew($reader, $loan->id, $key)->id);
        $this->assertSame(1, $loan->fresh()->renewal_count);
        $this->assertDatabaseCount('loan_renewals', 1);
        $this->assertSame(1, AuditEvent::where('action', 'loan.renewed')->count());
        $this->assertSame(1, LibraryNotice::where('kind', 'loan.renewed')->count());
        $this->invalid(fn () => $service->renew($reader, $loan->id, (string) Str::uuid()), 'Solo se puede renovar un préstamo activo.');
    }

    public function test_renewal_key_cannot_be_reused_by_different_actor_or_for_another_loan(): void
    {
        [$reader, $staff, $loan] = $this->loan();
        [, , $otherLoan] = $this->loan();
        $service = app(CirculationService::class);
        $key = (string) Str::uuid();
        $service->renew($reader, $loan->id, $key);
        $message = 'Esta operación ya se utilizó. Abre de nuevo la confirmación.';
        $this->invalid(fn () => $service->renew($staff, $loan->id, $key), $message);
        $this->invalid(fn () => $service->renew($staff, $otherLoan->id, $key), $message);
        $this->assertSame(0, $otherLoan->fresh()->renewal_count);
    }

    #[TestWith(['pending'])]
    #[TestWith(['waiting'])]
    public function test_another_members_open_request_prevents_renewal(string $status): void
    {
        [$reader, $staff, $loan] = $this->loan();
        $service = app(CirculationService::class);
        $request = $service->requestBook($this->reader(), $loan->copy->book_id);
        if ($status === 'waiting') {
            $service->prepare($staff, $request->id);
        }
        $this->invalid(fn () => $service->renew($reader, $loan->id, (string) Str::uuid()), 'Otra persona espera este título. Devuelve el ejemplar para respetar la reserva.');
        $this->assertDatabaseCount('loan_renewals', 0);
        $service->cancel($staff, $request->id);
        $service->renew($reader, $loan->id, (string) Str::uuid());
        $this->assertSame(1, $loan->fresh()->renewal_count);
    }

    #[TestWith(['suspended'])]
    #[TestWith(['expired'])]
    #[TestWith(['deactivated'])]
    public function test_membership_is_rechecked_when_renewing(string $state): void
    {
        [$reader, $staff, $loan] = $this->loan();
        match ($state) {
            'suspended' => $loan->member->update(['status' => 'suspended']),
            'expired' => $loan->member->update(['expires_on' => '2000-01-01']),
            'deactivated' => $reader->delete(),
        };
        $this->invalid(fn () => app(CirculationService::class)->renew($staff, $loan->id, (string) Str::uuid()), 'La membresía está suspendida, vencida o desactivada. Consulta al personal.');
        $this->assertDatabaseCount('loan_renewals', 0);
    }

    public function test_overdue_policy_blocks_renewal_and_disabled_rule_uses_today_as_base(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-11-20T18:00:00Z'));
        [$reader, , $loan] = $this->loan();
        $this->travelTo(CarbonImmutable::parse('2026-12-07T18:00:00Z'));
        $service = app(CirculationService::class);
        $this->invalid(fn () => $service->renew($reader, $loan->id, (string) Str::uuid()), 'Hay préstamos vencidos. Devuélvelos antes de solicitar o renovar.');
        LibraryPolicy::current()->update(['block_overdue' => false]);
        $service->renew($reader, $loan->id, (string) Str::uuid());
        $this->assertSame('2026-12-21', $loan->fresh()->due_on->toDateString());
    }

    public function test_refresh_command_is_repeatable_and_does_not_invent_a_staff_actor(): void
    {
        $this->artisan('library:refresh-reservations')->expectsOutput('Recogidas vencidas: 0. Nuevas asignaciones: 0.')->assertSuccessful();
        $this->artisan('library:refresh-reservations')->assertSuccessful();
        $this->assertDatabaseCount('audit_events', 0);
    }
}
