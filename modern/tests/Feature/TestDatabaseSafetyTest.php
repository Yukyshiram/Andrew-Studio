<?php

namespace Tests\Feature;

use PHPUnit\Framework\Attributes\TestWith;
use RuntimeException;
use Tests\TestCase;

class TestDatabaseSafetyTest extends TestCase
{
    #[TestWith(['sqlite', 'database.sqlite', ''])]
    #[TestWith(['mysql', 'bibliotecary_v3_qa', 'db'])]
    #[TestWith(['mysql', 'another_database', 'db-test'])]
    #[TestWith(['pgsql', 'bibliotecary_v3_qa', 'db-test'])]
    #[TestWith(['mysql', 'bibliotecary_v3_qa', 'db-test', '/unapproved/socket'])]
    public function test_unsafe_database_configuration_is_rejected_before_migrations(string $driver, string $database, string $host, string $unixSocket = ''): void
    {
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Pruebas detenidas: la conexión no es una base aislada autorizada.');
        $this->assertIsolatedDatabase([...compact('driver', 'database', 'host'), 'unix_socket' => $unixSocket]);
    }

    public function test_authorized_memory_and_mysql_qa_configurations_are_accepted(): void
    {
        $this->assertIsolatedDatabase(['driver' => 'sqlite', 'database' => ':memory:']);
        $this->assertIsolatedDatabase(['driver' => 'mysql', 'database' => 'bibliotecary_v3_qa', 'host' => 'db-test', 'unix_socket' => '']);
        $this->addToAssertionCount(2);
    }
}
