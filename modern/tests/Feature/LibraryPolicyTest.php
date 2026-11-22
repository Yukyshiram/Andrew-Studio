<?php

namespace Tests\Feature;

use App\Models\AuditEvent;
use App\Models\LibraryPolicy;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
}
