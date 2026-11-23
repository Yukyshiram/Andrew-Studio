<?php

namespace App\Console\Commands;

use App\Services\CirculationService;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('library:refresh-reservations')]
#[Description('Libera recogidas vencidas y asigna ejemplares disponibles a las reservas validadas')]
class RefreshReservations extends Command
{
    /**
     * Execute the console command.
     */
    public function handle(CirculationService $service): int
    {
        $result = $service->refreshReservations();
        $this->info('Recogidas vencidas: '.$result['expired'].'. Nuevas asignaciones: '.$result['ready'].'.');

        return self::SUCCESS;
    }
}
