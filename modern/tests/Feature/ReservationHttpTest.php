<?php

namespace Tests\Feature;

use App\Models\Book;
use App\Models\BookCopy;
use App\Models\LibraryNotice;
use App\Models\Loan;
use App\Models\Member;
use App\Models\User;
use App\Services\CirculationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ReservationHttpTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    /** @return array{User, User, Loan} */
    private function loan(): array
    {
        $reader = User::factory()->create();
        Member::enroll($reader);
        $staff = User::factory()->create(['role' => 'librarian']);
        $copy = BookCopy::factory()->create();
        $service = app(CirculationService::class);
        $request = $service->requestBook($reader, $copy->book_id);
        $service->prepare($staff, $request->id);

        return [$reader, $staff, $service->issue($staff, $request->id)];
    }

    public function test_renewal_requires_authentication_ownership_and_valid_unmodified_payload(): void
    {
        [$reader, $staff, $loan] = $this->loan();
        $url = '/my-library/loans/'.$loan->id.'/renew';
        $this->post($url)->assertRedirect('/login');
        $stranger = User::factory()->create();
        $this->actingAs($stranger)->post($url, ['operation_key' => (string) Str::uuid()])->assertNotFound();
        $this->actingAs($reader)->post($url, ['operation_key' => 'invalid'])->assertSessionHasErrors('operation_key');
        $this->post($url, ['operation_key' => (string) Str::uuid(), 'due_on' => '2099-01-01', 'terms' => ['max_renewals' => 99]])->assertSessionHasErrors(['due_on', 'terms']);
        $this->post('/manage/circulation/loans/'.$loan->id.'/renew', ['operation_key' => (string) Str::uuid()])->assertForbidden();
        $data = ['operation_key' => (string) Str::uuid()];
        $this->actingAs($reader)->from('/my-library')->post($url, $data)->assertRedirect('/my-library')->assertSessionHasNoErrors();
        $this->post($url, $data)->assertSessionHasNoErrors();
        $this->assertSame(1, $loan->fresh()->renewal_count);
        $this->actingAs($staff)->post('/manage/circulation/loans/'.$loan->id.'/renew', ['operation_key' => (string) Str::uuid()])->assertSessionHasNoErrors();
        $this->assertSame(2, $loan->fresh()->renewal_count);
        $this->assertDatabaseCount('loan_renewals', 2);
    }

    public function test_notices_are_private_paginated_and_read_timestamp_is_idempotent(): void
    {
        [$reader, , $loan] = $this->loan();
        $notice = LibraryNotice::where('member_id', $loan->member_id)->firstOrFail();
        $stranger = User::factory()->create();
        $other = Member::enroll($stranger);
        LibraryNotice::create(['member_id' => $other->id, 'event_key' => 'foreign', 'kind' => 'qa', 'message' => 'Privado ajeno']);
        $this->actingAs($reader)->get('/my-library?view=notices')->assertInertia(fn (Assert $page) => $page
            ->component('my-library/index')->has('notices.data', 2)->where('stats.unread', 2)->missing('notices.data.0.event_key')->where('loans', null));
        $this->actingAs($stranger)->post('/my-library/notices/'.$notice->id.'/read')->assertNotFound();
        $this->actingAs($reader)->post('/my-library/notices/'.$notice->id.'/read')->assertSessionHasNoErrors();
        $readAt = $notice->fresh()->read_at;
        $this->travel(2)->hours();
        $this->post('/my-library/notices/'.$notice->id.'/read')->assertSessionHasNoErrors();
        $this->assertTrue($readAt->equalTo($notice->fresh()->read_at));
        $this->get('/my-library?view=notices')->assertInertia(fn (Assert $page) => $page->where('stats.unread', 1));
    }

    public function test_inventory_creation_and_repair_assign_waiting_reservations_without_a_new_approval(): void
    {
        $staff = User::factory()->create(['role' => 'librarian']);
        $reader = User::factory()->create();
        Member::enroll($reader);
        $book = Book::factory()->create();
        $service = app(CirculationService::class);
        $request = $service->requestBook($reader, $book->id);
        $service->prepare($staff, $request->id);
        $this->actingAs($staff)->post('/manage/inventory', ['book_id' => $book->id, 'barcode' => 'QA-AUTO-1', 'location' => 'Sala QA', 'condition' => 'good', 'status' => 'available'])->assertSessionHasNoErrors();
        $this->assertSame('ready', $request->fresh()->status);
        $service->cancel($reader, $request->id);
        $copy = BookCopy::where('barcode', 'QA-AUTO-1')->firstOrFail();
        $copy->update(['status' => 'repair', 'condition' => 'damaged']);
        $next = $service->requestBook($reader, $book->id);
        $service->prepare($staff, $next->id);
        $this->put('/manage/inventory/'.$copy->id, ['barcode' => $copy->barcode, 'location' => 'Sala QA', 'condition' => 'good', 'status' => 'available'])->assertSessionHasNoErrors();
        $this->assertSame('ready', $next->fresh()->status);
        $this->assertSame('held', $copy->fresh()->status);
    }

    public function test_only_staff_can_run_reservation_maintenance(): void
    {
        $this->post('/manage/circulation/refresh')->assertRedirect('/login');
        $this->actingAs(User::factory()->create())->post('/manage/circulation/refresh')->assertForbidden();
        $this->actingAs(User::factory()->create(['role' => 'librarian']))->from('/manage/circulation')->post('/manage/circulation/refresh')->assertRedirect('/manage/circulation')->assertSessionHas('success', 'Recogidas vencidas: 0. Nuevos ejemplares preparados: 0.');
    }
}
