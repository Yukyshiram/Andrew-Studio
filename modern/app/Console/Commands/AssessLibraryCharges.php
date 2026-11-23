<?php

namespace App\Console\Commands;

use App\Services\LedgerService;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('library:assess-charges')]
#[Description('Registra cargos configurados por retraso, daño y pérdida sin duplicar movimientos')]
class AssessLibraryCharges extends Command
{
    /**
     * Execute the console command.
     */
    public function handle(LedgerService $service): int
    {
        $this->info('Cargos nuevos registrados: '.$service->assessAll().'.');

        return self::SUCCESS;
    }
}
