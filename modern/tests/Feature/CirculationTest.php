<?php

namespace Tests\Feature;

use App\Models\AuditEvent;
use App\Models\Book;
use App\Models\BookCopy;
use App\Models\CopyAllocation;
use App\Models\LibraryPolicy;
use App\Models\Loan;
use App\Models\Member;
use App\Models\User;
use App\Services\CirculationService;
use Carbon\CarbonImmutable;
use Closure;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use PHPUnit\Framework\Attributes\TestWith;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

class CirculationTest extends TestCase
{
    use RefreshDatabase;

    private function reader(): User
    {
        $reader = User::factory()->create();
        Member::enroll($reader);

        return $reader;
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

    public function test_request_preparation_handover_and_return_are_separate_audited_operations(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-11-20T18:00:00Z'));
        $reader = $this->reader();
        $staff = User::factory()->create(['role' => 'librarian']);
        $copy = BookCopy::factory()->create();
        $service = app(CirculationService::class);
        $request = $service->requestBook($reader, $copy->book_id);
        $this->assertSame('pending', $request->status);
        $this->assertSame('available', $copy->fresh()->status);
        $this->assertDatabaseCount('loans', 0);
        $service->prepare($staff, $request->id);
        $this->assertSame('ready', $request->fresh()->status);
        $this->assertSame('held', $copy->fresh()->status);
        $this->assertDatabaseCount('loans', 0);
        $loan = $service->issue($staff, $request->id);
        $this->assertSame('active', $loan->status);
        $this->assertSame('2026-12-04', $loan->due_on->toDateString());
        $this->assertSame('fulfilled', $request->fresh()->status);
        $this->assertSame('loaned', $copy->fresh()->status);
        $this->assertDatabaseHas('audit_events', ['action' => 'loan.issued', 'subject_id' => $loan->id, 'user_id' => $staff->id]);
        $service->receive($staff, $loan->id, 'good');
        $this->assertSame('returned', $loan->fresh()->status);
        $this->assertNull($loan->fresh()->active_copy_id);
        $this->assertNotNull($loan->fresh()->returned_at);
        $this->assertSame('available', $copy->fresh()->status);
        $this->assertDatabaseCount('copy_allocations', 0);
    }

    public function test_duplicate_requests_delivery_and_returns_do_not_repeat_operations(): void
    {
        $reader = $this->reader();
        $staff = User::factory()->create(['role' => 'admin']);
        $copy = BookCopy::factory()->create();
        $service = app(CirculationService::class);
        $request = $service->requestBook($reader, $copy->book_id);
        $this->assertSame($request->id, $service->requestBook($reader, $copy->book_id)->id);
        $service->prepare($staff, $request->id);
        $service->prepare($staff, $request->id);
        $loan = $service->issue($staff, $request->id);
        $this->assertSame($loan->id, $service->issue($staff, $request->id)->id);
        $service->receive($staff, $loan->id, 'good');
        $service->receive($staff, $loan->id, 'good');
        $this->assertDatabaseCount('circulation_requests', 1);
        $this->assertDatabaseCount('loans', 1);
        $this->assertSame(1, AuditEvent::where('action', 'loan.issued')->count());
        $this->assertSame(1, AuditEvent::where('action', 'loan.returned')->count());
        $this->invalid(fn () => $service->receive($staff, $loan->id, 'lost'), 'El préstamo ya está cerrado; no se puede cambiar su devolución.');
    }

    public function test_a_copy_cannot_be_delivered_to_two_members_and_return_assigns_waiting_member(): void
    {
        $first = $this->reader();
        $second = $this->reader();
        $staff = User::factory()->create(['role' => 'librarian']);
        $copy = BookCopy::factory()->create();
        $service = app(CirculationService::class);
        $a = $service->requestBook($first, $copy->book_id);
        $b = $service->requestBook($second, $copy->book_id);
        $service->prepare($staff, $a->id);
        $service->prepare($staff, $b->id);
        $this->assertSame('waiting', $b->fresh()->status);
        $loan = $service->issue($staff, $a->id);
        $this->invalid(fn () => $service->issue($staff, $b->id), 'Primero valida la solicitud y prepara un ejemplar.');
        $this->assertDatabaseCount('loans', 1);
        $service->receive($staff, $loan->id, 'good');
        $this->assertSame('ready', $b->fresh()->status);
        $this->assertSame($copy->id, CopyAllocation::where('circulation_request_id', $b->id)->sole()->copy_id);
        $secondLoan = $service->issue($staff, $b->id);
        $this->assertNotSame($loan->id, $secondLoan->id);
        $this->assertSame(1, Loan::where('status', 'active')->count());
    }

    public function test_cancelling_a_ready_request_releases_the_copy_for_the_next_reservation(): void
    {
        $reader = $this->reader();
        $next = $this->reader();
        $staff = User::factory()->create(['role' => 'librarian']);
        $copy = BookCopy::factory()->create();
        $service = app(CirculationService::class);
        $a = $service->requestBook($reader, $copy->book_id);
        $b = $service->requestBook($next, $copy->book_id);
        $service->prepare($staff, $a->id);
        $service->prepare($staff, $b->id);
        $service->cancel($reader, $a->id);
        $this->assertSame('cancelled', $a->fresh()->status);
        $this->assertNull($a->fresh()->active_key);
        $this->assertSame('ready', $b->fresh()->status);
    }

    public function test_a_reader_cannot_cancel_another_members_request(): void
    {
        $reader = $this->reader();
        $other = $this->reader();
        $book = Book::factory()->create();
        $service = app(CirculationService::class);
        $request = $service->requestBook($reader, $book->id);
        try {
            $service->cancel($other, $request->id);
            $this->fail('Debe ocultarse la solicitud ajena.');
        } catch (HttpException $exception) {
            $this->assertSame(404, $exception->getStatusCode());
        }
        $this->assertSame('pending', $request->fresh()->status);
    }

    public function test_reader_cannot_prepare_a_request_even_when_calling_the_service_directly(): void
    {
        $reader = $this->reader();
        $request = app(CirculationService::class)->requestBook($reader, Book::factory()->create()->id);
        $this->expectException(AuthorizationException::class);
        app(CirculationService::class)->prepare($reader, $request->id);
    }

    #[TestWith(['status', 'suspended'])]
    #[TestWith(['expires_on', '2026-11-19'])]
    public function test_suspended_or_expired_members_cannot_request(string $field, string $value): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-11-20T18:00:00Z'));
        $reader = $this->reader();
        $reader->member()->update([$field => $value]);
        $book = Book::factory()->create();
        $this->invalid(fn () => app(CirculationService::class)->requestBook($reader, $book->id), 'La membresía está suspendida, vencida o desactivada. Consulta al personal.');
        $this->assertDatabaseCount('circulation_requests', 0);
    }

    public function test_request_limits_include_pending_requests_and_zero_individual_limit(): void
    {
        $reader = $this->reader();
        $reader->member()->update(['loan_limit' => 1]);
        $service = app(CirculationService::class);
        $service->requestBook($reader, Book::factory()->create()->id);
        $book = Book::factory()->create();
        $this->invalid(fn () => $service->requestBook($reader, $book->id), 'Alcanzaste el límite de préstamos y solicitudes permitido.');
        $reader->member()->update(['loan_limit' => 0]);
        $this->invalid(fn () => $service->requestBook($reader, $book->id), 'Alcanzaste el límite de préstamos y solicitudes permitido.');
        $this->assertDatabaseCount('circulation_requests', 1);
    }

    public function test_handover_rechecks_membership_and_existing_loans_keep_their_terms(): void
    {
        $reader = $this->reader();
        $staff = User::factory()->create(['role' => 'admin']);
        $copy = BookCopy::factory()->create();
        $service = app(CirculationService::class);
        $request = $service->requestBook($reader, $copy->book_id);
        $service->prepare($staff, $request->id);
        $reader->member()->update(['status' => 'suspended']);
        $this->invalid(fn () => $service->issue($staff, $request->id), 'La membresía está suspendida, vencida o desactivada. Consulta al personal.');
        $this->assertDatabaseCount('loans', 0);
        $reader->member()->update(['status' => 'active']);
        $loan = $service->issue($staff, $request->id);
        LibraryPolicy::current()->update(['loan_days' => 30, 'daily_fine_cents' => 500]);
        $this->assertSame(14, $loan->fresh()->terms['loan_days']);
        $this->assertSame(0, $loan->fresh()->terms['daily_fine_cents']);
    }

    #[TestWith(['damaged', 'repair', 'returned'])]
    #[TestWith(['lost', 'lost', 'lost'])]
    #[TestWith(['worn', 'available', 'returned'])]
    public function test_returns_preserve_physical_condition_and_unavailable_copies(string $condition, string $copyStatus, string $loanStatus): void
    {
        $reader = $this->reader();
        $staff = User::factory()->create(['role' => 'librarian']);
        $copy = BookCopy::factory()->create();
        $service = app(CirculationService::class);
        $request = $service->requestBook($reader, $copy->book_id);
        $service->prepare($staff, $request->id);
        $loan = $service->issue($staff, $request->id);
        $service->receive($staff, $loan->id, $condition);
        $this->assertSame($copyStatus, $copy->fresh()->status);
        $this->assertSame($condition, $copy->fresh()->condition);
        $this->assertSame($loanStatus, $loan->fresh()->status);
        $this->assertSame($staff->id, $loan->fresh()->received_by);
    }

    public function test_rejection_requires_a_reason_and_does_not_create_a_loan(): void
    {
        $reader = $this->reader();
        $staff = User::factory()->create(['role' => 'librarian']);
        $copy = BookCopy::factory()->create();
        $service = app(CirculationService::class);
        $request = $service->requestBook($reader, $copy->book_id);
        $this->invalid(fn () => $service->reject($staff, $request->id, ''), 'Escribe un motivo de rechazo de hasta 500 caracteres.');
        $service->reject($staff, $request->id, 'Ejemplar en revisión física.');
        $this->assertSame('rejected', $request->fresh()->status);
        $this->assertSame('Ejemplar en revisión física.', $request->fresh()->decision_reason);
        $this->assertDatabaseCount('loans', 0);
        $this->assertSame('available', $copy->fresh()->status);
    }
}
