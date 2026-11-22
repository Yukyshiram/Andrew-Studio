<?php

namespace Tests\Feature;

use App\Models\AuditEvent;
use App\Models\BookCopy;
use App\Models\LibraryPolicy;
use App\Models\Member;
use App\Models\User;
use App\Services\CirculationService;
use App\Services\LedgerService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class LibraryPolicyTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    public function test_admin_changes_policy_with_audit_and_cannot_overwrite_version_or_id(): void
    {
        $this->actingAs(User::factory()->create(['role' => 'librarian']))->put('/manage/policy', [])->assertForbidden();
        $policy = LibraryPolicy::current();
        $this->assertSame(0, $policy->daily_fine_cents);
        $this->actingAs(User::factory()->create(['role' => 'admin']))->put('/manage/policy', [...$policy->terms(), 'loan_days' => 21, 'version' => 999, 'id' => 99])->assertSessionHasNoErrors();
        $this->assertDatabaseHas('library_policies', ['id' => 1, 'version' => 2, 'loan_days' => 21]);
        $event = AuditEvent::where('action', 'policy.updated')->sole();
        $this->assertSame(14, $event->metadata['before']['loan_days']);
        $this->assertSame(21, $event->metadata['after']['loan_days']);
    }

    public function test_policy_rejects_closed_every_day_negative_money_and_invalid_timezone(): void
    {
        $this->actingAs(User::factory()->create(['role' => 'admin']))->put('/manage/policy', [
            ...LibraryPolicy::current()->terms(), 'closed_weekdays' => [0, 1, 2, 3, 4, 5, 6], 'daily_fine_cents' => -1, 'timezone' => 'Fake/City',
        ])->assertSessionHasErrors(['closed_weekdays', 'daily_fine_cents', 'timezone']);
        $this->assertSame(1, LibraryPolicy::current()->version);
    }

    public function test_policy_cannot_reinterpret_open_dates_or_an_existing_loan_currency(): void
    {
        $reader = User::factory()->create();
        Member::enroll($reader);
        $admin = User::factory()->create(['role' => 'admin']);
        $copy = BookCopy::factory()->create();
        $service = app(CirculationService::class);
        $request = $service->requestBook($reader, $copy->book_id);
        $terms = LibraryPolicy::current()->terms();
        $this->actingAs($admin)->put('/manage/policy', [...$terms, 'timezone' => 'Europe/Madrid'])->assertSessionHasErrors('timezone');
        $service->prepare($admin, $request->id);
        $service->issue($admin, $request->id);
        $this->put('/manage/policy', [...$terms, 'currency' => 'EUR'])->assertSessionHasErrors('currency');
        $this->assertSame('MXN', LibraryPolicy::current()->currency);
        $this->assertSame('America/Mexico_City', LibraryPolicy::current()->timezone);
        $this->assertSame(1, LibraryPolicy::current()->version);
    }

    public function test_currency_cannot_change_after_a_manual_movement_even_without_loans(): void
    {
        $member = Member::factory()->create();
        $admin = User::factory()->create(['role' => 'admin']);
        app(LedgerService::class)->manual($admin, $member->id, 'adjustment', 100, (string) Str::uuid(), 'Cargo sintético QA');
        $this->assertDatabaseCount('loans', 0);
        $this->actingAs($admin)->put('/manage/policy', [...LibraryPolicy::current()->terms(), 'currency' => 'EUR'])->assertSessionHasErrors('currency');
        $this->assertSame('MXN', LibraryPolicy::current()->currency);
    }

    public function test_calendar_configuration_rejects_objects_instead_of_lists(): void
    {
        $this->actingAs(User::factory()->create(['role' => 'admin']))->put('/manage/policy', [
            ...LibraryPolicy::current()->terms(), 'closed_weekdays' => ['sunday' => 0], 'closure_dates' => ['holiday' => '2026-12-25'],
        ])->assertSessionHasErrors(['closed_weekdays', 'closure_dates']);
        $this->assertSame([0], LibraryPolicy::current()->closed_weekdays);
    }
}
