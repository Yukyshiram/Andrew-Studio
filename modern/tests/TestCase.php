<?php

namespace Tests;

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use RuntimeException;

abstract class TestCase extends BaseTestCase
{
    public function createApplication(): Application
    {
        $app = parent::createApplication();
        if (! $app->environment('testing')) {
            throw new RuntimeException('Pruebas detenidas: el entorno no es testing.');
        }
        $this->assertIsolatedDatabase($app->make('db')->connection()->getConfig());

        return $app;
    }

    protected function assertIsolatedDatabase(array $configuration): void
    {
        $inMemory = ($configuration['driver'] ?? '') === 'sqlite' && ($configuration['database'] ?? '') === ':memory:';
        $mysqlQa = ($configuration['driver'] ?? '') === 'mysql'
            && ($configuration['host'] ?? '') === 'db-test'
            && ($configuration['database'] ?? '') === 'bibliotecary_v3_qa'
            && empty($configuration['unix_socket']);
        if (! $inMemory && ! $mysqlQa) {
            throw new RuntimeException('Pruebas detenidas: la conexión no es una base aislada autorizada.');
        }
    }
}
