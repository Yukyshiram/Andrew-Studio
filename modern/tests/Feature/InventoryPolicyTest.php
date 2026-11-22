<?php

namespace Tests\Feature;

use App\Models\Book;
use App\Models\BookCopy;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;
use Inertia\Testing\AssertableInertia as Assert;
use PHPUnit\Framework\Attributes\TestWith;
use Tests\TestCase;

class InventoryPolicyTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    #[TestWith(['reader', false, false])]
    #[TestWith(['librarian', true, false])]
    #[TestWith(['admin', true, true])]
    public function test_role_matrix_preserves_least_privilege(string $role, bool $circulation, bool $policies): void
    {
        $gate = Gate::forUser(User::factory()->create(['role' => $role]));
        $this->assertSame($circulation, $gate->allows('circulate'));
        $this->assertSame($policies, $gate->allows('admin'));
    }

    public function test_management_requires_authentication_and_reader_cannot_access_inventory(): void
    {
        $this->get('/manage/inventory')->assertRedirect('/login');
        $this->post('/manage/inventory', [])->assertRedirect('/login');
        $this->actingAs(User::factory()->create())->get('/manage/inventory')->assertForbidden();
        $this->post('/manage/inventory', [])->assertForbidden();
    }

    public function test_staff_adds_individual_copies_without_treating_a_title_as_stock(): void
    {
        $staff = User::factory()->create(['role' => 'librarian']);
        $book = Book::factory()->create();
        $this->assertSame(0, $book->copies()->count());
        $fields = ['book_id' => $book->id, 'barcode' => 'AB-0001', 'location' => 'Estante A', 'condition' => 'good', 'status' => 'available', 'id' => 999];
        $this->actingAs($staff)->post('/manage/inventory', $fields)->assertRedirect()->assertSessionHasNoErrors();
        $this->post('/manage/inventory', [...$fields, 'barcode' => 'AB-0002'])->assertSessionHasNoErrors();
        $this->assertSame(2, $book->copies()->count());
        $copy = BookCopy::where('barcode', 'AB-0001')->sole();
        $this->assertNotSame(999, $copy->id);
        $this->assertDatabaseHas('audit_events', ['action' => 'copy.created', 'subject_id' => $copy->id, 'user_id' => $staff->id]);
        $this->get('/manage/inventory?q=AB-0001')->assertInertia(fn (Assert $page) => $page->component('inventory/index')->has('copies.data', 1));
    }

    public function test_inventory_rejects_duplicates_impossible_conditions_and_reassignment_of_a_copy(): void
    {
        $copy = BookCopy::factory()->create();
        $fields = $copy->only(['book_id', 'barcode', 'location', 'condition', 'status']);
        $this->actingAs(User::factory()->create(['role' => 'librarian']))->post('/manage/inventory', $fields)->assertSessionHasErrors('barcode');
        $this->post('/manage/inventory', [...$fields, 'barcode' => 'NEW-1', 'condition' => 'damaged'])->assertSessionHasErrors(['status' => 'Un ejemplar dañado o extraviado no puede estar disponible.']);
        $this->put('/manage/inventory/'.$copy->id, $fields)->assertSessionHasErrors('book_id');
        $copy->update(['status' => 'held']);
        unset($fields['book_id']);
        $this->put('/manage/inventory/'.$copy->id, $fields)->assertSessionHasErrors('status');
        $this->assertDatabaseHas('book_copies', ['id' => $copy->id, 'status' => 'held']);
    }
}
