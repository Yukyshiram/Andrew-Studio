<?php

namespace App\Http\Controllers;

use App\Http\Requests\LibraryPolicyRequest;
use App\Models\AuditEvent;
use App\Models\CirculationRequest;
use App\Models\LibraryPolicy;
use App\Models\Loan;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class LibraryPolicyController extends Controller
{
    public function edit(): Response
    {
        Gate::authorize('admin');

        return Inertia::render('policies/edit', ['policy' => LibraryPolicy::current()->terms()]);
    }

    public function update(LibraryPolicyRequest $request): RedirectResponse
    {
        DB::transaction(function () use ($request): void {
            $policy = LibraryPolicy::lockForUpdate()->findOrFail(1);
            Gate::forUser(User::findOrFail($request->user()->id))->authorize('admin');
            $data = $request->validated();
            if ($data['timezone'] !== $policy->timezone && (Loan::where('status', 'active')->exists() || CirculationRequest::whereIn('status', CirculationRequest::OPEN)->exists())) {
                throw ValidationException::withMessages(['timezone' => 'Cierra los préstamos y solicitudes abiertos antes de cambiar la zona horaria.']);
            }
            if ($data['currency'] !== $policy->currency && Loan::exists()) {
                throw ValidationException::withMessages(['currency' => 'La moneda no puede cambiar después del primer préstamo; se requiere una migración financiera explícita.']);
            }
            $data['closed_weekdays'] = array_map('intval', $data['closed_weekdays']);
            $before = $policy->terms();
            $policy->fill($data);
            $policy->version++;
            $policy->save();
            AuditEvent::record('policy.updated', $policy, ['before' => $before, 'after' => $policy->terms()]);
        });

        return back()->with('success', 'Política actualizada. Los préstamos existentes conservan sus condiciones.');
    }
}
