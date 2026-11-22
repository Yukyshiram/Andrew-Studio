<?php

namespace Tests\Feature;

use App\Models\Book;
use App\Models\BookCopy;
use App\Models\CirculationRequest;
use App\Models\Member;
use App\Models\User;
use App\Services\CirculationService;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class CirculationIntegrityTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    public function test_a_title_cannot_be_archived_until_requests_and_loans_are_closed(): void
    {
        $reader = User::factory()->create();
        Member::enroll($reader);
        $staff = User::factory()->create(['role' => 'librarian']);
        $copy = BookCopy::factory()->create();
        $service = app(CirculationService::class);
        $request = $service->requestBook($reader, $copy->book_id);
        $this->actingAs($staff)->delete('/manage/books/'.$copy->book_id)->assertSessionHasErrors('book');
        $this->assertFalse(Book::findOrFail($copy->book_id)->trashed());
        $service->prepare($staff, $request->id);
        $loan = $service->issue($staff, $request->id);
        $this->delete('/manage/books/'.$copy->book_id)->assertSessionHasErrors('book');
        $service->receive($staff, $loan->id, 'good');
        $this->delete('/manage/books/'.$copy->book_id)->assertSessionHasNoErrors();
        $this->assertSoftDeleted('books', ['id' => $copy->book_id]);
        $this->actingAs($reader)->get('/my-library?view=history')->assertInertia(fn (Assert $page) => $page->has('loans.data', 1)->where('loans.data.0.copy.book.id', $copy->book_id));
    }

    public function test_mass_archive_refuses_atomically_but_an_unrelated_title_can_be_archived(): void
    {
        $reader = User::factory()->create();
        Member::enroll($reader);
        $admin = User::factory()->create(['role' => 'admin', 'password' => 'Prueba-Segura2026!']);
        $book = Book::factory()->create();
        $other = Book::factory()->create();
        app(CirculationService::class)->requestBook($reader, $book->id);
        $this->actingAs($admin)->post('/manage/books/archive-all', ['password' => 'Prueba-Segura2026!', 'confirmation' => 'ARCHIVAR CATÁLOGO'])->assertSessionHasErrors('confirmation');
        $this->assertSame(2, Book::count());
        $this->delete('/manage/books/'.$other->id)->assertSessionHasNoErrors();
        $this->assertSame(1, Book::count());
    }

    public function test_a_cached_staff_identity_cannot_be_reused_after_demotion(): void
    {
        $reader = User::factory()->create();
        Member::enroll($reader);
        $staff = User::factory()->create(['role' => 'librarian']);
        $copy = BookCopy::factory()->create();
        $service = app(CirculationService::class);
        $request = $service->requestBook($reader, $copy->book_id);
        User::whereKey($staff->id)->update(['role' => 'reader']);
        $this->assertSame('librarian', $staff->role);
        try {
            $service->prepare($staff, $request->id);
            $this->fail('La identidad almacenada no debe conservar privilegios revocados.');
        } catch (AuthorizationException) {
            $this->assertSame('pending', $request->fresh()->status);
            $this->assertDatabaseCount('copy_allocations', 0);
        }
    }

    public function test_deactivation_after_preparation_prevents_delivery_but_staff_can_cancel(): void
    {
        $reader = User::factory()->create();
        Member::enroll($reader);
        $staff = User::factory()->create(['role' => 'librarian']);
        $copy = BookCopy::factory()->create();
        $service = app(CirculationService::class);
        $request = $service->requestBook($reader, $copy->book_id);
        $service->prepare($staff, $request->id);
        $reader->delete();
        try {
            $service->issue($staff, $request->id);
            $this->fail('Una cuenta desactivada no puede recibir una nueva entrega.');
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey('circulation', $exception->errors());
            $this->assertDatabaseCount('loans', 0);
        }
        $service->cancel($staff, $request->id);
        $this->assertSame('available', $copy->fresh()->status);
        $this->assertSame('cancelled', CirculationRequest::findOrFail($request->id)->status);
    }
}
