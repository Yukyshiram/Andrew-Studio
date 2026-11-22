<?php

namespace Tests\Feature;

use App\Models\Acquisition;
use App\Models\AuditEvent;
use App\Models\Book;
use App\Models\BookCopy;
use App\Models\LibraryPolicy;
use App\Models\User;
use App\Services\AcquisitionService;
use Carbon\CarbonImmutable;
use Closure;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use PHPUnit\Framework\Attributes\TestWith;
use Tests\TestCase;

class AcquisitionTest extends TestCase
{
    use RefreshDatabase;

    private function payload(int $bookId): array
    {
        return ['book_id' => $bookId, 'status' => 'announced', 'publication_on' => '2026-12-01', 'expected_on' => '2027-01-05',
            'incorporated_on' => null, 'is_fictional' => true, 'public_note' => 'Fechas ficticias QA.', 'source_url' => null, 'operation_key' => (string) Str::uuid()];
    }

    private function invalid(Closure $operation, string $field): void
    {
        try {
            $operation();
            $this->fail('La incorporación debía rechazarse.');
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey($field, $exception->errors());
        }
    }

    public function test_publication_estimate_and_arrival_are_independent_and_do_not_create_stock(): void
    {
        $book = Book::factory()->create(['publication_year' => 'X / 1984']);
        $staff = User::factory()->create(['role' => 'librarian']);
        $data = $this->payload($book->id);
        $record = app(AcquisitionService::class)->save($staff, $data);
        $this->assertSame('2026-12-01', $record->publication_on->toDateString());
        $this->assertSame('2027-01-05', $record->expected_on->toDateString());
        $this->assertNull($record->incorporated_on);
        $this->assertTrue($record->is_fictional);
        $this->assertSame('X / 1984', $book->fresh()->publication_year);
        $this->assertDatabaseCount('book_copies', 0);
        $this->assertDatabaseHas('audit_events', ['action' => 'acquisition.created', 'subject_id' => $record->id, 'user_id' => $staff->id]);
        $this->assertArrayNotHasKey('operation_key', $record->toArray());
        $this->assertArrayNotHasKey('creation_fingerprint', $record->toArray());
    }

    public function test_repeated_create_is_bound_to_actor_and_intent_even_after_editing(): void
    {
        $book = Book::factory()->create();
        $staff = User::factory()->create(['role' => 'admin']);
        $data = $this->payload($book->id);
        $service = app(AcquisitionService::class);
        $record = $service->save($staff, $data);
        $again = $service->save($staff, [...$data, 'operation_key' => strtoupper($data['operation_key'])]);
        $this->assertSame($record->id, $again->id);
        $edit = array_diff_key($data, ['book_id' => true, 'operation_key' => true]);
        $service->save($staff, [...$edit, 'status' => 'ordered', 'version' => 1], $record->id);
        $this->assertSame('ordered', $service->save($staff, $data)->status);
        $this->assertDatabaseCount('acquisitions', 1);
        $this->assertSame(1, AuditEvent::where('action', 'acquisition.created')->count());
        $this->invalid(fn () => $service->save($staff, [...$data, 'public_note' => 'Otra intención']), 'operation_key');
        $this->invalid(fn () => $service->save(User::factory()->create(['role' => 'admin']), $data), 'operation_key');
    }

    public function test_updates_are_audited_and_stale_forms_cannot_overwrite_dates(): void
    {
        $staff = User::factory()->create(['role' => 'librarian']);
        $record = Acquisition::factory()->create();
        $data = [...$record->only(Acquisition::FIELDS), 'version' => 1, 'expected_on' => '2027-02-01', 'status' => 'in_transit'];
        app(AcquisitionService::class)->save($staff, $data, $record->id);
        $this->invalid(fn () => app(AcquisitionService::class)->save($staff, [...$data, 'expected_on' => '2028-01-01'], $record->id), 'version');
        $this->assertSame('2027-02-01', $record->fresh()->expected_on->toDateString());
        $event = AuditEvent::where('action', 'acquisition.updated')->sole();
        $this->assertSame($staff->id, $event->user_id);
        $this->assertSame('announced', $event->metadata['before']['status']);
        $this->assertSame('in_transit', $event->metadata['after']['status']);
        $this->assertSame(2, $record->fresh()->version);
    }

    public function test_arrival_requires_inventory_and_uses_library_civil_date(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-11-22T02:00:00Z'));
        LibraryPolicy::current()->update(['timezone' => 'America/Mexico_City']);
        $book = Book::factory()->create();
        $staff = User::factory()->create(['role' => 'librarian']);
        $data = [...$this->payload($book->id), 'status' => 'incorporated', 'incorporated_on' => '2026-11-21'];
        $service = app(AcquisitionService::class);
        $this->invalid(fn () => $service->save($staff, $data), 'status');
        $this->assertDatabaseCount('acquisitions', 0);
        BookCopy::factory()->create(['book_id' => $book->id, 'status' => 'withdrawn']);
        $this->invalid(fn () => $service->save($staff, $data), 'status');
        BookCopy::factory()->create(['book_id' => $book->id]);
        $this->invalid(fn () => $service->save($staff, [...$data, 'incorporated_on' => '2026-11-22']), 'incorporated_on');
        $this->invalid(fn () => $service->save($staff, [...$data, 'incorporated_on' => null]), 'incorporated_on');
        $record = $service->save($staff, $data);
        $this->assertSame('2026-11-21', $record->incorporated_on->toDateString());
        $this->assertSame(2, $book->copies()->count());
    }

    #[TestWith(['announced'])]
    #[TestWith(['ordered'])]
    #[TestWith(['in_transit'])]
    #[TestWith(['cancelled'])]
    public function test_an_estimate_cannot_be_presented_as_an_actual_arrival(string $status): void
    {
        $data = [...$this->payload(Book::factory()->create()->id), 'status' => $status, 'incorporated_on' => '2026-01-01'];
        $this->invalid(fn () => app(AcquisitionService::class)->save(User::factory()->create(['role' => 'librarian']), $data), 'incorporated_on');
        $this->assertDatabaseCount('acquisitions', 0);
    }

    #[TestWith(['javascript:alert(1)'])]
    #[TestWith(['http://example.test/source'])]
    #[TestWith(['https://user:password@example.test/source'])]
    public function test_sources_reject_unsafe_schemes_and_credentials(string $source): void
    {
        $data = [...$this->payload(Book::factory()->create()->id), 'source_url' => $source];
        $this->invalid(fn () => app(AcquisitionService::class)->save(User::factory()->create(['role' => 'admin']), $data), 'source_url');
    }

    public function test_closed_batches_cannot_be_reopened_and_book_cannot_be_reassigned(): void
    {
        $record = Acquisition::factory()->create(['status' => 'cancelled']);
        $staff = User::factory()->create(['role' => 'librarian']);
        $data = [...$record->only(Acquisition::FIELDS), 'version' => 1];
        $this->invalid(fn () => app(AcquisitionService::class)->save($staff, [...$data, 'status' => 'ordered'], $record->id), 'status');
        $this->invalid(fn () => app(AcquisitionService::class)->save($staff, [...$data, 'book_id' => Book::factory()->create()->id], $record->id), 'book_id');
        $this->assertSame('cancelled', $record->fresh()->status);
    }

    public function test_service_rechecks_current_staff_permissions(): void
    {
        $staff = User::factory()->create(['role' => 'librarian']);
        User::whereKey($staff->id)->update(['role' => 'reader']);
        $data = $this->payload(Book::factory()->create()->id);
        $this->expectException(AuthorizationException::class);
        app(AcquisitionService::class)->save($staff, $data);
    }

    public function test_an_archived_title_cannot_receive_a_new_acquisition(): void
    {
        $book = Book::factory()->create();
        $book->delete();
        $this->expectException(ModelNotFoundException::class);
        app(AcquisitionService::class)->save(User::factory()->create(['role' => 'admin']), $this->payload($book->id));
    }

    public function test_catalogue_archiving_cannot_hide_pending_acquisitions(): void
    {
        $this->withoutVite();
        $admin = User::factory()->create(['role' => 'admin', 'password' => 'Clave-Ficticia2026!']);
        $record = Acquisition::factory()->create();
        $this->actingAs($admin)->delete('/manage/books/'.$record->book_id)->assertSessionHasErrors('book');
        $this->post('/manage/books/archive-all', ['password' => 'Clave-Ficticia2026!', 'confirmation' => 'ARCHIVAR CATÁLOGO'])->assertSessionHasErrors('confirmation');
        $this->assertNull($record->book->fresh()->deleted_at);
        app(AcquisitionService::class)->save($admin, [...$record->only(Acquisition::FIELDS), 'status' => 'cancelled', 'version' => 1], $record->id);
        $this->delete('/manage/books/'.$record->book_id)->assertSessionHasNoErrors();
        $this->assertNotNull($record->book->fresh()->deleted_at);
        $this->assertDatabaseHas('acquisitions', ['id' => $record->id, 'status' => 'cancelled']);
    }

    public function test_dates_are_validated_and_source_text_is_preserved_without_rendering_html(): void
    {
        $staff = User::factory()->create(['role' => 'admin']);
        $data = $this->payload(Book::factory()->create()->id);
        $this->invalid(fn () => app(AcquisitionService::class)->save($staff, [...$data, 'publication_on' => '2026-02-30']), 'publication_on');
        $record = app(AcquisitionService::class)->save($staff, [...$data, 'source_url' => 'https://example.test/source', 'public_note' => '<script>dato ficticio</script>']);
        $this->assertSame('<script>dato ficticio</script>', $record->public_note);
        $this->assertSame('https://example.test/source', $record->source_url);
    }
}
