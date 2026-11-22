<?php

namespace Tests\Feature;

use App\Models\Book;
use App\Models\LibraryPolicy;
use App\Models\User;
use App\Services\LibraryCalendar;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\TestWith;
use Tests\TestCase;

class LibraryFoundationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    public function test_calendar_uses_library_timezone_closures_and_open_day_grace(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-11-22T02:00:00Z'));
        $terms = [...LibraryPolicy::current()->terms(), 'closed_weekdays' => [0, 6], 'closure_dates' => ['2026-11-23'], 'grace_days' => 1];
        $calendar = new LibraryCalendar;
        $this->assertSame('2026-11-21', $calendar->today($terms)->toDateString());
        $this->assertSame('2026-11-24', $calendar->dueDate(CarbonImmutable::parse('2026-11-20T18:00:00Z'), 1, $terms));
        $this->assertSame(['2026-11-25', '2026-11-26'], $calendar->overdueDates('2026-11-20', '2026-11-26', $terms));
        $this->assertSame([], $calendar->overdueDates('2026-11-26', '2026-11-20', $terms));
    }

    #[TestWith(['978-0-306-40615-7', '9780306406157'])]
    #[TestWith(['0-8044-2957-X', '080442957X'])]
    public function test_bibliographic_metadata_is_normalized_and_preserved(string $isbn, string $normalized): void
    {
        $book = Book::factory()->create();
        $this->actingAs(User::factory()->create(['role' => 'librarian']))->put('/manage/books/'.$book->id, [
            ...$book->only(['title', 'author', 'publisher', 'publication_year', 'description', 'category', 'cover_color']),
            'isbn' => $isbn, 'edition' => 'Segunda', 'language' => 'Español',
        ])->assertSessionHasNoErrors();
        $this->assertDatabaseHas('books', ['id' => $book->id, 'isbn' => $normalized, 'edition' => 'Segunda']);
    }

    public function test_invalid_isbn_is_rejected_without_changing_title(): void
    {
        $book = Book::factory()->create();
        $this->actingAs(User::factory()->create(['role' => 'librarian']))->put('/manage/books/'.$book->id, [
            ...$book->only(['title', 'author', 'publisher', 'publication_year', 'description', 'category', 'cover_color']), 'isbn' => '9780306406158',
        ])->assertSessionHasErrors(['isbn' => 'Escribe un ISBN-10 o ISBN-13 con dígito de control válido.']);
        $this->assertNull($book->fresh()->isbn);
    }

    public function test_additive_migration_roundtrip_does_not_replace_existing_records(): void
    {
        $book = Book::factory()->create(['title' => 'Título conservado']);
        $user = User::factory()->create();
        $migration = require database_path('migrations/2026_11_22_022905_extend_bibliography_and_create_inventory.php');
        $migration->down();
        $this->assertDatabaseHas('books', ['id' => $book->id, 'title' => 'Título conservado']);
        $this->assertDatabaseHas('users', ['id' => $user->id]);
        $migration->up();
        $this->assertSame('Español', $book->fresh()->language);
        $this->assertSame(0, $book->copies()->count());
    }
}
