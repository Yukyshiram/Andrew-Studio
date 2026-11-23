<?php

use App\Models\FinancialEntry;
use App\Models\LoanRenewal;
use App\Models\User;
use App\Services\CirculationService;
use App\Services\LedgerService;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Validation\ValidationException;

require __DIR__.'/../../vendor/autoload.php';

if (getenv('APP_ENV') !== 'testing' || getenv('DB_DATABASE') !== 'bibliotecary_v3_qa' || getenv('DB_HOST') !== 'db-test') {
    fwrite(STDERR, "El worker solo puede utilizar la base MySQL QA aislada.\n");
    exit(2);
}

$app = require __DIR__.'/../../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

try {
    $actor = User::findOrFail((int) ($argv[2] ?? 0));
    $service = app(CirculationService::class);
    fwrite(STDOUT, "ready\n");
    fflush(STDOUT);
    $result = match ($argv[1] ?? '') {
        'prepare' => $service->prepare($actor, (int) ($argv[3] ?? 0)),
        'issue' => $service->issue($actor, (int) ($argv[3] ?? 0)),
        'renew' => $service->renew($actor, (int) ($argv[3] ?? 0), $argv[4] ?? ''),
        'payment' => app(LedgerService::class)->manual($actor, (int) ($argv[3] ?? 0), 'payment', (int) ($argv[5] ?? 0), $argv[4] ?? '', 'Pago sintético de concurrencia'),
        default => throw new InvalidArgumentException('Operación QA no permitida.'),
    };
    fwrite(STDOUT, json_encode(['id' => $result->id, 'status' => $result instanceof FinancialEntry ? $result->kind : ($result instanceof LoanRenewal ? 'renewed' : $result->status)], JSON_THROW_ON_ERROR)."\n");
} catch (Throwable $exception) {
    if (($argv[1] ?? '') === 'payment' && $exception instanceof ValidationException && ($exception->errors()['finance'][0] ?? '') === 'El movimiento superaría el saldo pendiente. No se registran sobrepagos ni saldos a favor en esta versión.') {
        fwrite(STDOUT, json_encode(['id' => 0, 'status' => 'balance_rejected'], JSON_THROW_ON_ERROR)."\n");
        exit(0);
    }
    fwrite(STDERR, get_class($exception)."\n");
    exit(1);
}
