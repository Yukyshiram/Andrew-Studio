<?php

namespace App\Http\Controllers;

use App\Http\Requests\MemberRequest;
use App\Models\AuditEvent;
use App\Models\LibraryPolicy;
use App\Models\Member;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class MemberController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('circulate');
        $filters = $request->validate(['q' => ['nullable', 'string', 'max:80'], 'page' => ['nullable', 'integer', 'min:1']]);
        $members = Member::with('user:id,name,email,deleted_at')->when($filters['q'] ?? '', function ($query, $term): void {
            $query->where(function ($query) use ($term): void {
                $query->where('card_number', 'like', '%'.$term.'%')->orWhereHas('user', fn ($user) => $user->where('name', 'like', '%'.$term.'%')->orWhere('email', 'like', '%'.$term.'%'));
            });
        })->orderBy('id')->paginate(12)->withQueryString();

        $accounts = User::whereDoesntHave('member')->when($filters['q'] ?? '', fn ($query, $term) => $query->where(fn ($query) => $query->where('name', 'like', '%'.$term.'%')->orWhere('email', 'like', '%'.$term.'%')))->orderBy('name')->limit(50)->get(['id', 'name', 'email']);

        return Inertia::render('members/index', ['members' => $members, 'accounts' => $accounts, 'filters' => ['q' => $filters['q'] ?? '']]);
    }

    public function store(MemberRequest $request): RedirectResponse
    {
        DB::transaction(function () use ($request): void {
            LibraryPolicy::lockForUpdate()->findOrFail(1);
            $member = Member::enroll(User::findOrFail($request->validated('user_id')));
            $member->update($request->safe()->except('user_id'));
            AuditEvent::record('member.enrolled', $member);
        });

        return back()->with('success', 'Socio registrado.');
    }

    public function update(MemberRequest $request, Member $member): RedirectResponse
    {
        DB::transaction(function () use ($request, $member): void {
            LibraryPolicy::lockForUpdate()->findOrFail(1);
            $member->update($request->validated());
            AuditEvent::record('member.updated', $member, ['status' => $member->status, 'loan_limit' => $member->loan_limit]);
        });

        return back()->with('success', 'Membresía actualizada.');
    }
}
