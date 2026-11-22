<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Hash;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class UserAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    private const PASSWORD = 'LecturaSegura2026!';

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    /**
     * @param  array<string, string>  $overrides
     * @return array<string, string>
     */
    private function accountFields(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Cuenta administrada',
            'email' => 'administrada@example.test',
            'password' => self::PASSWORD,
            'password_confirmation' => self::PASSWORD,
            'role' => 'reader',
        ], $overrides);
    }

    /** @return array<string, array{string}> */
    public static function nonAdministrativeRoles(): array
    {
        return [
            'lector' => ['reader'],
            'bibliotecario' => ['librarian'],
        ];
    }

    /** @return array<string, array{string, bool}> */
    public static function permissionRoles(): array
    {
        return [
            'lector' => ['reader', false],
            'bibliotecario' => ['librarian', false],
            'administrador' => ['admin', true],
        ];
    }

    #[DataProvider('permissionRoles')]
    public function test_user_policy_reserves_administration_for_admin(string $role, bool $allowed): void
    {
        $actor = User::factory()->create(['role' => $role]);
        $target = User::factory()->create(['role' => 'reader']);
        $gate = Gate::forUser($actor);

        foreach (['viewAny', 'create'] as $ability) {
            $this->assertSame($allowed, $gate->allows($ability, User::class), $role.' / '.$ability);
        }

        foreach (['update', 'delete'] as $ability) {
            $this->assertSame($allowed, $gate->allows($ability, $target), $role.' / '.$ability);
        }
    }

    public function test_guests_cannot_manage_users_or_read_audit_events(): void
    {
        $target = User::factory()->create(['role' => 'reader']);

        $this->get('/manage/users')->assertRedirect('/login');
        $this->get('/manage/audit')->assertRedirect('/login');
        $this->post('/manage/users', $this->accountFields())->assertRedirect('/login');
        $this->patch('/manage/users/'.$target->id, ['role' => 'admin'])->assertRedirect('/login');
        $this->delete('/manage/users/'.$target->id)->assertRedirect('/login');

        $this->assertSame('reader', $target->fresh()->role);
        $this->assertFalse($target->fresh()->trashed());
        $this->assertDatabaseCount('users', 1);
    }

    #[DataProvider('nonAdministrativeRoles')]
    public function test_readers_and_librarians_cannot_manage_accounts_or_audit(string $role): void
    {
        $target = User::factory()->create(['role' => 'reader']);
        $actor = User::factory()->create(['role' => $role]);
        $this->actingAs($actor);

        $this->get('/manage/users')->assertForbidden();
        $this->get('/manage/audit')->assertForbidden();
        $this->post('/manage/users', $this->accountFields())->assertForbidden();
        $this->patch('/manage/users/'.$target->id, ['role' => 'admin'])->assertForbidden();
        $this->delete('/manage/users/'.$target->id)->assertForbidden();

        $this->assertSame('reader', $target->fresh()->role);
        $this->assertFalse($target->fresh()->trashed());
        $this->assertDatabaseCount('users', 2);
    }

    public function test_admin_can_create_librarian_with_hashed_password(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin)->post('/manage/users', $this->accountFields([
            'role' => 'librarian',
        ]))->assertRedirect()->assertSessionHasNoErrors();

        $user = User::query()->where('email', 'administrada@example.test')->sole();
        $this->assertSame('librarian', $user->role);
        $this->assertTrue(Hash::check(self::PASSWORD, $user->password));
        $this->assertNotSame(self::PASSWORD, $user->password);
    }

    public function test_admin_can_promote_another_user_and_soft_deactivate_it(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $target = User::factory()->create(['role' => 'reader']);

        $this->actingAs($admin)->patch('/manage/users/'.$target->id, [
            'role' => 'librarian',
        ])->assertRedirect()->assertSessionHasNoErrors();

        $this->assertSame('librarian', $target->fresh()->role);

        $this->delete('/manage/users/'.$target->id)->assertRedirect()->assertSessionHasNoErrors();

        $this->assertSoftDeleted('users', ['id' => $target->id]);
        $this->assertNull(User::query()->find($target->id));
        $this->assertDatabaseCount('users', 2);
    }

    public function test_admin_cannot_change_own_role_or_deactivate_own_account(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin)->patch('/manage/users/'.$admin->id, [
            'role' => 'reader',
        ])->assertForbidden();

        $this->assertSame('admin', $admin->fresh()->role);

        $this->delete('/manage/users/'.$admin->id)->assertForbidden();

        $this->assertFalse($admin->fresh()->trashed());
        $this->assertSame(2, User::query()->where('role', 'admin')->count());
    }

    public function test_invalid_role_cannot_be_created_or_assigned(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $target = User::factory()->create(['role' => 'reader']);

        $this->actingAs($admin)->post('/manage/users', $this->accountFields([
            'role' => 'superadmin',
        ]))->assertSessionHasErrors('role');

        $this->patch('/manage/users/'.$target->id, ['role' => 'superadmin'])->assertSessionHasErrors('role');

        $this->assertSame('reader', $target->fresh()->role);
        $this->assertDatabaseCount('users', 2);
    }

    public function test_a_demoted_user_loses_administrative_access_on_next_request(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $target = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin)->patch('/manage/users/'.$target->id, ['role' => 'reader'])
            ->assertRedirect()->assertSessionHasNoErrors();

        $this->assertSame('admin', $admin->fresh()->role);
        $this->assertSame(1, User::query()->where('role', 'admin')->count());

        $this->actingAs($target->fresh())->get('/manage/users')->assertForbidden();
        $this->get('/manage/audit')->assertForbidden();
    }

    public function test_admin_lists_and_audit_are_authorized_without_exposing_passwords(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $reader = User::factory()->create(['role' => 'reader']);

        $response = $this->actingAs($admin)->get('/manage/users')->assertOk();
        $response->assertDontSee($reader->password, false);
        $response->assertDontSee($admin->password, false);
        $this->get('/manage/audit')->assertOk();
    }
}
