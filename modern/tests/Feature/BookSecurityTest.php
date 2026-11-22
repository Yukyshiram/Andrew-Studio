<?php

namespace Tests\Feature;

use App\Models\Book;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class BookSecurityTest extends TestCase
{
    use RefreshDatabase;

    private const PASSWORD = 'LecturaSegura2026!';

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function bookFields(array $overrides = []): array
    {
        return array_merge([
            'title' => "Un libro d'Andrew ñ",
            'author' => "Autor O'Connor",
            'publisher' => 'Editorial de prueba',
            'publication_year' => 'X / edición 2026',
            'description' => 'Descripción con acentos y ñ.',
            'category' => 'Literatura',
            'cover_color' => 'olive',
        ], $overrides);
    }

    private function book(array $overrides = []): Book
    {
        return Book::factory()->create($this->bookFields($overrides));
    }

    /** @return array<string, array{string, bool, bool}> */
    public static function permissionRoles(): array
    {
        return [
            'lector' => ['reader', false, false],
            'bibliotecario' => ['librarian', true, false],
            'administrador' => ['admin', true, true],
        ];
    }

    #[DataProvider('permissionRoles')]
    public function test_book_policy_enforces_the_documented_role_matrix(string $role, bool $canManage, bool $canArchiveAll): void
    {
        $user = User::factory()->create(['role' => $role]);
        $book = $this->book();
        $gate = Gate::forUser($user);

        foreach (['viewAny', 'create'] as $ability) {
            $this->assertSame($canManage, $gate->allows($ability, Book::class), $role.' / '.$ability);
        }

        foreach (['update', 'delete'] as $ability) {
            $this->assertSame($canManage, $gate->allows($ability, $book), $role.' / '.$ability);
        }

        $this->assertFalse($gate->allows('restore', $book), $role.' / restore active');
        $this->assertSame($canArchiveAll, $gate->allows('archiveAll', Book::class), $role.' / archiveAll');

        $book->delete();

        $this->assertSame($canManage, $gate->allows('restore', $book), $role.' / restore archived');
        $this->assertFalse($gate->allows('update', $book), $role.' / update archived');
        $this->assertFalse($gate->allows('delete', $book), $role.' / delete archived');
    }

    public function test_catalog_and_detail_are_public_but_dashboard_requires_authentication(): void
    {
        $book = $this->book();

        $this->get('/catalog')->assertOk();
        $this->get('/catalog/'.$book->id)->assertOk();
        $this->get('/dashboard')->assertRedirect('/login');
    }

    public function test_guest_cannot_reach_management_or_write_books(): void
    {
        $book = $this->book();

        $this->get('/manage/books')->assertRedirect('/login');
        $this->get('/manage/books/create')->assertRedirect('/login');
        $this->post('/manage/books', $this->bookFields())->assertRedirect('/login');
        $this->put('/manage/books/'.$book->id, $this->bookFields(['title' => 'Cambio no autorizado']))->assertRedirect('/login');
        $this->delete('/manage/books/'.$book->id)->assertRedirect('/login');
        $this->post('/manage/books/'.$book->id.'/restore')->assertRedirect('/login');
        $this->post('/manage/books/archive-all', [
            'password' => self::PASSWORD,
            'confirmation' => 'ARCHIVAR CATÁLOGO',
        ])->assertRedirect('/login');

        $this->assertDatabaseCount('books', 1);
        $this->assertSame($this->bookFields()['title'], $book->fresh()->title);
        $this->assertFalse($book->fresh()->trashed());
    }

    public function test_reader_cannot_write_even_when_knowing_a_book_identifier(): void
    {
        $reader = User::factory()->create(['role' => 'reader']);
        $book = $this->book();
        $this->actingAs($reader);

        $this->get('/manage/books')->assertForbidden();
        $this->post('/manage/books', $this->bookFields())->assertForbidden();
        $this->put('/manage/books/'.$book->id, $this->bookFields(['title' => 'Cambio no autorizado']))->assertForbidden();
        $this->delete('/manage/books/'.$book->id)->assertForbidden();
        $this->post('/manage/books/'.$book->id.'/restore')->assertForbidden();
        $this->post('/manage/books/archive-all', [
            'password' => self::PASSWORD,
            'confirmation' => 'ARCHIVAR CATÁLOGO',
        ])->assertForbidden();

        $this->assertDatabaseCount('books', 1);
        $this->assertSame($this->bookFields()['title'], $book->fresh()->title);
        $this->assertFalse($book->fresh()->trashed());
    }

    public function test_librarian_can_create_and_update_a_book_preserving_textual_year(): void
    {
        $librarian = User::factory()->create(['role' => 'librarian']);

        $this->actingAs($librarian)->post('/manage/books', $this->bookFields())->assertRedirect()->assertSessionHasNoErrors();

        $book = Book::query()->sole();
        $this->assertSame("Un libro d'Andrew ñ", $book->title);
        $this->assertSame('X / edición 2026', $book->publication_year);
        $this->assertSame("Autor O'Connor", $book->author);

        $this->put('/manage/books/'.$book->id, $this->bookFields([
            'title' => 'Título corregido',
            'publication_year' => 'Sin fecha',
        ]))->assertRedirect()->assertSessionHasNoErrors();

        $this->assertSame('Título corregido', $book->fresh()->title);
        $this->assertSame('Sin fecha', $book->fresh()->publication_year);
    }

    public function test_archiving_is_reversible_and_hides_book_from_public_catalog(): void
    {
        $librarian = User::factory()->create(['role' => 'librarian']);
        $book = $this->book();

        $this->actingAs($librarian)->delete('/manage/books/'.$book->id)->assertRedirect();

        $this->assertSoftDeleted('books', ['id' => $book->id]);
        $this->assertNull(Book::query()->find($book->id));
        $this->get('/catalog/'.$book->id)->assertNotFound();

        $this->post('/manage/books/'.$book->id.'/restore')->assertRedirect()->assertSessionHasNoErrors();

        $restored = Book::query()->findOrFail($book->id);
        $this->assertSame($book->title, $restored->title);
        $this->assertSame($book->publication_year, $restored->publication_year);
        $this->assertFalse($restored->trashed());
        $this->get('/catalog/'.$book->id)->assertOk();
    }

    public function test_librarian_cannot_archive_the_entire_catalog(): void
    {
        $librarian = User::factory()->create(['role' => 'librarian', 'password' => Hash::make(self::PASSWORD)]);
        $book = $this->book();

        $this->actingAs($librarian)->post('/manage/books/archive-all', [
            'password' => self::PASSWORD,
            'confirmation' => 'ARCHIVAR CATÁLOGO',
        ])->assertForbidden();

        $this->assertFalse($book->fresh()->trashed());
    }

    public function test_admin_mass_archive_requires_password_and_exact_confirmation(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'password' => Hash::make(self::PASSWORD)]);
        $one = $this->book(['title' => 'Primer libro']);
        $two = $this->book(['title' => 'Segundo libro']);
        $this->actingAs($admin);

        $this->post('/manage/books/archive-all', [
            'password' => 'Incorrecta2026!',
            'confirmation' => 'ARCHIVAR CATÁLOGO',
        ])->assertSessionHasErrors('password');
        $this->assertDatabaseCount('books', 2);
        $this->assertSame(2, Book::query()->count());

        $this->post('/manage/books/archive-all', [
            'password' => self::PASSWORD,
            'confirmation' => 'archivar catálogo',
        ])->assertSessionHasErrors('confirmation');
        $this->assertSame(2, Book::query()->count());

        $this->post('/manage/books/archive-all', [
            'password' => self::PASSWORD,
            'confirmation' => 'ARCHIVAR CATÁLOGO',
        ])->assertRedirect()->assertSessionHasNoErrors();

        $this->assertSame(0, Book::query()->count());
        $this->assertDatabaseCount('books', 2);
        $this->assertSoftDeleted('books', ['id' => $one->id]);
        $this->assertSoftDeleted('books', ['id' => $two->id]);
    }

    public function test_invalid_book_fields_do_not_create_records(): void
    {
        $librarian = User::factory()->create(['role' => 'librarian']);

        $this->actingAs($librarian)->post('/manage/books', $this->bookFields([
            'title' => '',
            'author' => '',
            'cover_color' => 'javascript:alert(1)',
        ]))->assertSessionHasErrors(['title', 'author', 'cover_color']);

        $this->assertDatabaseCount('books', 0);

        $this->post('/manage/books', $this->bookFields([
            'title' => ['unexpected' => 'array'],
        ]))->assertSessionHasErrors('title');

        $this->assertDatabaseCount('books', 0);

        $this->post('/manage/books', $this->bookFields([
            'title' => str_repeat('a', 256),
        ]))->assertSessionHasErrors('title');

        $this->assertDatabaseCount('books', 0);
    }

    public function test_invalid_update_preserves_original_values(): void
    {
        $librarian = User::factory()->create(['role' => 'librarian']);
        $book = $this->book();

        $this->actingAs($librarian)->put('/manage/books/'.$book->id, $this->bookFields([
            'title' => '',
        ]))->assertSessionHasErrors('title');

        $this->assertSame($this->bookFields()['title'], $book->fresh()->title);
    }

    public function test_unknown_book_identifier_returns_not_found(): void
    {
        $librarian = User::factory()->create(['role' => 'librarian']);

        $this->actingAs($librarian)->delete('/manage/books/999999')->assertNotFound();
        $this->put('/manage/books/999999', $this->bookFields())->assertNotFound();
        $this->post('/manage/books/999999/restore')->assertNotFound();
    }

    public function test_search_treats_sql_like_strings_as_data(): void
    {
        $matching = $this->book(['title' => "d'Andrew, notas de lectura"]);
        $this->book(['title' => 'Otro título']);

        $this->get('/catalog?'.http_build_query(['q' => "d'Andrew"]))->assertOk()->assertInertia(
            fn (Assert $page) => $page->has('books.data', 1)
                ->where('books.data.0.id', $matching->id)
                ->where('books.data.0.title', $matching->title)
                ->etc()
        );

        $this->get('/catalog?'.http_build_query(['q' => "' OR 1=1 --"]))->assertOk()->assertInertia(
            fn (Assert $page) => $page->has('books.data', 0)->etc()
        );

        $this->assertDatabaseCount('books', 2);
    }

    public function test_xss_shaped_content_is_preserved_as_data_in_inertia_props(): void
    {
        $payload = '<img src=x onerror="window.__xss=1">';
        $book = $this->book(['title' => $payload, 'description' => '<script>window.__xss=2</script>']);

        // Browser execution/escaping is verified separately by Playwright.
        $this->get('/catalog')->assertOk()->assertInertia(
            fn (Assert $page) => $page->has('books.data', 1)
                ->where('books.data.0.title', $payload)
                ->etc()
        );

        $this->assertSame($payload, $book->fresh()->title);
    }

    public function test_catalog_rejects_an_untrusted_sort_expression(): void
    {
        $book = $this->book();

        $this->get('/catalog?'.http_build_query([
            'sort' => 'title DESC, (SELECT 1)',
        ]))->assertSessionHasErrors('sort');

        $this->assertDatabaseCount('books', 1);
        $this->assertSame($this->bookFields()['title'], $book->fresh()->title);
    }

    public function test_catalog_rejects_an_array_search_without_a_server_error(): void
    {
        $this->book();

        $this->get('/catalog?'.http_build_query([
            'q' => ['unexpected'],
        ]))->assertSessionHasErrors('q');

        $this->assertDatabaseCount('books', 1);
    }

    public function test_category_and_author_filters_are_combined(): void
    {
        $matching = $this->book();
        $this->book(['category' => 'Ciencia']);
        $this->book(['author' => 'Otra autora']);

        $this->get('/catalog?'.http_build_query([
            'category' => 'Literatura',
            'author' => "Autor O'Connor",
        ]))->assertOk()->assertInertia(
            fn (Assert $page) => $page->has('books.data', 1)
                ->where('books.data.0.id', $matching->id)
                ->where('books.total', 1)
                ->etc()
        );
    }

    public function test_catalog_is_paginated_with_stable_title_ordering(): void
    {
        for ($index = 0; $index < 13; $index++) {
            $this->book(['title' => sprintf('Tomo %02d', $index)]);
        }

        $this->get('/catalog?sort=title')->assertOk()->assertInertia(
            fn (Assert $page) => $page->has('books.data', 12)
                ->where('books.data.0.title', 'Tomo 00')
                ->where('books.total', 13)
                ->where('books.current_page', 1)
                ->etc()
        );

        $this->get('/catalog?sort=title&page=2')->assertOk()->assertInertia(
            fn (Assert $page) => $page->has('books.data', 1)
                ->where('books.data.0.title', 'Tomo 12')
                ->where('books.total', 13)
                ->where('books.current_page', 2)
                ->etc()
        );
    }

    public function test_public_catalog_cannot_expose_archived_books_by_changing_status_filter(): void
    {
        $active = $this->book(['title' => 'Libro visible']);
        $archived = $this->book(['title' => 'Libro archivado']);
        $archived->delete();

        $this->get('/catalog?status=trash')->assertOk()->assertInertia(
            fn (Assert $page) => $page->has('books.data', 1)
                ->where('books.data.0.id', $active->id)
                ->where('books.data.0.title', 'Libro visible')
                ->etc()
        );

        $this->get('/catalog/'.$archived->id)->assertNotFound();
    }
}
