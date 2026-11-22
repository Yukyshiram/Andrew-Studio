<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\ImportBatch;
use DomainException;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use JsonException;

/**
 * A source file is an immutable import unit. Neither direction connects to the legacy database.
 *
 * @phpstan-type LegacyUser array{id:int,email:string,password:string}
 * @phpstan-type LegacyBook array{id_libro:int,Nombre_book:string,Autor_book:string,Editorial_book:string,Año_Salida_book:string,Des_book:string}
 * @phpstan-type Payload array{version:int,users:list<LegacyUser>,catalogo_books:list<LegacyBook>}
 * @phpstan-type Reference array{id:int,legacy_id:int,fingerprint:string}
 * @phpstan-type Manifest array{version:int,counts:array{users:int,books:int},records:array{users:list<Reference>,books:list<Reference>}}
 * @phpstan-type Result array{batch_id:?string,users:int,books:int,dry_run:bool,source_sha256:string}
 */
final class LegacyMigrationService
{
    public const MAX_FILE_BYTES = 20 * 1024 * 1024;

    public const MAX_ROWS_PER_TABLE = 50000;

    /**
     * @return Result
     */
    public function import(string $file, bool $dryRun = false, ?string $expectedSha256 = null): array
    {
        [$payload, $digest] = $this->readAndValidate($file);

        if ($expectedSha256 !== null && ! hash_equals($expectedSha256, $digest)) {
            throw new DomainException('El archivo cambió después de la validación. Repite la revisión.');
        }

        try {
            return DB::transaction(function () use ($payload, $digest, $dryRun): array {
                $this->assertDestinationAvailable($payload, $digest);

                $summary = [
                    'batch_id' => null,
                    'users' => count($payload['users']),
                    'books' => count($payload['catalogo_books']),
                    'dry_run' => $dryRun,
                    'source_sha256' => $digest,
                ];

                if ($dryRun) {
                    return $summary;
                }

                $batch = new ImportBatch;
                $batch->forceFill([
                    'source_sha256' => $digest,
                    'manifest' => [
                        'version' => 1,
                        'counts' => ['users' => $summary['users'], 'books' => $summary['books']],
                        'records' => ['users' => [], 'books' => []],
                    ],
                ]);
                $batch->save();

                $now = now()->toDateTimeString();

                foreach ($payload['users'] as $source) {
                    // Query Builder deliberately bypasses the "hashed" cast: the existing bcrypt
                    // must remain byte-for-byte identical, including its historical work factor.
                    DB::table('users')->insert([
                        'name' => explode('@', $source['email'], 2)[0],
                        'email' => $source['email'],
                        'password' => $source['password'],
                        'role' => 'reader',
                        'legacy_id' => $source['id'],
                        'import_batch_id' => $batch->getKey(),
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]);
                }

                foreach ($payload['catalogo_books'] as $source) {
                    DB::table('books')->insert([
                        'title' => $source['Nombre_book'],
                        'author' => $source['Autor_book'],
                        'publisher' => $source['Editorial_book'],
                        'publication_year' => $source['Año_Salida_book'],
                        'description' => $source['Des_book'],
                        'category' => 'General',
                        'cover_color' => 'olive',
                        'legacy_id' => $source['id_libro'],
                        'import_batch_id' => $batch->getKey(),
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]);
                }

                $batch->forceFill(['manifest' => [
                    'version' => 1,
                    'counts' => ['users' => $summary['users'], 'books' => $summary['books']],
                    'records' => [
                        'users' => $this->snapshot('users', (string) $batch->getKey()),
                        'books' => $this->snapshot('books', (string) $batch->getKey()),
                    ],
                ]]);
                $batch->save();

                return [...$summary, 'batch_id' => (string) $batch->getKey()];
            });
        } catch (QueryException $exception) {
            // Never forward SQL/bindings (which may contain password hashes) to CLI output.
            throw new DomainException(
                'La importación se canceló por un conflicto de integridad. No se aplicó ningún registro del lote.',
                previous: $exception,
            );
        }
    }

    /**
     * @return Result
     */
    public function rollback(string $batchId, bool $dryRun = false): array
    {
        try {
            return DB::transaction(function () use ($batchId, $dryRun): array {
                $batch = ImportBatch::query()->whereKey($batchId)->lockForUpdate()->first();

                if ($batch === null) {
                    throw new DomainException('No existe el lote solicitado.');
                }

                if ($batch->rolled_back_at !== null) {
                    throw new DomainException('El lote ya fue revertido.');
                }

                $manifest = $this->validatedManifest($batch->manifest);
                $userIds = $this->assertSnapshotUnchanged(
                    'users', (string) $batch->getKey(), $manifest['records']['users'],
                );
                $bookIds = $this->assertSnapshotUnchanged(
                    'books', (string) $batch->getKey(), $manifest['records']['books'],
                );

                $this->assertImportedUsersUnused($userIds);
                $this->assertImportedBooksUnused($bookIds);

                $summary = [
                    'batch_id' => (string) $batch->getKey(),
                    'users' => count($userIds),
                    'books' => count($bookIds),
                    'dry_run' => $dryRun,
                    'source_sha256' => $batch->source_sha256,
                ];

                if ($dryRun) {
                    return $summary;
                }

                // Only immutable records created by this batch may be physically removed.
                // This releases unique legacy IDs; it is not the application's soft-delete flow.
                foreach (array_chunk($bookIds, 500) as $ids) {
                    DB::table('books')->where('import_batch_id', $batch->getKey())->whereIn('id', $ids)->delete();
                }

                foreach (array_chunk($userIds, 500) as $ids) {
                    DB::table('users')->where('import_batch_id', $batch->getKey())->whereIn('id', $ids)->delete();
                }

                $batch->forceFill(['rolled_back_at' => now()]);
                $batch->save();

                return $summary;
            });
        } catch (QueryException $exception) {
            throw new DomainException(
                'La reversión se canceló por una referencia o conflicto de integridad. No se eliminó ningún registro.',
                previous: $exception,
            );
        }
    }

    /**
     * @return array{0:Payload,1:string}
     */
    private function readAndValidate(string $file): array
    {
        if (! is_file($file) || ! is_readable($file)) {
            throw new DomainException('No se puede leer el archivo de importación.');
        }

        $contents = @file_get_contents($file, false, null, 0, self::MAX_FILE_BYTES + 1);

        if ($contents === false || strlen($contents) > self::MAX_FILE_BYTES) {
            throw new DomainException('El archivo no es legible o supera el límite de 20 MiB.');
        }

        try {
            $decoded = json_decode($contents, true, 64, JSON_THROW_ON_ERROR | JSON_BIGINT_AS_STRING);
        } catch (JsonException $exception) {
            throw new DomainException('El archivo no contiene JSON UTF-8 válido.', previous: $exception);
        }

        if (! is_array($decoded) || array_is_list($decoded)
            || ($decoded['version'] ?? null) !== 1
            || array_diff(array_keys($decoded), ['version', 'users', 'catalogo_books']) !== []) {
            throw new DomainException('Formato no admitido: se requiere un objeto JSON de versión 1.');
        }

        $validator = Validator::make($decoded, [
            'version' => ['required', 'integer', 'in:1'],
            'users' => ['present', 'array', 'max:'.self::MAX_ROWS_PER_TABLE],
            'users.*' => ['required', 'array:id,email,password'],
            'users.*.id' => ['required', 'integer', 'min:1', 'max:4294967295'],
            'users.*.email' => ['required', 'string', 'email:rfc', 'max:191'],
            'users.*.password' => ['required', 'string', 'size:60', 'regex:/^\$2[aby]\$(0[4-9]|[12][0-9]|3[01])\$[.\/A-Za-z0-9]{53}$/'],
            'catalogo_books' => ['present', 'array', 'max:'.self::MAX_ROWS_PER_TABLE],
            'catalogo_books.*' => ['required', 'array:id_libro,Nombre_book,Autor_book,Editorial_book,Año_Salida_book,Des_book'],
            'catalogo_books.*.id_libro' => ['required', 'integer', 'min:1', 'max:4294967295'],
            'catalogo_books.*.Nombre_book' => ['required', 'string', 'max:255'],
            'catalogo_books.*.Autor_book' => ['present', 'string', 'max:255'],
            'catalogo_books.*.Editorial_book' => ['present', 'string', 'max:255'],
            'catalogo_books.*.Año_Salida_book' => ['present', 'string', 'max:50'],
            'catalogo_books.*.Des_book' => ['present', 'string', 'max:65535'],
        ]);

        $validator->validate();

        if (! array_is_list($decoded['users']) || ! array_is_list($decoded['catalogo_books'])) {
            throw new DomainException('Las colecciones de usuarios y libros deben ser listas JSON.');
        }

        $errors = [];
        $seenUsers = [];
        $seenEmails = [];
        $seenBooks = [];

        foreach ($decoded['users'] as $index => &$user) {
            $user['id'] = (int) $user['id'];
            $emailKey = mb_strtolower($user['email'], 'UTF-8');

            if (isset($seenUsers[$user['id']])) {
                $errors["users.{$index}.id"] = 'Hay IDs de usuario duplicados en el archivo.';
            }

            if (isset($seenEmails[$emailKey])) {
                $errors["users.{$index}.email"] = 'Hay correos duplicados en el archivo.';
            }

            if (password_get_info($user['password'])['algoName'] !== 'bcrypt') {
                $errors["users.{$index}.password"] = 'La contraseña histórica debe ser un bcrypt válido.';
            }

            $seenUsers[$user['id']] = true;
            $seenEmails[$emailKey] = true;
        }
        unset($user);

        foreach ($decoded['catalogo_books'] as $index => &$book) {
            $book['id_libro'] = (int) $book['id_libro'];

            if (isset($seenBooks[$book['id_libro']])) {
                $errors["catalogo_books.{$index}.id_libro"] = 'Hay IDs de libro duplicados en el archivo.';
            }

            if (strlen($book['Des_book']) > 65535) {
                $errors["catalogo_books.{$index}.Des_book"] = 'La descripción supera la capacidad de la columna histórica TEXT.';
            }

            $seenBooks[$book['id_libro']] = true;
        }
        unset($book);

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }

        /** @var Payload $decoded */
        return [$decoded, hash('sha256', $contents)];
    }

    /**
     * @param  Payload  $payload
     */
    private function assertDestinationAvailable(array $payload, string $digest): void
    {
        if (ImportBatch::query()->where('source_sha256', $digest)->lockForUpdate()->first() !== null) {
            throw new DomainException('Este archivo ya fue procesado. Revisa el lote existente; no se importa de nuevo.');
        }

        foreach (array_chunk(array_column($payload['users'], 'id'), 500) as $ids) {
            if (DB::table('users')->whereIn('legacy_id', $ids)->lockForUpdate()->first(['id']) !== null) {
                throw new DomainException('Existen usuarios con los mismos IDs históricos, incluso en la papelera.');
            }
        }

        $emails = array_map(static fn (array $user): string => mb_strtolower($user['email'], 'UTF-8'), $payload['users']);

        foreach (array_chunk($emails, 500) as $chunk) {
            if (DB::table('users')->whereIn(DB::raw('LOWER(email)'), $chunk)->lockForUpdate()->first(['id']) !== null) {
                throw new DomainException('Un correo del archivo ya existe en destino, incluso en la papelera.');
            }
        }

        foreach (array_chunk(array_column($payload['catalogo_books'], 'id_libro'), 500) as $ids) {
            if (DB::table('books')->whereIn('legacy_id', $ids)->lockForUpdate()->first(['id']) !== null) {
                throw new DomainException('Existen libros con los mismos IDs históricos, incluso en la papelera.');
            }
        }
    }

    /**
     * @return list<Reference>
     */
    private function snapshot(string $table, string $batchId): array
    {
        $references = [];

        foreach (DB::table($table)->where('import_batch_id', $batchId)->orderBy('id')->get() as $row) {
            $attributes = (array) $row;
            $references[] = [
                'id' => (int) $attributes['id'],
                'legacy_id' => (int) $attributes['legacy_id'],
                'fingerprint' => $this->fingerprint($attributes),
            ];
        }

        return $references;
    }

    /**
     * @param  array<string,mixed>  $attributes
     */
    private function fingerprint(array $attributes): string
    {
        ksort($attributes);

        return hash('sha256', json_encode(
            $attributes,
            JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRESERVE_ZERO_FRACTION,
        ));
    }

    /**
     * @return Manifest
     */
    private function validatedManifest(mixed $manifest): array
    {
        if (! is_array($manifest)) {
            throw new DomainException('El manifiesto del lote no es válido. Se requiere revisión manual.');
        }

        $validator = Validator::make($manifest, [
            'version' => ['required', 'integer', 'in:1'],
            'counts.users' => ['required', 'integer', 'min:0'],
            'counts.books' => ['required', 'integer', 'min:0'],
            'records.users' => ['present', 'array'],
            'records.books' => ['present', 'array'],
            'records.users.*.id' => ['required', 'integer', 'min:1', 'distinct'],
            'records.users.*.legacy_id' => ['required', 'integer', 'min:1', 'distinct'],
            'records.users.*.fingerprint' => ['required', 'string', 'regex:/^[a-f0-9]{64}$/'],
            'records.books.*.id' => ['required', 'integer', 'min:1', 'distinct'],
            'records.books.*.legacy_id' => ['required', 'integer', 'min:1', 'distinct'],
            'records.books.*.fingerprint' => ['required', 'string', 'regex:/^[a-f0-9]{64}$/'],
        ]);

        if ($validator->fails()
            || count($manifest['records']['users']) !== $manifest['counts']['users']
            || count($manifest['records']['books']) !== $manifest['counts']['books']) {
            throw new DomainException('El manifiesto del lote no es válido. Se requiere revisión manual.');
        }

        /** @var Manifest $manifest */
        return $manifest;
    }

    /**
     * @param  list<Reference>  $references
     * @return list<int>
     */
    private function assertSnapshotUnchanged(string $table, string $batchId, array $references): array
    {
        $rows = DB::table($table)->where('import_batch_id', $batchId)->orderBy('id')->lockForUpdate()->get();

        if ($rows->count() !== count($references)) {
            throw new DomainException('El lote contiene registros ausentes o adicionales. No se puede revertir automáticamente.');
        }

        $expected = [];
        foreach ($references as $reference) {
            $expected[$reference['id']] = $reference;
        }

        $ids = [];

        foreach ($rows as $row) {
            $attributes = (array) $row;
            $id = (int) $attributes['id'];
            $reference = $expected[$id] ?? null;

            if ($reference === null || (int) $attributes['legacy_id'] !== $reference['legacy_id']
                || ! hash_equals($reference['fingerprint'], $this->fingerprint($attributes))) {
                throw new DomainException('Hay registros modificados después de la importación. No se puede revertir automáticamente.');
            }

            $ids[] = $id;
        }

        return $ids;
    }

    /**
     * @param  list<int>  $userIds
     */
    private function assertImportedUsersUnused(array $userIds): void
    {
        foreach (array_chunk($userIds, 500) as $ids) {
            if (Schema::hasTable('audit_events')
                && DB::table('audit_events')->whereIn('user_id', $ids)->lockForUpdate()->first() !== null) {
                throw new DomainException('Los usuarios importados tienen actividad de auditoría. La reversión requiere revisión manual.');
            }

            if (Schema::hasTable('sessions')
                && DB::table('sessions')->whereIn('user_id', $ids)->lockForUpdate()->first() !== null) {
                throw new DomainException('Los usuarios importados tienen sesiones persistidas. La reversión requiere revisión manual.');
            }

            $emails = DB::table('users')->whereIn('id', $ids)->pluck('email')->all();

            if (Schema::hasTable('password_reset_tokens')
                && DB::table('password_reset_tokens')->whereIn('email', $emails)->lockForUpdate()->first() !== null) {
                throw new DomainException('Los usuarios importados tienen recuperaciones pendientes. La reversión requiere revisión manual.');
            }
        }
    }

    /**
     * @param  list<int>  $bookIds
     */
    private function assertImportedBooksUnused(array $bookIds): void
    {
        if (! Schema::hasTable('audit_events')) {
            return;
        }

        foreach (array_chunk($bookIds, 500) as $ids) {
            if (DB::table('audit_events')->where('subject_type', 'Book')->whereIn('subject_id', $ids)
                ->lockForUpdate()->first() !== null) {
                throw new DomainException('Los libros importados tienen actividad de auditoría. La reversión requiere revisión manual.');
            }
        }
    }
}
