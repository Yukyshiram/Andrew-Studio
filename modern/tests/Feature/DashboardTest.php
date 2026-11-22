<?php

namespace Tests\Feature;

use App\Models\Acquisition;
use App\Models\Book;
use App\Models\BookCopy;
use App\Models\FinancialEntry;
use App\Models\LibraryPolicy;
use App\Models\Loan;
use App\Models\Member;
use App\Models\User;
use App\Services\CirculationService;
use App\Services\DashboardService;
use App\Services\LedgerService;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        $this->travelTo(CarbonImmutable::parse('2026-11-22T02:00:00Z'));
        LibraryPolicy::current()->update(['timezone' => 'America/Mexico_City', 'closed_weekdays' => [], 'max_loans' => 5]);
    }

    private function loan(User $reader, User $staff): Loan
    {
        Member::enroll($reader);
        $copy = BookCopy::factory()->create();
        $service = app(CirculationService::class);
        $request = $service->requestBook($reader, $copy->book_id);
        $service->prepare($staff, $request->id);

        return $service->issue($staff, $request->id);
    }

    /** @return array{User, User, User} */
    private function scenario(): array
    {
        $reader = User::factory()->create(['name' => 'Lector de prueba']);
        $other = User::factory()->create(['name' => 'Persona ajena privada']);
        $admin = User::factory()->create(['role' => 'admin']);
        $first = $this->loan($reader, $admin);
        $second = $this->loan($reader, $admin);
        $foreign = $this->loan($other, $admin);
        $closed = $this->loan($other, $admin);
        $service = app(CirculationService::class);
        $service->receive($admin, $closed->id, 'good');
        $service->requestBook($reader, Book::factory()->create()->id);
        $waiting = $service->requestBook($reader, Book::factory()->create()->id);
        $service->prepare($admin, $waiting->id);
        $readyCopy = BookCopy::factory()->create();
        $ready = $service->requestBook($other, $readyCopy->book_id);
        $service->prepare($admin, $ready->id);
        $first->update(['due_on' => '2026-11-20']);
        $second->update(['due_on' => '2026-11-21']);
        $foreign->update(['due_on' => '2026-11-19']);
        BookCopy::factory()->create();
        BookCopy::factory()->create(['status' => 'repair', 'condition' => 'damaged']);
        $archivedCopy = BookCopy::factory()->create();
        $archivedCopy->book->delete();
        Acquisition::factory()->create(['expected_on' => '2026-12-01']);
        Acquisition::factory()->create(['status' => 'cancelled']);
        $archived = Acquisition::factory()->create();
        $archived->book->delete();
        $ledger = app(LedgerService::class);
        $member = Member::where('user_id', $reader->id)->sole();
        $ledger->manual($admin, $member->id, 'adjustment', 10001, (string) Str::uuid(), 'Saldo ficticio de prueba');
        $ledger->manual($admin, $member->id, 'payment', 5001, (string) Str::uuid(), 'Pago ficticio de prueba');
        $ledger->manual($admin, Member::where('user_id', $other->id)->sole()->id, 'adjustment', 200, (string) Str::uuid(), 'Otro saldo ficticio');

        return [$reader, $other, $admin];
    }

    public function test_reader_summary_is_private_and_read_only(): void
    {
        [$reader, $other] = $this->scenario();
        $before = FinancialEntry::count();
        $response = $this->actingAs($reader)->get('/dashboard');
        $response->assertOk()->assertInertia(fn (Assert $page) => $page->component('dashboard')
            ->where('reading.active', 2)->where('reading.overdue', 1)->where('reading.requests', 2)->where('reading.ready', 0)
            ->where('reading.account.balance_cents', 5000)->has('reading.nextDue', 2)
            ->where('operations', null)->where('treasury', null)->has('activity', 0)
            ->where('today', '2026-11-21')->where('timezone', 'America/Mexico_City')->has('upcoming', 1));
        $response->assertDontSee($other->name)->assertDontSee($other->email)->assertDontSee(Member::where('user_id', $other->id)->value('card_number'));
        $this->assertSame($before, FinancialEntry::count());
    }

    public function test_librarian_counts_real_operations_without_receiving_treasury_data(): void
    {
        $this->scenario();
        $librarian = User::factory()->create(['role' => 'librarian']);
        $this->actingAs($librarian)->get('/dashboard')->assertInertia(fn (Assert $page) => $page
            ->where('reading', null)->where('treasury', null)->has('activity', 0)
            ->where('operations.active', 3)->where('operations.overdue', 2)->where('operations.due_today', 1)
            ->where('operations.pending', 1)->where('operations.waiting', 1)->where('operations.ready', 1)
            ->where('operations.available', 2)->where('operations.upcoming', 1)->has('operations.urgentLoans', 3));
    }

    public function test_administrator_sees_database_financial_period_and_catalogue_totals(): void
    {
        [, , $admin] = $this->scenario();
        $this->actingAs($admin)->get('/dashboard')->assertInertia(fn (Assert $page) => $page
            ->where('stats.books', Book::count())->where('stats.users', User::count())
            ->where('treasury.payments_cents', 5001)->where('treasury.net_payments_cents', 5001)
            ->where('treasury.reversed_payments_cents', 0)->where('treasury.current_recorded_balance_cents', 5200)
            ->where('currency', 'MXN')->has('activity', 6));
    }

    public function test_missing_membership_is_not_replaced_with_invented_loan_numbers(): void
    {
        $this->get('/dashboard')->assertRedirect('/login');
        $this->actingAs(User::factory()->create())->get('/dashboard')->assertInertia(fn (Assert $page) => $page
            ->where('reading', null)->where('operations', null)->where('treasury', null)->has('upcoming', 0));
    }

    public function test_service_rechecks_current_role_before_returning_global_information(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        User::whereKey($admin->id)->update(['role' => 'reader']);
        $data = app(DashboardService::class)->for($admin);
        $this->assertNull($data['operations']);
        $this->assertNull($data['treasury']);
    }
}
