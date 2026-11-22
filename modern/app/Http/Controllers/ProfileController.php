<?php

namespace App\Http\Controllers;

use App\Models\AuditEvent;
use App\Rules\BcryptLength;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    public function edit(Request $request): Response
    {
        return Inertia::render('profile', ['user' => $request->user()->only(['id', 'name', 'email', 'role'])]);
    }

    public function update(Request $request): RedirectResponse
    {
        $user = $request->user();
        if (is_string($request->input('email'))) {
            $request->merge(['email' => mb_strtolower(trim($request->input('email')))]);
        }
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'string', 'email', 'max:191', Rule::unique('users')->ignore($user->id)],
            'current_password' => ['nullable', 'string', 'current_password'],
        ]);
        if ($user->email !== $data['email'] && empty($data['current_password'])) {
            throw ValidationException::withMessages(['current_password' => 'Confirma tu contraseña actual para cambiar el correo.']);
        }
        DB::transaction(function () use ($user, $data): void {
            if ($user->email !== $data['email']) {
                $user->email_verified_at = null;
            }
            $user->fill(['name' => $data['name'], 'email' => $data['email']])->save();
            AuditEvent::record('user.profile_updated', $user);
        });

        return back()->with('success', 'Perfil actualizado.');
    }

    public function password(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'current_password' => ['required', 'string', 'current_password'],
            'password' => ['required', 'string', 'confirmed', Password::min(12)->mixedCase()->numbers(), new BcryptLength],
        ]);
        DB::transaction(function () use ($request, $data): void {
            $request->user()->forceFill(['password' => $data['password'], 'remember_token' => Str::random(60)])->save();
            DB::table('sessions')->where('user_id', $request->user()->id)->where('id', '!=', $request->session()->getId())->delete();
            AuditEvent::record('user.password_changed', $request->user());
        });
        $request->session()->regenerate(true);

        return back()->with('success', 'Contraseña actualizada. Se cerraron las otras sesiones.');
    }
}
