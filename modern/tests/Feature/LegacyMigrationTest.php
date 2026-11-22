<?php

namespace Tests\Feature;

use App\Models\AuditEvent;
use App\Models\Book;
use App\Models\ImportBatch;
use App\Models\User;
use App\Services\LegacyMigrationService;
use Closure;
use DomainException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class LegacyMigrationTest extends TestCase
{
    use RefreshDatabase;

    /** @var list<string> */
    private array $temporaryFiles = [];

    protected function tearDown(): void
    {
        foreach ($this->temporaryFiles as $file) {
            if (is_file($file)) {
                unlink($file);
            }
        }

        parent::tearDown();
    }

    public function test_dry_run_reports_counts_without_writing_a_batch_or_records(): void
    {
        $file = $this->writePayload($this->fixture());

        $result = app(LegacyMigrationService::class)->import($file, dryRun: true);

        $this->assertNull($result['batch_id']);
        $this->assertSame(1, $result['users']);
        $this->assertSame(1, $result['books']);
        $this->assertTrue($result['dry_run']);
        $this->assertEmptyDestination();
    }

    public function test_import_preserves_bcrypt_and_historical_text_without_overwriting_records_or_granting_privileges(): void
    {
        $existingUser = User::factory()->create();
        $existingBook = Book::factory()->create();
        $payload = $this->fixture();

        $batchId = $this->applyFixture($payload);

        $user = User::query()->where('legacy_id', 41)->sole();
        $book = Book::query()->where('legacy_id', 83)->sole();
        $this->assertSame($payload['users'][0]['password'], $user->getRawOriginal('password'));
        $this->assertTrue(Hash::check('password', $user->password));
        $this->assertSame('reader', $user->role);
        $this->assertSame('ana.lectora', $user->name);
        $this->assertSame('ana.lectora@example.test', $user->email);
        $this->assertNotSame(41, $user->id);
        $this->assertNotSame(83, $book->id);
        $this->assertSame($batchId, $user->import_batch_id);
        $this->assertSame($batchId, $book->import_batch_id);
        $this->assertDatabaseHas('books', [
            'id' => $book->id, 'title' => "El nombre d'Andrew", 'publication_year' => 'X / 1984',
            'description' => '', 'category' => 'General', 'cover_color' => 'olive',
        ]);
        $this->assertModelExists($existingUser);
        $this->assertModelExists($existingBook);
        $this->assertDatabaseCount('import_batches', 1);

        $manifest = json_encode(ImportBatch::query()->sole()->manifest, JSON_THROW_ON_ERROR);
        $this->assertStringNotContainsString($payload['users'][0]['password'], $manifest);
        $this->assertStringNotContainsString('ana.lectora@example.test', $manifest);
    }

    public function test_empty_historical_metadata_is_not_converted_to_null(): void
    {
        $payload = $this->fixture();
        $payload['catalogo_books'][0]['Autor_book'] = '';
        $payload['catalogo_books'][0]['Editorial_book'] = '';
        $payload['catalogo_books'][0]['Año_Salida_book'] = '';

        $this->applyFixture($payload);

        $this->assertDatabaseHas('books', [
            'legacy_id' => 83, 'author' => '', 'publisher' => '', 'publication_year' => '', 'description' => '',
        ]);
    }

    /** @return array<string,array{string,mixed,string}> */
    public static function invalidSourceFields(): array
    {
        return [
            'email inválido' => ['users.0.email', 'no-es-correo', 'users.0.email'],
            'contraseña plana' => ['users.0.password', 'plaintext-password', 'users.0.password'],
            'ID de usuario inválido' => ['users.0.id', 0, 'users.0.id'],
            'ID de libro inválido' => ['catalogo_books.0.id_libro', 0, 'catalogo_books.0.id_libro'],
            'año numérico' => ['catalogo_books.0.Año_Salida_book', 1984, 'catalogo_books.0.Año_Salida_book'],
            'año de 51 caracteres' => ['catalogo_books.0.Año_Salida_book', str_repeat('X', 51), 'catalogo_books.0.Año_Salida_book'],
            'título vacío' => ['catalogo_books.0.Nombre_book', '', 'catalogo_books.0.Nombre_book'],
            'título de 256 caracteres' => ['catalogo_books.0.Nombre_book', str_repeat('a', 256), 'catalogo_books.0.Nombre_book'],
            'descripción excede bytes TEXT' => ['catalogo_books.0.Des_book', str_repeat('ñ', 32768), 'catalogo_books.0.Des_book'],
            'asignación de rol' => ['users.0.role', 'admin', 'users.0'],
            'procedencia inyectada' => ['catalogo_books.0.import_batch_id', 'otro-lote', 'catalogo_books.0'],
        ];
    }

    #[DataProvider('invalidSourceFields')]
    public function test_invalid_fields_reject_the_entire_batch_without_partial_writes(string $path, mixed $value, string $errorField): void
    {
        $payload = $this->fixture();
        data_set($payload, $path, $value);

        try {
            app(LegacyMigrationService::class)->import($this->writePayload($payload));
            $this->fail('Una fila inválida no debe importarse.');
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey($errorField, $exception->errors());
        }

        $this->assertEmptyDestination();
    }

    public function test_duplicate_source_user_ids_are_rejected_before_any_write(): void
    {
        $payload = $this->fixture();
        $duplicate = $payload['users'][0];
        $duplicate['email'] = 'otra.lectora@example.test';
        $payload['users'][] = $duplicate;

        try {
            $this->applyFixture($payload);
            $this->fail('Un ID duplicado no debe importarse.');
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey('users.1.id', $exception->errors());
        }

        $this->assertEmptyDestination();
    }

    public function test_duplicate_source_book_ids_are_rejected_before_any_write(): void
    {
        $payload = $this->fixture();
        $payload['catalogo_books'][] = $payload['catalogo_books'][0];

        try {
            $this->applyFixture($payload);
            $this->fail('Un ID duplicado no debe importarse.');
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey('catalogo_books.1.id_libro', $exception->errors());
        }

        $this->assertEmptyDestination();
    }

    public function test_duplicate_source_emails_are_case_insensitive(): void
    {
        $payload = $this->fixture();
        $duplicate = $payload['users'][0];
        $duplicate['id'] = 42;
        $duplicate['email'] = 'ANA.LECTORA@example.test';
        $payload['users'][] = $duplicate;

        try {
            $this->applyFixture($payload);
            $this->fail('Un correo duplicado no debe importarse.');
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey('users.1.email', $exception->errors());
        }

        $this->assertEmptyDestination();
    }

    public function test_existing_email_in_trash_prevents_merging_or_overwriting(): void
    {
        $existing = User::factory()->create(['email' => 'ANA.LECTORA@example.test']);
        $existing->delete();

        $this->assertImportBlocked($this->writePayload($this->fixture()), 'correo');

        $this->assertSoftDeleted($existing);
        $this->assertDatabaseCount('users', 1);
        $this->assertDatabaseCount('books', 0);
        $this->assertDatabaseCount('import_batches', 0);
    }

    public function test_existing_historical_user_id_prevents_partial_book_import(): void
    {
        $existing = User::factory()->create(['legacy_id' => 41]);

        $this->assertImportBlocked($this->writePayload($this->fixture()), 'IDs históricos');

        $this->assertModelExists($existing);
        $this->assertDatabaseCount('users', 1);
        $this->assertDatabaseCount('books', 0);
        $this->assertDatabaseCount('import_batches', 0);
    }

    public function test_existing_historical_book_id_in_trash_prevents_partial_user_import(): void
    {
        $existing = Book::factory()->create(['legacy_id' => 83]);
        $existing->delete();

        $this->assertImportBlocked($this->writePayload($this->fixture()), 'IDs históricos');

        $this->assertSoftDeleted($existing);
        $this->assertDatabaseCount('users', 0);
        $this->assertDatabaseCount('books', 1);
        $this->assertDatabaseCount('import_batches', 0);
    }

    public function test_identical_source_bytes_cannot_be_imported_twice(): void
    {
        $file = $this->writePayload($this->fixture());
        app(LegacyMigrationService::class)->import($file);

        $this->assertImportBlocked($file, 'ya fue procesado');

        $this->assertDatabaseCount('users', 1);
        $this->assertDatabaseCount('books', 1);
        $this->assertDatabaseCount('import_batches', 1);
    }

    public function test_file_changed_after_preview_cannot_be_applied_as_the_reviewed_file(): void
    {
        $service = app(LegacyMigrationService::class);
        $payload = $this->fixture();
        $preview = $service->import($this->writePayload($payload), dryRun: true);
        $payload['catalogo_books'][0]['Nombre_book'] = 'Contenido cambiado después de revisar';

        try {
            $service->import($this->writePayload($payload), expectedSha256: $preview['source_sha256']);
            $this->fail('La aplicación debe corresponder al archivo revisado.');
        } catch (DomainException $exception) {
            $this->assertStringContainsString('cambió después', $exception->getMessage());
        }

        $this->assertEmptyDestination();
    }

    public function test_a_database_conflict_after_preflight_rolls_back_the_batch_and_all_partial_inserts(): void
    {
        $eventName = 'eloquent.created: '.ImportBatch::class;
        Event::listen($eventName, static function (): void {
            Book::factory()->create(['legacy_id' => 83]);
        });
        $file = $this->writePayload($this->fixture());

        try {
            $this->assertImportBlocked($file, 'conflicto de integridad');
        } finally {
            Event::forget($eventName);
        }

        $this->assertEmptyDestination();
    }

    public function test_rollback_dry_run_keeps_all_records_and_the_active_batch(): void
    {
        $batchId = $this->applyFixture();

        $result = app(LegacyMigrationService::class)->rollback($batchId, dryRun: true);

        $this->assertTrue($result['dry_run']);
        $this->assertSame(1, $result['users']);
        $this->assertSame(1, $result['books']);
        $this->assertDatabaseCount('users', 1);
        $this->assertDatabaseCount('books', 1);
        $this->assertDatabaseHas('import_batches', ['id' => $batchId, 'rolled_back_at' => null]);
    }

    public function test_rollback_removes_only_records_owned_by_the_requested_unchanged_batch(): void
    {
        $existingUser = User::factory()->create();
        $existingBook = Book::factory()->create();
        $batchId = $this->applyFixture();
        $otherPayload = $this->fixture();
        $otherPayload['users'][0]['id'] = 42;
        $otherPayload['users'][0]['email'] = 'otro.lote@example.test';
        $otherPayload['catalogo_books'][0]['id_libro'] = 84;
        $otherBatchId = $this->applyFixture($otherPayload);

        app(LegacyMigrationService::class)->rollback($batchId);

        $this->assertDatabaseMissing('users', ['import_batch_id' => $batchId]);
        $this->assertDatabaseMissing('books', ['import_batch_id' => $batchId]);
        $this->assertDatabaseCount('users', 2);
        $this->assertDatabaseCount('books', 2);
        $this->assertModelExists($existingUser);
        $this->assertModelExists($existingBook);
        $this->assertDatabaseHas('users', ['import_batch_id' => $otherBatchId]);
        $this->assertDatabaseHas('books', ['import_batch_id' => $otherBatchId]);
        $this->assertNotNull(ImportBatch::query()->findOrFail($batchId)->rolled_back_at);
        $this->assertDatabaseHas('import_batches', ['id' => $otherBatchId, 'rolled_back_at' => null]);
        $this->assertDatabaseCount('import_batches', 2);
    }

    /** @return array<string,array{Closure,string}> */
    public static function changesAfterImport(): array
    {
        return [
            'título editado' => [static fn () => Book::where('legacy_id', 83)->sole()->update(['title' => 'Edición posterior']), 'modificados'],
            'rol promovido' => [static fn () => User::where('legacy_id', 41)->sole()->update(['role' => 'librarian']), 'modificados'],
            'contraseña cambiada' => [static fn () => User::where('legacy_id', 41)->sole()->update(['password' => 'ClavePosterior2026!']), 'modificados'],
            'libro en papelera' => [static fn () => Book::where('legacy_id', 83)->sole()->delete(), 'modificados'],
            'fila ausente' => [static fn () => Book::where('legacy_id', 83)->sole()->forceDelete(), 'ausentes o adicionales'],
            'fila adicional' => [static fn () => Book::factory()->create(['import_batch_id' => Book::where('legacy_id', 83)->sole()->import_batch_id]), 'ausentes o adicionales'],
            'usuario con auditoría' => [static fn () => AuditEvent::create(['user_id' => User::where('legacy_id', 41)->sole()->id, 'action' => 'auth.login']), 'actividad de auditoría'],
            'libro con auditoría' => [static fn () => AuditEvent::create(['action' => 'book.updated', 'subject_type' => 'Book', 'subject_id' => Book::where('legacy_id', 83)->sole()->id]), 'actividad de auditoría'],
            'sesión persistida' => [static fn () => DB::table('sessions')->insert(['id' => 'migration-test-session', 'user_id' => User::where('legacy_id', 41)->sole()->id, 'payload' => 'e30=', 'last_activity' => 1700000000]), 'sesiones persistidas'],
            'recuperación pendiente' => [static fn () => DB::table('password_reset_tokens')->insert(['email' => 'ana.lectora@example.test', 'token' => 'referencia-ficticia-de-prueba', 'created_at' => '2026-11-20 12:00:00']), 'recuperaciones pendientes'],
        ];
    }

    #[DataProvider('changesAfterImport')]
    public function test_changed_or_used_batches_are_preserved_entirely(Closure $change, string $message): void
    {
        $batchId = $this->applyFixture();
        $change();
        $beforeUsers = DB::table('users')->orderBy('id')->get()->toJson();
        $beforeBooks = DB::table('books')->orderBy('id')->get()->toJson();
        $beforeEvents = DB::table('audit_events')->orderBy('id')->get()->toJson();

        $this->assertRollbackBlocked($batchId, $message);

        $this->assertSame($beforeUsers, DB::table('users')->orderBy('id')->get()->toJson());
        $this->assertSame($beforeBooks, DB::table('books')->orderBy('id')->get()->toJson());
        $this->assertSame($beforeEvents, DB::table('audit_events')->orderBy('id')->get()->toJson());
        $this->assertDatabaseHas('import_batches', ['id' => $batchId, 'rolled_back_at' => null]);
    }

    public function test_reverted_batches_cannot_be_reverted_or_reimported_implicitly(): void
    {
        $file = $this->writePayload($this->fixture());
        $service = app(LegacyMigrationService::class);
        $result = $service->import($file);
        $this->assertIsString($result['batch_id']);
        $service->rollback($result['batch_id']);

        $this->assertRollbackBlocked($result['batch_id'], 'ya fue revertido');
        $this->assertImportBlocked($file, 'ya fue procesado');

        $this->assertDatabaseCount('users', 0);
        $this->assertDatabaseCount('books', 0);
        $this->assertDatabaseCount('import_batches', 1);
    }

    public function test_missing_batch_is_rejected_without_changing_data(): void
    {
        $this->assertRollbackBlocked('019aba00-0000-7000-8000-000000000001', 'No existe');

        $this->assertEmptyDestination();
    }

    /** @return array<string,array{string,string}> */
    public static function unsupportedFiles(): array
    {
        return [
            'JSON incompleto' => ['{"version":1,"users":', 'JSON UTF-8 válido'],
            'versión no admitida' => ['{"version":2,"users":[],"catalogo_books":[]}', 'versión 1'],
            'colección como objeto' => ['{"version":1,"users":{"0":{}},"catalogo_books":[]}', ''],
        ];
    }

    #[DataProvider('unsupportedFiles')]
    public function test_malformed_files_never_change_the_destination(string $bytes, string $message): void
    {
        try {
            app(LegacyMigrationService::class)->import($this->writeBytes($bytes));
            $this->fail('Un archivo inválido no debe importarse.');
        } catch (DomainException|ValidationException $exception) {
            $this->assertStringContainsString($message, $exception->getMessage());
        }

        $this->assertEmptyDestination();
    }

    public function test_import_command_refuses_noninteractive_writes_without_explicit_confirmation(): void
    {
        $file = $this->writePayload($this->fixture());

        $exit = Artisan::call('legacy:import', ['file' => $file, '--no-interaction' => true]);

        $this->assertSame(1, $exit);
        $this->assertStringContainsString('Importación cancelada', Artisan::output());
        $this->assertEmptyDestination();
    }

    public function test_import_command_applies_confirmed_records_without_printing_bcrypt(): void
    {
        $payload = $this->fixture();
        $file = $this->writePayload($payload);

        $exit = Artisan::call('legacy:import', ['file' => $file, '--yes' => true, '--no-interaction' => true]);

        $this->assertSame(0, $exit);
        $this->assertStringContainsString('Importación completada', Artisan::output());
        $this->assertStringNotContainsString($payload['users'][0]['password'], Artisan::output());
        $this->assertDatabaseCount('users', 1);
        $this->assertDatabaseCount('books', 1);
        $this->assertDatabaseCount('import_batches', 1);
    }

    public function test_rollback_command_removes_confirmed_records_and_keeps_the_manifest(): void
    {
        $batchId = $this->applyFixture();

        $exit = Artisan::call('legacy:rollback', ['batch' => $batchId, '--yes' => true, '--no-interaction' => true]);

        $this->assertSame(0, $exit);
        $this->assertStringContainsString('Lote revertido', Artisan::output());
        $this->assertDatabaseCount('users', 0);
        $this->assertDatabaseCount('books', 0);
        $this->assertDatabaseCount('import_batches', 1);
        $this->assertNotNull(ImportBatch::query()->findOrFail($batchId)->rolled_back_at);
    }

    /** @return array<string,mixed> */
    private function fixture(): array
    {
        return json_decode(file_get_contents(base_path('tests/Fixtures/legacy.json')), true, 64, JSON_THROW_ON_ERROR);
    }

    /** @param array<string,mixed>|null $payload */
    private function applyFixture(?array $payload = null): string
    {
        $result = app(LegacyMigrationService::class)->import($this->writePayload($payload ?? $this->fixture()));
        $this->assertIsString($result['batch_id']);

        return $result['batch_id'];
    }

    /** @param array<string,mixed> $payload */
    private function writePayload(array $payload): string
    {
        return $this->writeBytes(json_encode($payload, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
    }

    private function writeBytes(string $bytes): string
    {
        $file = tempnam(sys_get_temp_dir(), 'bibliotecary-migration-');

        if ($file === false) {
            throw new \RuntimeException('No se pudo crear el archivo ficticio de prueba.');
        }

        $this->temporaryFiles[] = $file;
        file_put_contents($file, $bytes);

        return $file;
    }

    private function assertImportBlocked(string $file, string $message): void
    {
        try {
            app(LegacyMigrationService::class)->import($file);
            $this->fail('La importación debe bloquearse para conservar los datos.');
        } catch (DomainException $exception) {
            $this->assertStringContainsString($message, $exception->getMessage());
        }
    }

    private function assertRollbackBlocked(string $batchId, string $message): void
    {
        try {
            app(LegacyMigrationService::class)->rollback($batchId);
            $this->fail('La reversión debe bloquearse para conservar los datos.');
        } catch (DomainException $exception) {
            $this->assertStringContainsString($message, $exception->getMessage());
        }
    }

    private function assertEmptyDestination(): void
    {
        $this->assertDatabaseCount('users', 0);
        $this->assertDatabaseCount('books', 0);
        $this->assertDatabaseCount('import_batches', 0);
    }
}
