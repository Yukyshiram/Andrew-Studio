<?php

namespace Tests\Feature;

use App\Models\AuditEvent;
use App\Models\BookCopy;
use App\Models\CirculationRequest;
use App\Models\LibraryPolicy;
use App\Models\Loan;
use App\Models\Member;
use App\Models\User;
use App\Services\CirculationService;
use Illuminate\Foundation\Testing\DatabaseMigrations;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\Group;
use Symfony\Component\Process\Process;
use Tests\TestCase;

#[Group('mysql')]
class MySqlCirculationConcurrencyTest extends TestCase
{
    use DatabaseMigrations;

    protected function setUp(): void
    {
        if (getenv('APP_ENV') !== 'testing' || getenv('DB_DATABASE') !== 'bibliotecary_v3_qa' || getenv('DB_HOST') !== 'db-test') {
            $this->markTestSkipped('Concurrencia real: ejecuta scripts/test-mysql.ps1 con el MySQL QA aislado.');
        }
        parent::setUp();
        $this->assertSame('mysql', config('database.default'));
        $this->assertSame('bibliotecary_v3_qa', DB::connection()->getDatabaseName());
    }

    /** @param list<array{string, int, int}> $jobs @return list<array{id: int, status: string}> */
    private function concurrently(array $jobs): array
    {
        $processes = [];
        DB::beginTransaction();
        LibraryPolicy::lockForUpdate()->findOrFail(1);
        try {
            foreach ($jobs as [$action, $actor, $request]) {
                $process = new Process([PHP_BINARY, base_path('tests/Support/circulation-worker.php'), $action, (string) $actor, (string) $request], base_path(), timeout: 20);
                $process->start();
                $processes[] = $process;
                $this->assertTrue($process->waitUntil(fn (string $type, string $output): bool => $type === Process::OUT && str_contains($output, 'ready')), $process->getErrorOutput());
            }
            foreach ($processes as $process) {
                $this->assertTrue($process->isRunning(), 'Ambos procesos deben permanecer vivos mientras la política está bloqueada.');
            }
            DB::commit();
            $results = [];
            foreach ($processes as $process) {
                $this->assertSame(0, $process->wait(), $process->getErrorOutput());
                $lines = explode("\n", trim($process->getOutput()));
                $results[] = json_decode(end($lines), true, flags: JSON_THROW_ON_ERROR);
            }

            return $results;
        } finally {
            if (DB::transactionLevel() > 0) {
                DB::rollBack();
            }
            foreach ($processes as $process) {
                if ($process->isRunning()) {
                    $process->stop();
                }
            }
        }
    }

    public function test_simultaneous_preparations_and_deliveries_preserve_one_copy_and_one_loan(): void
    {
        $staff = User::factory()->create(['role' => 'librarian']);
        $first = User::factory()->create();
        $second = User::factory()->create();
        Member::enroll($first);
        Member::enroll($second);
        $copy = BookCopy::factory()->create();
        $service = app(CirculationService::class);
        $a = $service->requestBook($first, $copy->book_id);
        $b = $service->requestBook($second, $copy->book_id);
        $this->concurrently([['prepare', $staff->id, $a->id], ['prepare', $staff->id, $b->id]]);
        $this->assertSame(1, CirculationRequest::where('status', 'ready')->count());
        $this->assertSame(1, CirculationRequest::where('status', 'waiting')->count());
        $this->assertDatabaseCount('copy_allocations', 1);
        $ready = CirculationRequest::where('status', 'ready')->sole();
        $results = $this->concurrently([['issue', $staff->id, $ready->id], ['issue', $staff->id, $ready->id]]);
        $this->assertSame($results[0]['id'], $results[1]['id']);
        $this->assertDatabaseCount('loans', 1);
        $this->assertSame(1, Loan::where('active_copy_id', $copy->id)->count());
        $this->assertSame(1, AuditEvent::where('action', 'loan.issued')->count());
        $this->assertSame('loaned', $copy->fresh()->status);
    }
}
