<?php

namespace App\Http\Controllers;

use App\Http\Requests\LibraryPolicyRequest;
use App\Models\AuditEvent;
use App\Models\LibraryPolicy;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
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
            $data = $request->validated();
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
