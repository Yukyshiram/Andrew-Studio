<?php

use App\Models\LoanRenewal;
use App\Models\User;
use App\Services\CirculationService;
use Illuminate\Contracts\Console\Kernel;

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
        default => throw new InvalidArgumentException('Operación QA no permitida.'),
    };
    fwrite(STDOUT, json_encode(['id' => $result->id, 'status' => $result instanceof LoanRenewal ? 'renewed' : $result->status], JSON_THROW_ON_ERROR)."\n");
} catch (Throwable $exception) {
    fwrite(STDERR, get_class($exception)."\n");
    exit(1);
}
