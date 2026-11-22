<?php

namespace App\Console\Commands;

use App\Services\LegacyMigrationService;
use DomainException;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Validation\ValidationException;
use Throwable;

#[Signature('legacy:import {file : Archivo JSON UTF-8 de versión 1} {--dry-run : Validar sin aplicar cambios} {--yes : Confirmar la aplicación del lote sin preguntas}')]
#[Description('Importa cuentas y libros del legado con validación y procedencia reversible')]
class ImportLegacy extends Command
{
    public function handle(LegacyMigrationService $migration): int
    {
        try {
            $file = (string) $this->argument('file');
            $preview = $migration->import($file, dryRun: true);
            $this->info(sprintf('Validación correcta. Usuarios: %d. Libros: %d.', $preview['users'], $preview['books']));

            if ($this->option('dry-run')) {
                $this->line('Simulación terminada: no se modificó ningún registro.');

                return self::SUCCESS;
            }

            if (! $this->option('yes') && (! $this->input->isInteractive()
                || ! $this->confirm('¿Aplicar estos registros en la base de datos 2.0?', false))) {
                $this->warn('Importación cancelada. Usa --dry-run para revisar o --yes para confirmar explícitamente.');

                return self::FAILURE;
            }

            $result = $migration->import($file, expectedSha256: $preview['source_sha256']);
            $this->info('Importación completada. Lote: '.$result['batch_id']);
            $this->line('Conserva el UUID del lote para revisar o revertir esta importación.');

            return self::SUCCESS;
        } catch (ValidationException $exception) {
            $this->error('Archivo rechazado: '.$exception->validator->errors()->first());
        } catch (DomainException $exception) {
            $this->error($exception->getMessage());
        } catch (Throwable) {
            $this->error('La importación no pudo completarse. Revisa el entorno y el esquema de destino. No se muestran datos sensibles.');
        }

        return self::FAILURE;
    }
}
