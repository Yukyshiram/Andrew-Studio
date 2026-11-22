<?php

namespace Tests\Feature;

use App\Models\Acquisition;
use App\Models\AuditEvent;
use App\Models\Book;
use App\Models\BookCopy;
use App\Models\CirculationRequest;
use App\Models\FinancialEntry;
use App\Models\LibraryPolicy;
use App\Models\Loan;
use App\Models\Member;
use App\Models\User;
use Carbon\CarbonImmutable;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\DemoSeeder;
use Database\Seeders\LibraryDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\TestWith;
use RuntimeException;
use Tests\TestCase;

class LibraryDemoSeederTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo(CarbonImmutable::parse('2026-11-22T02:00:00Z'));
    }

    public function test_complete_synthetic_sample_has_consistent_inventory_loans_money_and_news(): void
    {
        config(['bibliotecary.demo_seed_enabled' => true]);
        $clock = now()->toIso8601String();
        $this->seed(LibraryDemoSeeder::class);
        $this->assertSame($clock, now()->toIso8601String());
        $this->assertDatabaseCount('users', 6);
        $this->assertDatabaseCount('books', 25);
        $this->assertDatabaseCount('members', 4);
        $this->assertDatabaseCount('book_copies', 6);
        $this->assertSame(3, BookCopy::where('status', 'available')->count());
        $this->assertSame(2, Loan::where('status', 'active')->count());
        $this->assertSame(1, Loan::where('status', 'returned')->count());
        $this->assertSame(1, Loan::where('status', 'active')->where('due_on', '<', '2026-11-21')->count());
        foreach (['pending', 'waiting', 'ready'] as $status) {
            $this->assertSame(1, CirculationRequest::where('status', $status)->count());
        }
        $this->assertSame(6, Acquisition::where('is_fictional', true)->count());
        $this->assertGreaterThan(0, FinancialEntry::where('kind', 'overdue')->count());
        $this->assertSame(1, FinancialEntry::where('kind', 'payment')->count());
        $this->assertGreaterThan(0, (int) FinancialEntry::sum('amount_cents'));
        $this->assertSame(25, LibraryPolicy::current()->daily_fine_cents);
        $this->assertTrue(AuditEvent::where('action', 'demo.v3.seeded')->sole()->metadata['fictional']);
        foreach (Loan::with(['copy', 'member.user'])->get() as $loan) {
            $this->assertTrue($loan->checked_out_at->greaterThan($loan->member->created_at));
            $this->assertTrue($loan->checked_out_at->greaterThan($loan->member->user->created_at));
            $this->assertTrue($loan->checked_out_at->greaterThan($loan->copy->created_at));
            $this->assertGreaterThan($loan->checked_out_at->toDateString(), $loan->due_on->toDateString());
        }
        $announced = Acquisition::where('status', 'announced')->sole();
        $this->assertSame($announced->publication_on->format('Y'), $announced->book->publication_year);
        $this->assertSame(0, $announced->book->copies()->count());
        $this->assertTrue($announced->expected_on->greaterThan($announced->publication_on));
    }

    public function test_repeating_the_sample_does_not_reset_dates_operations_accounts_or_policy(): void
    {
        config(['bibliotecary.demo_seed_enabled' => true]);
        $this->seed(LibraryDemoSeeder::class);
        $tables = ['users', 'books', 'members', 'book_copies', 'loans', 'circulation_requests', 'financial_entries', 'acquisitions', 'audit_events'];
        $before = array_map(fn ($table) => DB::table($table)->count(), $tables);
        $policy = LibraryPolicy::current()->toArray();
        $loans = Loan::orderBy('id')->get()->toJson();
        $this->seed(LibraryDemoSeeder::class);
        $this->assertSame($before, array_map(fn ($table) => DB::table($table)->count(), $tables));
        $this->assertSame($policy, LibraryPolicy::current()->toArray());
        $this->assertSame($loans, Loan::orderBy('id')->get()->toJson());
    }

    #[TestWith(['production', true])]
    #[TestWith(['testing', false])]
    public function test_default_seeder_creates_no_account_without_local_explicit_opt_in(string $environment, bool $enabled): void
    {
        config(['bibliotecary.demo_seed_enabled' => $enabled]);
        $this->app->instance('env', $environment);
        try {
            (new DatabaseSeeder)->setContainer($this->app)->run();
            $this->fail('El seeding debía quedar deshabilitado.');
        } catch (RuntimeException $exception) {
            $this->assertStringContainsString('requiere entorno', $exception->getMessage());
        } finally {
            $this->app->instance('env', 'testing');
        }
        $this->assertDatabaseCount('users', 0);
        $this->assertDatabaseCount('books', 0);
    }

    #[TestWith(['account'])]
    #[TestWith(['inventory'])]
    #[TestWith(['member'])]
    #[TestWith(['policy'])]
    #[TestWith(['acquisition'])]
    #[TestWith(['roles'])]
    #[TestWith(['deleted'])]
    #[TestWith(['legacy_user'])]
    #[TestWith(['legacy_book'])]
    public function test_existing_data_is_preserved_instead_of_being_converted_into_a_demo(string $kind): void
    {
        config(['bibliotecary.demo_seed_enabled' => true]);
        $this->seed(DemoSeeder::class);
        $staff = User::where('role', 'librarian')->sole();
        if ($kind === 'account') {
            User::factory()->create(['email' => 'cuenta.conservada@example.test']);
        } elseif ($kind === 'inventory') {
            BookCopy::factory()->create(['book_id' => Book::first()->id]);
        } elseif ($kind === 'member') {
            Member::enroll($staff);
        } elseif ($kind === 'policy') {
            LibraryPolicy::current()->forceFill(['version' => 2, 'daily_fine_cents' => 123])->save();
        } elseif ($kind === 'acquisition') {
            Acquisition::factory()->create(['book_id' => Book::first()->id, 'created_by' => $staff->id]);
        } elseif ($kind === 'roles') {
            $staff->update(['role' => 'reader']);
        } elseif ($kind === 'legacy_user') {
            $staff->update(['legacy_id' => 41]);
        } elseif ($kind === 'legacy_book') {
            Book::first()->update(['legacy_id' => 83]);
        } else {
            $staff->delete();
        }
        $before = [User::withTrashed()->count(), Book::withTrashed()->count(), BookCopy::count(), Member::count(), Acquisition::count(), AuditEvent::count(), LibraryPolicy::current()->toArray()];
        try {
            $this->seed(LibraryDemoSeeder::class);
            $this->fail('La muestra no debía modificar una base con datos existentes.');
        } catch (RuntimeException $exception) {
            $this->assertStringContainsString($kind === 'roles' ? 'cuentas' : 'base sintética nueva', $exception->getMessage());
        }
        $this->assertSame($before, [User::withTrashed()->count(), Book::withTrashed()->count(), BookCopy::count(), Member::count(), Acquisition::count(), AuditEvent::count(), LibraryPolicy::current()->toArray()]);
    }
}
