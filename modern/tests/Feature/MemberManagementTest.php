<?php

namespace Tests\Feature;

use App\Models\Member;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class MemberManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    public function test_membership_data_and_writes_are_restricted_to_staff(): void
    {
        $member = Member::factory()->create();
        $this->get('/manage/members')->assertRedirect('/login');
        $this->post('/manage/members', [])->assertRedirect('/login');
        $this->actingAs(User::factory()->create())->get('/manage/members')->assertForbidden();
        $this->put('/manage/members/'.$member->id, ['status' => 'suspended'])->assertForbidden();
        $this->assertSame('active', $member->fresh()->status);
    }

    public function test_staff_enrolls_and_suspends_members_without_changing_identity_or_role(): void
    {
        $reader = User::factory()->create();
        $this->actingAs(User::factory()->create(['role' => 'librarian']))->post('/manage/members', ['user_id' => $reader->id, 'status' => 'active', 'role' => 'admin'])->assertSessionHasNoErrors();
        $member = Member::where('user_id', $reader->id)->sole();
        $this->put('/manage/members/'.$member->id, ['status' => 'suspended', 'phone' => '5550000000', 'loan_limit' => 0, 'role' => 'admin'])->assertSessionHasNoErrors();
        $this->assertDatabaseHas('members', ['id' => $member->id, 'status' => 'suspended', 'loan_limit' => 0]);
        $this->assertSame('reader', $reader->fresh()->role);
        $this->assertSame($member->id, Member::enroll($reader)->id);
        $this->assertDatabaseCount('members', 1);
        $this->get('/manage/members?q='.$member->card_number)->assertInertia(fn (Assert $page) => $page->has('members.data', 1));
    }
}
