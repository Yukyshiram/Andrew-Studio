<?php

namespace App\Http\Controllers;

use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Models\AuditEvent;
use App\Models\User;
use App\Rules\BcryptLength;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(RegisterRequest $request): RedirectResponse
    {
        $user = DB::transaction(fn () => User::create([...$request->validated(), 'role' => 'reader']));
        event(new Registered($user));
        Auth::login($user);
        $request->session()->regenerate();
        AuditEvent::record('user.registered', $user);

        return redirect()->route('dashboard')->with('success', 'Tu biblioteca de ideas empieza aquí. Bienvenid@.');
    }

    public function login(LoginRequest $request): RedirectResponse
    {
        $email = mb_strtolower(trim($request->validated('email')));
        $key = hash('sha256', $email.'|'.$request->ip());
        if (RateLimiter::tooManyAttempts($key, 5)) {
            throw ValidationException::withMessages(['email' => 'Demasiados intentos. Inténtalo de nuevo en '.RateLimiter::availableIn($key).' segundos.']);
        }
        $credentials = ['email' => $email, 'password' => $request->validated('password')];
        if (! Auth::attempt($credentials, $request->boolean('remember'))) {
            RateLimiter::hit($key, 60);
            AuditEvent::record('auth.failed');
            throw ValidationException::withMessages(['email' => 'El correo o la contraseña no son correctos.']);
        }
        RateLimiter::clear($key);
        $request->session()->regenerate();
        AuditEvent::record('auth.login', $request->user());

        return redirect()->intended(route('dashboard'));
    }

    public function logout(Request $request): RedirectResponse
    {
        AuditEvent::record('auth.logout', $request->user());
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('home')->with('success', 'Sesión cerrada. Hasta la próxima lectura.');
    }

    public function forgotPassword(Request $request): RedirectResponse
    {
        $validated = $request->validate(['email' => ['required', 'string', 'email', 'max:191']]);
        $validated['email'] = mb_strtolower(trim($validated['email']));
        Password::sendResetLink($validated);

        return back()->with('success', __('passwords.sent'))->with('status', __('passwords.sent'));
    }

    public function resetPassword(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'token' => ['required', 'string', 'max:255'], 'email' => ['required', 'string', 'email', 'max:191'],
            'password' => ['required', 'string', 'confirmed', PasswordRule::min(12)->mixedCase()->numbers(), new BcryptLength],
        ]);
        $validated['email'] = mb_strtolower(trim($validated['email']));
        $validated['password_confirmation'] = $request->input('password_confirmation');
        $status = Password::reset($validated, function (User $user, string $password): void {
            $user->forceFill(['password' => Hash::make($password), 'remember_token' => Str::random(60)])->save();
            DB::table('sessions')->where('user_id', $user->id)->delete();
            AuditEvent::record('auth.password_reset', $user);
            event(new PasswordReset($user));
        });
        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages(['email' => __('passwords.token')]);
        }

        return redirect()->route('login')->with('success', __('passwords.reset'));
    }
}
