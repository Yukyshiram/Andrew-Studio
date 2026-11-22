<?php

namespace Tests\Feature;

use App\Models\BookCopy;
use App\Models\CirculationRequest;
use App\Models\Loan;
use App\Models\Member;
use App\Models\User;
use App\Services\CirculationService;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;
use Inertia\Testing\AssertableInertia as Assert;
use PHPUnit\Framework\Attributes\TestWith;
use Tests\TestCase;

class CirculationHttpTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    private function reader(): User
    {
        $user = User::factory()->create();
        Member::enroll($user);

        return $user;
    }

    public function test_circulation_requires_authentication_and_staff_routes_reject_readers(): void
    {
        $this->get('/my-library')->assertRedirect('/login');
        $this->post('/my-library/requests', [])->assertRedirect('/login');
        $this->get('/manage/circulation')->assertRedirect('/login');
        $this->actingAs($this->reader())->get('/manage/circulation')->assertForbidden();
        $this->post('/manage/circulation/requests/999/prepare')->assertForbidden();
        $this->post('/manage/circulation/requests/999/issue')->assertForbidden();
        $this->post('/manage/circulation/requests/999/reject', ['reason' => 'Manipulación'])->assertForbidden();
        $this->post('/manage/circulation/loans/999/receive', ['condition' => 'good'])->assertForbidden();
    }

    public function test_reader_and_staff_complete_a_real_loan_and_availability_changes_only_at_the_correct_steps(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-11-20T18:00:00Z'));
        $reader = $this->reader();
        $staff = User::factory()->create(['role' => 'librarian']);
        $copy = BookCopy::factory()->create();
        $this->get('/catalog/'.$copy->book_id)->assertInertia(fn (Assert $page) => $page->where('book.available_copies', 1)->where('book.total_copies', 1));
        $this->actingAs($reader)->post('/my-library/requests', ['book_id' => $copy->book_id])->assertRedirect('/my-library?view=requests')->assertSessionHasNoErrors();
        $request = CirculationRequest::sole();
        $this->assertSame('pending', $request->status);
        $this->assertDatabaseCount('loans', 0);
        $this->get('/my-library?view=requests')->assertInertia(fn (Assert $page) => $page->component('my-library/index')->has('requests.data', 1)->where('requests.data.0.member_id', $request->member_id));
        $this->actingAs($staff)->post('/manage/circulation/requests/'.$request->id.'/prepare')->assertSessionHasNoErrors();
        $this->get('/catalog/'.$copy->book_id)->assertInertia(fn (Assert $page) => $page->where('book.available_copies', 0));
        $this->assertDatabaseCount('loans', 0);
        $this->post('/manage/circulation/requests/'.$request->id.'/issue')->assertSessionHasNoErrors();
        $loan = Loan::sole();
        $this->assertSame('2026-12-04', $loan->due_on->toDateString());
        $this->actingAs($reader)->get('/my-library')->assertInertia(fn (Assert $page) => $page->has('loans.data', 1)->where('loans.data.0.due_on', '2026-12-04')->where('stats.active', 1));
        $this->actingAs($staff)->post('/manage/circulation/loans/'.$loan->id.'/receive', ['condition' => 'good'])->assertSessionHasNoErrors();
        $this->get('/catalog/'.$copy->book_id)->assertInertia(fn (Assert $page) => $page->where('book.available_copies', 1));
        $this->actingAs($reader)->get('/my-library?view=history')->assertInertia(fn (Assert $page) => $page->has('loans.data', 1)->where('loans.data.0.status', 'returned')->where('stats.active', 0));
    }

    public function test_readers_cannot_supply_another_member_copy_status_or_due_date(): void
    {
        $copy = BookCopy::factory()->create();
        $this->actingAs($this->reader())->post('/my-library/requests', [
            'book_id' => $copy->book_id, 'member_id' => 999, 'copy_id' => $copy->id,
            'status' => 'fulfilled', 'due_on' => '2099-12-31', 'issued_by' => 1,
        ])->assertSessionHasErrors(['member_id', 'copy_id', 'status', 'due_on', 'issued_by']);
        $this->assertDatabaseCount('circulation_requests', 0);
        $this->assertSame('available', $copy->fresh()->status);
    }

    public function test_personal_library_cannot_be_switched_to_another_member_by_query_parameters(): void
    {
        $owner = $this->reader();
        $other = $this->reader();
        $staff = User::factory()->create(['role' => 'librarian']);
        $copy = BookCopy::factory()->create();
        $service = app(CirculationService::class);
        $request = $service->requestBook($owner, $copy->book_id);
        $service->prepare($staff, $request->id);
        $service->issue($staff, $request->id);
        $this->actingAs($other)->get('/my-library?member_id='.$request->member_id)->assertInertia(fn (Assert $page) => $page->has('loans.data', 0)->where('member.id', $other->member->id));
        $this->get('/my-library?view=requests&user_id='.$owner->id)->assertInertia(fn (Assert $page) => $page->has('requests.data', 0));
        $this->post('/my-library/requests/'.$request->id.'/cancel')->assertNotFound();
        $this->assertSame('fulfilled', $request->fresh()->status);
    }

    public function test_old_account_without_membership_is_explained_and_cannot_borrow(): void
    {
        $reader = User::factory()->create();
        $copy = BookCopy::factory()->create();
        $this->actingAs($reader)->get('/my-library')->assertInertia(fn (Assert $page) => $page->where('member', null)->where('stats', null));
        $this->post('/my-library/requests', ['book_id' => $copy->book_id])->assertForbidden();
        $this->assertDatabaseCount('members', 0);
    }

    public function test_staff_cannot_backdate_a_return_or_change_the_borrower_and_due_date(): void
    {
        $reader = $this->reader();
        $staff = User::factory()->create(['role' => 'librarian']);
        $copy = BookCopy::factory()->create();
        $service = app(CirculationService::class);
        $request = $service->requestBook($reader, $copy->book_id);
        $service->prepare($staff, $request->id);
        $loan = $service->issue($staff, $request->id);
        $this->actingAs($staff)->post('/manage/circulation/loans/'.$loan->id.'/receive', [
            'condition' => 'good', 'returned_at' => '1900-01-01', 'due_on' => '2099-01-01', 'member_id' => 999, 'status' => 'returned',
        ])->assertSessionHasErrors(['returned_at', 'due_on', 'member_id', 'status']);
        $this->assertSame('active', $loan->fresh()->status);
        $this->assertNull($loan->fresh()->returned_at);
    }

    #[TestWith(['reader', false])]
    #[TestWith(['librarian', true])]
    #[TestWith(['admin', true])]
    public function test_record_policies_distinguish_owned_records_and_staff_permissions(string $role, bool $staffAccess): void
    {
        $reader = $this->reader();
        $actor = User::factory()->create(['role' => $role]);
        $staff = User::factory()->create(['role' => 'librarian']);
        $copy = BookCopy::factory()->create();
        $service = app(CirculationService::class);
        $request = $service->requestBook($reader, $copy->book_id);
        $service->prepare($staff, $request->id);
        $loan = $service->issue($staff, $request->id);
        $gate = Gate::forUser($actor);
        $this->assertSame($staffAccess, $gate->allows('view', $loan));
        $this->assertSame($staffAccess, $gate->allows('receive', $loan));
        $this->assertSame($staffAccess, $gate->allows('view', $request));
        $this->assertSame($staffAccess, $gate->allows('manage', $request));
        $this->assertTrue(Gate::forUser($reader)->allows('view', $loan));
        $this->assertTrue(Gate::forUser($reader)->allows('cancel', $request));
        $this->assertFalse(Gate::forUser($reader)->allows('receive', $loan));
    }
}
