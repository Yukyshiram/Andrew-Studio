<?php

namespace App\Http\Controllers;

use App\Http\Requests\AdminUserRequest;
use App\Models\AuditEvent;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', User::class);
        $filters = $request->validate(['q' => ['nullable', 'string', 'max:100'], 'page' => ['nullable', 'integer', 'min:1', 'max:100000']]);
        $query = User::query()->select(['id', 'name', 'email', 'role', 'created_at', 'deleted_at']);
        if ($q = ($filters['q'] ?? '')) {
            $query->where(fn ($query) => $query->where('name', 'like', '%'.$q.'%')->orWhere('email', 'like', '%'.$q.'%'));
        }

        return Inertia::render('users/index', ['users' => $query->latest('id')->paginate(15)->withQueryString(), 'filters' => ['q' => $filters['q'] ?? '']]);
    }

    public function store(AdminUserRequest $request): RedirectResponse
    {
        DB::transaction(function () use ($request): void {
            $user = User::create($request->safe()->only(['name', 'email', 'password', 'role']));
            AuditEvent::record('user.created', $user, ['role' => $user->role]);
        });

        return back()->with('success', 'Cuenta creada con los permisos seleccionados.');
    }

    public function update(AdminUserRequest $request, User $user): RedirectResponse
    {
        DB::transaction(function () use ($request, $user): void {
            $admins = User::where('role', 'admin')->lockForUpdate()->get(['id']);
            $target = User::whereKey($user->id)->lockForUpdate()->firstOrFail();
            if ($target->isAdmin() && $request->validated('role') !== 'admin' && $admins->count() <= 1) {
                throw ValidationException::withMessages(['role' => 'Debe conservarse al menos una cuenta administradora activa.']);
            }
            $previous = $target->role;
            $target->update(['role' => $request->validated('role')]);
            AuditEvent::record('user.role_changed', $target, ['previous' => $previous, 'role' => $target->role]);
        });

        return back()->with('success', 'Permisos actualizados.');
    }

    public function destroy(User $user): RedirectResponse
    {
        Gate::authorize('delete', $user);
        DB::transaction(function () use ($user): void {
            $admins = User::where('role', 'admin')->lockForUpdate()->get(['id']);
            $target = User::whereKey($user->id)->lockForUpdate()->firstOrFail();
            if ($target->isAdmin() && $admins->count() <= 1) {
                throw ValidationException::withMessages(['user' => 'Debe conservarse al menos una cuenta administradora activa.']);
            }
            $target->forceFill(['remember_token' => null])->save();
            $target->delete();
            DB::table('sessions')->where('user_id', $target->id)->delete();
            DB::table('password_reset_tokens')->where('email', $target->email)->delete();
            AuditEvent::record('user.deactivated', $target);
        });

        return back()->with('success', 'Cuenta desactivada. Se conservaron sus datos e historial.');
    }
}
