<?php

namespace App\Http\Controllers;

use App\Http\Requests\BorrowRequest;
use App\Models\CirculationRequest;
use App\Models\LibraryPolicy;
use App\Models\Member;
use App\Services\CirculationService;
use App\Services\LibraryCalendar;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class MyLibraryController extends Controller
{
    public function index(Request $request, LibraryCalendar $calendar): Response
    {
        $filters = $request->validate(['view' => ['nullable', Rule::in(['loans', 'requests', 'history'])], 'page' => ['nullable', 'integer', 'min:1', 'max:100000']]);
        $view = $filters['view'] ?? 'loans';
        $member = Member::where('user_id', $request->user()->id)->first();
        $terms = LibraryPolicy::current()->terms();
        $today = $calendar->today($terms)->toDateString();

        return Inertia::render('my-library/index', [
            'member' => $member?->only(['id', 'card_number', 'status', 'expires_on', 'phone', 'loan_limit']),
            'requests' => $member && $view === 'requests' ? $member->requests()->with(['book', 'allocation.copy'])->latest('id')->paginate(12)->withQueryString() : null,
            'loans' => $member && $view !== 'requests' ? $member->loans()->with('copy.book')->when($view === 'history', fn ($query) => $query->where('status', '!=', 'active'), fn ($query) => $query->where('status', 'active'))->latest('id')->paginate(12)->withQueryString() : null,
            'stats' => $member ? [
                'active' => $member->loans()->where('status', 'active')->count(),
                'overdue' => $member->loans()->where('status', 'active')->whereDate('due_on', '<', $today)->count(),
                'requests' => $member->requests()->whereIn('status', CirculationRequest::OPEN)->count(),
            ] : null,
            'view' => $view, 'today' => $today, 'timezone' => $terms['timezone'],
        ]);
    }

    public function store(BorrowRequest $request, CirculationService $service): RedirectResponse
    {
        $service->requestBook($request->user(), $request->integer('book_id'));

        return redirect()->route('my-library', ['view' => 'requests'])->with('success', 'Solicitud registrada. El personal debe validarla y confirmar después la entrega física.');
    }

    public function cancel(Request $request, int $requestId, CirculationService $service): RedirectResponse
    {
        $record = CirculationRequest::findOrFail($requestId);
        Gate::authorize('cancel', $record);
        $service->cancel($request->user(), $requestId);

        return back()->with('success', 'Solicitud cancelada.');
    }
}
