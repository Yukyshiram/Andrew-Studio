<?php

namespace App\Console\Commands;

use App\Services\LegacyMigrationService;
use DomainException;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Throwable;

#[Signature('legacy:rollback {batch : UUID del lote importado} {--dry-run : Comprobar la reversión sin eliminar registros} {--yes : Confirmar la reversión del lote sin preguntas}')]
#[Description('Revierte exclusivamente un lote de migración que no haya sido modificado o utilizado')]
class RollbackLegacy extends Command
{
    public function handle(LegacyMigrationService $migration): int
    {
        try {
            $batchId = (string) $this->argument('batch');
            $preview = $migration->rollback($batchId, dryRun: true);
            $this->info(sprintf('Lote sin cambios posteriores. Usuarios: %d. Libros: %d.', $preview['users'], $preview['books']));

            if ($this->option('dry-run')) {
                $this->line('Simulación terminada: no se eliminó ningún registro.');

                return self::SUCCESS;
            }

            if (! $this->option('yes') && (! $this->input->isInteractive()
                || ! $this->confirm('¿Revertir exclusivamente los registros nuevos de este lote?', false))) {
                $this->warn('Reversión cancelada. Usa --dry-run para revisar o --yes para confirmar explícitamente.');

                return self::FAILURE;
            }

            $migration->rollback($batchId);
            $this->info('Lote revertido. El manifiesto y la base antigua se conservan.');

            return self::SUCCESS;
        } catch (DomainException $exception) {
            $this->error($exception->getMessage());
        } catch (Throwable) {
            $this->error('La reversión no pudo completarse. Revisa el entorno y las referencias del lote. No se muestran datos sensibles.');
        }

        return self::FAILURE;
    }
}
