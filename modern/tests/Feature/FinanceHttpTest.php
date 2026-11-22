<?php

namespace Tests\Feature;

use App\Models\Member;
use App\Models\User;
use App\Services\LedgerService;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use PHPUnit\Framework\Attributes\TestWith;
use Tests\TestCase;

class FinanceHttpTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    private function payload(Member $member, array $overrides = []): array
    {
        return array_merge(['member_id' => $member->id, 'kind' => 'adjustment', 'amount_cents' => 10001,
            'operation_key' => (string) Str::uuid(), 'reason' => 'Cargo sintético QA', 'reference' => 'QA-1'], $overrides);
    }

    public function test_financial_endpoints_require_a_session(): void
    {
        $this->get('/manage/finance')->assertRedirect('/login');
        foreach (['/manage/finance/entries', '/manage/finance/entries/1/reverse', '/manage/finance/refresh', '/my-library/finance/refresh'] as $url) {
            $this->post($url)->assertRedirect('/login');
        }
    }

    #[TestWith(['reader'])]
    #[TestWith(['librarian'])]
    public function test_non_admin_roles_cannot_consult_or_modify_treasury(string $role): void
    {
        $this->actingAs(User::factory()->create(['role' => $role]))->get('/manage/finance')->assertForbidden();
        foreach (['/manage/finance/entries', '/manage/finance/entries/1/reverse', '/manage/finance/refresh'] as $url) {
            $this->post($url)->assertForbidden();
        }
        $this->assertDatabaseCount('financial_entries', 0);
    }

    public function test_admin_records_and_replays_exact_cents_and_report_serializes_numbers(): void
    {
        $member = Member::factory()->create();
        $admin = User::factory()->create(['role' => 'admin']);
        $payload = $this->payload($member, ['reason' => '<script>alert("qa")</script>']);
        $this->actingAs($admin)->from('/manage/finance')->post('/manage/finance/entries', $payload)->assertRedirect('/manage/finance')->assertSessionHasNoErrors();
        $this->post('/manage/finance/entries', $payload)->assertSessionHasNoErrors();
        $this->assertDatabaseCount('financial_entries', 1);
        $this->assertDatabaseHas('financial_entries', ['member_id' => $member->id, 'actor_id' => $admin->id, 'amount_cents' => 10001, 'reason' => $payload['reason']]);
        $this->get('/manage/finance?member_id='.$member->id)->assertInertia(fn (Assert $page) => $page
            ->component('finance/index')->where('account.balance_cents', 10001)->where('report.current_recorded_balance_cents', 10001)
            ->where('entries.data.0.amount_cents', 10001)->where('entries.data.0.reason', $payload['reason'])->missing('entries.data.0.event_key'));
    }

    public function test_validation_refuses_decimal_amounts_and_forged_financial_metadata(): void
    {
        $member = Member::factory()->create();
        $admin = User::factory()->create(['role' => 'admin']);
        $this->actingAs($admin)->post('/manage/finance/entries', $this->payload($member, ['amount_cents' => 1.25]))->assertSessionHasErrors(['amount_cents' => 'Escribe un número entero.']);
        $this->post('/manage/finance/entries', $this->payload($member, ['amount_cents' => 0]))->assertSessionHasErrors('amount_cents');
        $this->post('/manage/finance/entries', $this->payload($member, ['actor_id' => 999, 'currency' => 'USD', 'occurred_on' => '2000-01-01', 'created_at' => '2000-01-01', 'loan_id' => 999, 'reversal_of' => 999]))->assertSessionHasErrors(['actor_id', 'currency', 'occurred_on', 'created_at', 'loan_id', 'reversal_of']);
        $this->post('/manage/finance/entries', $this->payload($member, ['reason' => '', 'reference' => str_repeat('x', 101), 'operation_key' => 'bad', 'kind' => 'overdue']))->assertSessionHasErrors(['reason', 'reference', 'operation_key', 'kind']);
        $this->assertDatabaseCount('financial_entries', 0);
    }

    public function test_reader_can_only_consult_their_account_and_cannot_pay_themselves(): void
    {
        $member = Member::factory()->create();
        $other = Member::factory()->create();
        $admin = User::factory()->create(['role' => 'admin']);
        $ledger = app(LedgerService::class);
        $ledger->manual($admin, $member->id, 'adjustment', 100, (string) Str::uuid(), 'Cargo propio QA');
        $ledger->manual($admin, $other->id, 'adjustment', 900, (string) Str::uuid(), 'Privado de otra cuenta');
        $this->actingAs($member->user)->get('/my-library?view=finance&member_id='.$other->id)->assertInertia(fn (Assert $page) => $page
            ->component('my-library/index')->where('account.balance_cents', 100)->has('entries.data', 1)
            ->where('entries.data.0.member_id', $member->id)->missing('entries.data.0.event_key')->where('loans', null));
        $this->post('/manage/finance/entries', $this->payload($member, ['kind' => 'payment', 'amount_cents' => 100]))->assertForbidden();
        $this->post('/my-library/finance/refresh', ['member_id' => $other->id])->assertSessionHasErrors('member_id');
        $this->post('/my-library/finance/refresh', [])->assertSessionHasNoErrors();
        $this->assertSame(100, $ledger->summary($member)['balance_cents']);
        $this->assertSame(900, $ledger->summary($other)['balance_cents']);
    }

    public function test_admin_reverses_without_erasing_original_and_cannot_supply_another_amount(): void
    {
        $member = Member::factory()->create();
        $admin = User::factory()->create(['role' => 'admin']);
        $entry = app(LedgerService::class)->manual($admin, $member->id, 'adjustment', 100, (string) Str::uuid(), 'Cargo QA');
        $payload = ['operation_key' => (string) Str::uuid(), 'reason' => 'Corrección QA'];
        $url = '/manage/finance/entries/'.$entry->id.'/reverse';
        $this->actingAs($admin)->post($url, $payload + ['amount_cents' => -9999])->assertSessionHasErrors('amount_cents');
        $this->post($url, $payload)->assertSessionHasNoErrors();
        $this->post($url, $payload)->assertSessionHasNoErrors();
        $this->assertDatabaseHas('financial_entries', ['id' => $entry->id, 'amount_cents' => 100]);
        $this->assertDatabaseHas('financial_entries', ['reversal_of' => $entry->id, 'amount_cents' => -100, 'actor_id' => $admin->id]);
        $this->assertDatabaseCount('financial_entries', 2);
        $this->assertSame(0, app(LedgerService::class)->summary($member)['balance_cents']);
        $this->delete('/manage/finance/entries')->assertStatus(405);
    }

    public function test_report_separates_payments_and_reversals_by_civil_period_and_current_balance(): void
    {
        $member = Member::factory()->create(['card_number' => 'SOC-REPORT-QA']);
        $admin = User::factory()->create(['role' => 'admin']);
        $ledger = app(LedgerService::class);
        $this->travelTo(CarbonImmutable::parse('2026-11-20T18:00:00Z'));
        $ledger->manual($admin, $member->id, 'adjustment', 1000, (string) Str::uuid(), 'Cargo QA');
        $payment = $ledger->manual($admin, $member->id, 'payment', 300, (string) Str::uuid(), 'Pago QA');
        $this->travelTo(CarbonImmutable::parse('2026-11-21T18:00:00Z'));
        $ledger->reverse($admin, $payment->id, (string) Str::uuid(), 'Corrección de pago QA');
        $this->travelTo(CarbonImmutable::parse('2026-12-01T18:00:00Z'));
        $ledger->manual($admin, $member->id, 'credit', 100, (string) Str::uuid(), 'Abono QA');
        $this->actingAs($admin)->get('/manage/finance?from=2026-11-01&to=2026-11-30&member_id='.$member->id)->assertInertia(fn (Assert $page) => $page
            ->has('entries.data', 3)->where('report.payments_cents', 300)->where('report.reversed_payments_cents', 300)
            ->where('report.net_payments_cents', 0)->where('report.net_cents', 1000)->where('report.current_recorded_balance_cents', 900));
        $this->get('/manage/finance?from=2026-11-21&to=2026-11-21&q=SOC-REPORT-QA')->assertInertia(fn (Assert $page) => $page
            ->has('entries.data', 1)->where('report.payments_cents', 0)->where('report.reversed_payments_cents', 300)->where('report.net_payments_cents', -300));
        $this->get('/manage/finance?q='.urlencode("' OR 1=1 --"))->assertInertia(fn (Assert $page) => $page->has('entries.data', 0)->has('members.data', 0));
    }

    #[TestWith(['from=2026-01-01&to=2025-01-01', 'to'])]
    #[TestWith(['from=2020-01-01&to=2026-01-01', 'to'])]
    #[TestWith(['from=not-a-date', 'from'])]
    #[TestWith(['page=100001', 'page'])]
    #[TestWith(['members_page=0', 'members_page'])]
    public function test_reports_reject_invalid_periods_and_unbounded_pages(string $query, string $field): void
    {
        $this->actingAs(User::factory()->create(['role' => 'admin']))->getJson('/manage/finance?'.$query)->assertUnprocessable()->assertJsonValidationErrors($field);
    }

    public function test_a_leap_year_is_allowed_but_a_367_day_period_is_rejected(): void
    {
        $this->actingAs(User::factory()->create(['role' => 'admin']))->get('/manage/finance?from=2024-01-01&to=2024-12-31')->assertOk();
        $this->getJson('/manage/finance?from=2024-01-01&to=2025-01-01')->assertUnprocessable()->assertJsonValidationErrors('to');
    }

    public function test_account_history_paginates_without_losing_the_full_balance(): void
    {
        $member = Member::factory()->create();
        $admin = User::factory()->create(['role' => 'admin']);
        $ledger = app(LedgerService::class);
        for ($i = 0; $i < 22; $i++) {
            $ledger->manual($admin, $member->id, 'adjustment', 1, (string) Str::uuid(), 'Cargo QA '.$i);
        }
        $this->actingAs($member->user)->get('/my-library?view=finance')->assertInertia(fn (Assert $page) => $page->has('entries.data', 20)->where('entries.total', 22)->where('account.balance_cents', 22));
        $this->get('/my-library?view=finance&page=2')->assertInertia(fn (Assert $page) => $page->has('entries.data', 2)->where('account.balance_cents', 22));
    }
}
