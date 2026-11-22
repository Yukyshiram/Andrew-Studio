<?php

namespace Tests\Feature;

use App\Models\AuditEvent;
use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

class AuthSecurityTest extends TestCase
{
    use RefreshDatabase;

    private const PASSWORD = 'LecturaSegura2026!';

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
        Cache::flush();
    }

    public function test_registration_hashes_password_and_cannot_assign_administrative_role(): void
    {
        $this->post('/register', [
            'name' => 'Lector de prueba',
            'email' => 'lector@example.test',
            'password' => self::PASSWORD,
            'password_confirmation' => self::PASSWORD,
            'role' => 'admin',
            'email_verified_at' => now()->toDateTimeString(),
        ])->assertRedirect()->assertSessionHasNoErrors();

        $user = User::query()->where('email', 'lector@example.test')->sole();

        $this->assertSame('reader', $user->role);
        $this->assertNotSame(self::PASSWORD, $user->password);
        $this->assertTrue(Hash::check(self::PASSWORD, $user->password));
        $this->assertNull($user->email_verified_at);
        $this->assertArrayNotHasKey('password', $user->toArray());
        $this->assertArrayNotHasKey('remember_token', $user->toArray());
    }

    public function test_registration_rejects_invalid_email_weak_password_and_mismatched_confirmation(): void
    {
        $this->post('/register', [
            'name' => 'Prueba',
            'email' => 'correo-invalido',
            'password' => 'corta',
            'password_confirmation' => 'distinta',
        ])->assertSessionHasErrors(['email', 'password']);

        $this->assertDatabaseCount('users', 0);
    }

    public function test_registration_rejects_an_array_in_place_of_email(): void
    {
        $this->post('/register', [
            'name' => 'Prueba',
            'email' => ['unexpected' => 'array@example.test'],
            'password' => self::PASSWORD,
            'password_confirmation' => self::PASSWORD,
        ])->assertSessionHasErrors('email');

        $this->assertDatabaseCount('users', 0);
    }

    public function test_registration_rejects_password_over_bcrypt_byte_limit_without_a_server_error(): void
    {
        $password = str_repeat('Á', 40).'Lectura2026!';
        $this->assertGreaterThan(72, strlen($password));

        $this->post('/register', [
            'name' => 'Prueba de Unicode',
            'email' => 'unicode@example.test',
            'password' => $password,
            'password_confirmation' => $password,
        ])->assertSessionHasErrors('password');

        $this->assertDatabaseCount('users', 0);
    }

    public function test_registration_rejects_duplicate_email_without_overwriting_existing_user(): void
    {
        $existing = User::factory()->create(['email' => 'existente@example.test']);
        $oldPassword = $existing->password;

        $this->post('/register', [
            'name' => 'Otra persona',
            'email' => $existing->email,
            'password' => self::PASSWORD,
            'password_confirmation' => self::PASSWORD,
        ])->assertSessionHasErrors('email');

        $this->assertDatabaseCount('users', 1);
        $this->assertSame($oldPassword, $existing->fresh()->password);
    }

    public function test_successful_login_rotates_session_identifier(): void
    {
        $user = User::factory()->create(['password' => Hash::make(self::PASSWORD)]);

        $this->get('/login')->assertOk();
        $oldSessionId = session()->getId();

        $this->post('/login', [
            'email' => $user->email,
            'password' => self::PASSWORD,
        ])->assertRedirect()->assertSessionHasNoErrors();

        $this->assertAuthenticatedAs($user);
        $this->assertNotSame($oldSessionId, session()->getId());
    }

    public function test_wrong_password_and_unknown_account_have_the_same_public_error(): void
    {
        $user = User::factory()->create(['password' => Hash::make(self::PASSWORD)]);

        $this->post('/login', [
            'email' => $user->email,
            'password' => 'Incorrecta2026!',
        ])->assertSessionHasErrors('email');
        $wrongPasswordError = session('errors')->first('email');
        $this->assertGuest();

        $this->post('/login', [
            'email' => 'desconocido@example.test',
            'password' => 'Incorrecta2026!',
        ])->assertSessionHasErrors('email');

        $this->assertSame($wrongPasswordError, session('errors')->first('email'));
        $this->assertGuest();
    }

    public function test_login_rate_limit_prevents_authentication_after_five_failed_attempts(): void
    {
        $this->freezeTime();
        $user = User::factory()->create(['password' => Hash::make(self::PASSWORD)]);

        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->post('/login', [
                'email' => $user->email,
                'password' => 'Incorrecta2026!',
            ])->assertSessionHasErrors('email');
        }

        $this->post('/login', [
            'email' => $user->email,
            'password' => self::PASSWORD,
        ])->assertSessionHasErrors('email');
        $this->assertGuest();

        $this->travel(61)->seconds();

        $this->post('/login', [
            'email' => $user->email,
            'password' => self::PASSWORD,
        ])->assertRedirect()->assertSessionHasNoErrors();
        $this->assertAuthenticatedAs($user);
    }

    public function test_logout_requires_post_and_clears_authentication(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $this->get('/logout')->assertMethodNotAllowed();
        $this->assertAuthenticatedAs($user);

        $this->post('/logout')->assertRedirect();
        $this->assertGuest();
        $this->get('/dashboard')->assertRedirect('/login');
    }

    public function test_soft_deleted_user_cannot_authenticate(): void
    {
        $user = User::factory()->create(['password' => Hash::make(self::PASSWORD)]);
        $user->delete();

        $this->post('/login', [
            'email' => $user->email,
            'password' => self::PASSWORD,
        ])->assertSessionHasErrors('email');

        $this->assertGuest();
    }

    public function test_password_reset_request_does_not_enumerate_accounts(): void
    {
        Notification::fake();
        $user = User::factory()->create();

        $known = $this->from('/forgot-password')->post('/forgot-password', ['email' => $user->email]);
        $known->assertRedirect()->assertSessionHasNoErrors();
        $knownStatus = session('status');

        $unknown = $this->from('/forgot-password')->post('/forgot-password', ['email' => 'ausente@example.test']);
        $unknown->assertRedirect()->assertSessionHasNoErrors();

        $this->assertNotEmpty($knownStatus);
        $this->assertSame($knownStatus, session('status'));
        Notification::assertSentTo($user, ResetPassword::class);
    }

    public function test_password_reset_token_can_be_used_only_once_and_preserves_role(): void
    {
        $this->freezeTime();
        $user = User::factory()->create([
            'role' => 'reader',
            'password' => Hash::make(self::PASSWORD),
        ]);
        $token = Password::broker()->createToken($user);
        $newPassword = 'OtraLectura2026!';
        $fields = [
            'token' => $token,
            'email' => $user->email,
            'password' => $newPassword,
            'password_confirmation' => $newPassword,
            'role' => 'admin',
        ];

        $this->post('/reset-password', $fields)->assertRedirect()->assertSessionHasNoErrors();

        $user->refresh();
        $this->assertTrue(Hash::check($newPassword, $user->password));
        $this->assertFalse(Hash::check(self::PASSWORD, $user->password));
        $this->assertSame('reader', $user->role);

        $fields['password'] = $fields['password_confirmation'] = 'TerceraLectura2026!';
        $this->post('/reset-password', $fields)->assertSessionHasErrors('email');

        $this->assertTrue(Hash::check($newPassword, $user->fresh()->password));
    }

    public function test_expired_password_reset_token_is_rejected(): void
    {
        $this->freezeTime();
        $user = User::factory()->create(['password' => Hash::make(self::PASSWORD)]);
        $token = Password::broker()->createToken($user);
        $expiration = (int) config('auth.passwords.users.expire', 60);
        $this->travel($expiration + 1)->minutes();

        $this->post('/reset-password', [
            'token' => $token,
            'email' => $user->email,
            'password' => 'NuevaLectura2026!',
            'password_confirmation' => 'NuevaLectura2026!',
        ])->assertSessionHasErrors('email');

        $this->assertTrue(Hash::check(self::PASSWORD, $user->fresh()->password));
    }

    public function test_profile_update_cannot_change_role_and_rejects_duplicate_email(): void
    {
        $user = User::factory()->create(['role' => 'reader']);
        $other = User::factory()->create();

        $this->actingAs($user)->patch('/profile', [
            'name' => 'Nombre actualizado',
            'email' => $user->email,
            'role' => 'admin',
        ])->assertRedirect()->assertSessionHasNoErrors();

        $this->assertSame('reader', $user->fresh()->role);
        $this->assertSame('Nombre actualizado', $user->fresh()->name);

        $this->patch('/profile', [
            'name' => 'Duplicado',
            'email' => $other->email,
        ])->assertSessionHasErrors('email');

        $this->assertNotSame($other->email, $user->fresh()->email);
    }

    public function test_password_change_requires_current_password_and_hashes_replacement(): void
    {
        $user = User::factory()->create(['password' => Hash::make(self::PASSWORD)]);
        $newPassword = 'NuevoCapitulo2026!';

        $this->actingAs($user)->put('/profile/password', [
            'current_password' => 'Incorrecta2026!',
            'password' => $newPassword,
            'password_confirmation' => $newPassword,
        ])->assertSessionHasErrors('current_password');

        $this->assertTrue(Hash::check(self::PASSWORD, $user->fresh()->password));

        $this->put('/profile/password', [
            'current_password' => self::PASSWORD,
            'password' => $newPassword,
            'password_confirmation' => $newPassword,
        ])->assertRedirect()->assertSessionHasNoErrors();

        $this->assertTrue(Hash::check($newPassword, $user->fresh()->password));
        $this->assertFalse(Hash::check(self::PASSWORD, $user->fresh()->password));
    }

    public function test_authentication_audit_records_events_without_credentials(): void
    {
        $user = User::factory()->create(['password' => Hash::make(self::PASSWORD)]);

        $this->post('/login', [
            'email' => $user->email,
            'password' => self::PASSWORD,
        ])->assertRedirect()->assertSessionHasNoErrors();
        $this->post('/logout')->assertRedirect();
        $this->post('/login', [
            'email' => $user->email,
            'password' => 'Incorrecta2026!',
        ])->assertSessionHasErrors('email');

        $this->assertDatabaseHas('audit_events', ['action' => 'auth.login', 'user_id' => $user->id]);
        $this->assertDatabaseHas('audit_events', ['action' => 'auth.logout', 'user_id' => $user->id]);
        $this->assertDatabaseHas('audit_events', ['action' => 'auth.failed']);
        $events = AuditEvent::query()->get();
        $this->assertCount(3, $events);
        $serialized = $events->toJson();
        $this->assertStringNotContainsString(self::PASSWORD, $serialized);
        $this->assertStringNotContainsString('Incorrecta2026!', $serialized);
        $this->assertStringNotContainsString($user->password, $serialized);
        $this->assertStringNotContainsString($user->remember_token, $serialized);
    }
}
