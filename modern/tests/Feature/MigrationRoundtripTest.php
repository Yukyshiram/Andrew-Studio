<?php

namespace Tests\Feature;

use App\Models\Book;
use App\Models\BookCopy;
use App\Models\Member;
use App\Models\User;
use App\Services\CirculationService;
use App\Services\LegacyMigrationService;
use DomainException;
use Illuminate\Foundation\Testing\DatabaseMigrations;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use PHPUnit\Framework\Attributes\TestWith;
use Tests\TestCase;

class MigrationRoundtripTest extends TestCase
{
    use DatabaseMigrations;

    public function test_additive_migration_roundtrip_does_not_replace_existing_records(): void
    {
        $book = Book::factory()->create(['title' => 'Título conservado']);
        $user = User::factory()->create();
        $files = $this->newMigrations();
        foreach (array_reverse($files) as $file) {
            (require $file)->down();
        }
        $this->assertDatabaseHas('books', ['id' => $book->id, 'title' => 'Título conservado']);
        $this->assertDatabaseHas('users', ['id' => $user->id]);
        foreach ($files as $file) {
            (require $file)->up();
        }
        $this->assertSame('No registrado', $book->fresh()->language);
        $this->assertSame(0, $book->copies()->count());
    }

    public function test_financial_schema_roundtrip_preserves_existing_circulation_records(): void
    {
        $reader = User::factory()->create();
        Member::enroll($reader);
        $staff = User::factory()->create(['role' => 'librarian']);
        $copy = BookCopy::factory()->create();
        $service = app(CirculationService::class);
        $request = $service->requestBook($reader, $copy->book_id);
        $service->prepare($staff, $request->id);
        $loan = $service->issue($staff, $request->id);
        $original = (array) DB::table('loans')->where('id', $loan->id)->first();
        unset($original['fee_settled_at']);
        $migration = require database_path('migrations/2026_11_22_094801_create_financial_entries.php');
        $migration->down();
        $this->assertSame($original, (array) DB::table('loans')->where('id', $loan->id)->first());
        $migration->up();
        $this->assertSame($original, (array) DB::table('loans')->where('id', $loan->id)->first(array_keys($original)));
        $this->assertNull(DB::table('loans')->where('id', $loan->id)->value('fee_settled_at'));
        $this->assertDatabaseHas('copy_allocations', ['copy_id' => $copy->id, 'circulation_request_id' => $request->id]);
    }

    public function test_an_unused_pre_v3_import_can_still_be_reverted_after_additive_migrations(): void
    {
        $batch = $this->preV3Batch();
        $service = app(LegacyMigrationService::class);
        $this->assertTrue($service->rollback($batch, true)['dry_run']);
        $this->assertDatabaseCount('books', 1);
        $service->rollback($batch);
        $this->assertDatabaseCount('books', 0);
        $this->assertDatabaseCount('users', 0);
    }

    #[TestWith(['isbn', '9780306406157'])]
    #[TestWith(['edition', 'Segunda edición'])]
    #[TestWith(['language', 'English'])]
    public function test_pre_v3_import_cannot_discard_new_bibliographic_metadata(string $field, string $value): void
    {
        $batch = $this->preV3Batch();
        DB::table('books')->update([$field => $value]);
        try {
            app(LegacyMigrationService::class)->rollback($batch);
            $this->fail('Los metadatos añadidos deben conservarse.');
        } catch (DomainException $exception) {
            $this->assertStringContainsString('modificados', $exception->getMessage());
        }
        $this->assertDatabaseHas('books', [$field => $value]);
        $this->assertDatabaseCount('users', 1);
    }

    /** @return list<string> */
    private function newMigrations(): array
    {
        $files = array_values(array_filter(glob(database_path('migrations/*.php')), fn (string $file): bool => basename($file) >= '2026_11_22_022905_extend_bibliography_and_create_inventory.php'));
        sort($files);

        return $files;
    }

    private function preV3Batch(): string
    {
        $files = $this->newMigrations();
        foreach (array_reverse($files) as $file) {
            (require $file)->down();
        }
        $disk = 'migration-roundtrip-'.DB::getDefaultConnection();
        Storage::fake($disk);
        Storage::disk($disk)->put('pre-v3.json', json_encode([
            'version' => 1,
            'users' => [['id' => 41, 'email' => 'legacy.sintetico@example.test', 'password' => Hash::make('Clave-Sintetica2026!')]],
            'catalogo_books' => [['id_libro' => 83, 'Nombre_book' => 'Registro histórico sintético', 'Autor_book' => 'Autora ficticia', 'Editorial_book' => 'Editorial QA', 'Año_Salida_book' => 'X / 1984', 'Des_book' => 'Descripción original conservada.']],
        ], JSON_THROW_ON_ERROR));
        $batch = app(LegacyMigrationService::class)->import(Storage::disk($disk)->path('pre-v3.json'))['batch_id'];
        foreach ($files as $file) {
            (require $file)->up();
        }

        return $batch;
    }
}
