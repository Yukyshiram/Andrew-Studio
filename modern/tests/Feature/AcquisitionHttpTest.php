<?php

namespace Tests\Feature;

use App\Models\Acquisition;
use App\Models\Book;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use PHPUnit\Framework\Attributes\TestWith;
use Tests\TestCase;

class AcquisitionHttpTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    private function payload(int $bookId): array
    {
        return ['book_id' => $bookId, 'status' => 'announced', 'publication_on' => '2027-02-03', 'expected_on' => '2027-03-04',
            'incorporated_on' => null, 'is_fictional' => true, 'source_url' => 'https://example.test/source', 'public_note' => 'Datos ficticios QA.', 'operation_key' => (string) Str::uuid()];
    }

    public function test_visitors_can_read_news_but_need_a_session_for_management(): void
    {
        $this->get('/news')->assertOk()->assertInertia(fn (Assert $page) => $page->component('news/index')->where('acquisitions.total', 0));
        $this->get('/manage/acquisitions')->assertRedirect('/login');
        $this->post('/manage/acquisitions', [])->assertRedirect('/login');
        $this->put('/manage/acquisitions/1', [])->assertRedirect('/login');
    }

    public function test_a_reader_cannot_list_create_or_modify_acquisitions(): void
    {
        $record = Acquisition::factory()->create();
        $this->actingAs(User::factory()->create())->get('/manage/acquisitions')->assertForbidden();
        $this->post('/manage/acquisitions', $this->payload($record->book_id))->assertForbidden();
        $this->put('/manage/acquisitions/'.$record->id, ['status' => 'cancelled', 'is_fictional' => true, 'version' => 1])->assertForbidden();
        $this->assertSame('announced', $record->fresh()->status);
    }

    #[TestWith(['librarian'])]
    #[TestWith(['admin'])]
    public function test_staff_can_register_and_update_audited_acquisitions(string $role): void
    {
        $staff = User::factory()->create(['role' => $role]);
        $book = Book::factory()->create();
        $payload = $this->payload($book->id);
        $this->actingAs($staff)->from('/manage/acquisitions')->post('/manage/acquisitions', $payload)->assertRedirect('/manage/acquisitions')->assertSessionHasNoErrors();
        $this->post('/manage/acquisitions', $payload)->assertSessionHasNoErrors();
        $record = Acquisition::sole();
        $this->assertSame($staff->id, $record->created_by);
        $this->get('/manage/acquisitions')->assertInertia(fn (Assert $page) => $page->component('acquisitions/index')->where('acquisitions.total', 1)->where('acquisitions.data.0.version', 1));
        unset($payload['book_id'], $payload['operation_key']);
        $payload['version'] = 1;
        $payload['status'] = 'ordered';
        $this->put('/manage/acquisitions/'.$record->id, $payload)->assertSessionHasNoErrors();
        $this->put('/manage/acquisitions/'.$record->id, [...$payload, 'status' => 'cancelled'])->assertSessionHasErrors('version');
        $this->assertSame('ordered', $record->fresh()->status);
        $this->assertDatabaseHas('audit_events', ['user_id' => $staff->id, 'action' => 'acquisition.updated', 'subject_id' => $record->id]);
    }

    public function test_public_listing_excludes_cancelled_archived_titles_and_private_metadata(): void
    {
        $public = Acquisition::factory()->create(['public_note' => '<script>texto de prueba</script>']);
        Acquisition::factory()->create(['status' => 'cancelled']);
        $archived = Acquisition::factory()->create();
        $archived->book->delete();
        $this->get('/news')->assertInertia(fn (Assert $page) => $page->component('news/index')
            ->where('acquisitions.total', 1)->where('acquisitions.data.0.id', $public->id)
            ->where('acquisitions.data.0.is_fictional', true)->where('acquisitions.data.0.public_note', '<script>texto de prueba</script>')
            ->missing('acquisitions.data.0.created_by')->missing('acquisitions.data.0.operation_key')
            ->missing('acquisitions.data.0.creation_fingerprint')->missing('acquisitions.data.0.book.import_batch_id'));
        $this->actingAs(User::factory()->create(['role' => 'librarian']))->get('/manage/acquisitions')->assertInertia(fn (Assert $page) => $page->where('acquisitions.total', 3));
    }

    public function test_filters_use_the_selected_date_and_inclusive_bounds_with_category_and_literal_search(): void
    {
        $book = Book::factory()->create(['title' => 'Novedad 100% sintética', 'category' => 'Ciencia']);
        $target = Acquisition::factory()->create(['book_id' => $book->id, 'publication_on' => '2027-02-03', 'expected_on' => '2027-03-04']);
        Acquisition::factory()->create(['publication_on' => '2027-02-03', 'expected_on' => '2027-03-04']);
        $base = '/news?q=100%25&category=Ciencia&from=2027-02-03&to=2027-02-03&date_field=';
        $this->get($base.'publication_on')->assertInertia(fn (Assert $page) => $page->where('acquisitions.total', 1)->where('acquisitions.data.0.id', $target->id));
        $this->get($base.'expected_on')->assertInertia(fn (Assert $page) => $page->where('acquisitions.total', 0));
        $this->get('/news?category=Arte')->assertInertia(fn (Assert $page) => $page->where('filters.category', 'Arte'));
    }

    public function test_public_and_management_lists_are_paginated_and_keep_filters(): void
    {
        $book = Book::factory()->create(['category' => 'Filosofía']);
        Acquisition::factory()->count(13)->create(['book_id' => $book->id]);
        $this->get('/news?category=Filosofía&page=2')->assertInertia(fn (Assert $page) => $page->where('acquisitions.total', 13)->has('acquisitions.data', 1)->where('acquisitions.current_page', 2));
        $this->actingAs(User::factory()->create(['role' => 'librarian']))->get('/manage/acquisitions?status=announced&page=2')->assertInertia(fn (Assert $page) => $page->where('acquisitions.total', 13)->has('acquisitions.data', 1)->where('filters.status', 'announced'));
    }

    #[TestWith(['date_field', 'created_at; DROP TABLE books'])]
    #[TestWith(['status', 'cancelled'])]
    #[TestWith(['category', 'NoExiste'])]
    #[TestWith(['from', '2026-02-30'])]
    public function test_invalid_public_filters_are_rejected(string $field, string $value): void
    {
        $this->get('/news?'.http_build_query([$field => $value]))->assertSessionHasErrors($field);
        $this->assertDatabaseCount('acquisitions', 0);
    }

    public function test_reversed_date_period_is_rejected(): void
    {
        $this->get('/news?from=2027-02-01&to=2027-01-01')->assertSessionHasErrors('to');
    }

    public function test_server_fields_and_book_reassignment_are_prohibited(): void
    {
        $record = Acquisition::factory()->create();
        $staff = User::factory()->create(['role' => 'librarian']);
        $this->actingAs($staff)->post('/manage/acquisitions', [...$this->payload($record->book_id), 'created_by' => 999])->assertSessionHasErrors('created_by');
        $this->put('/manage/acquisitions/'.$record->id, ['book_id' => 999, 'status' => 'ordered', 'is_fictional' => true, 'version' => 1])->assertSessionHasErrors('book_id');
        $this->delete('/manage/acquisitions/'.$record->id)->assertStatus(405);
        $this->assertDatabaseCount('acquisitions', 1);
    }
}
