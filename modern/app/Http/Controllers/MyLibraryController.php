<?php

namespace App\Http\Controllers;

use App\Http\Requests\BorrowRequest;
use App\Models\CirculationRequest;
use App\Models\LibraryNotice;
use App\Models\LibraryPolicy;
use App\Models\Member;
use App\Services\CirculationService;
use App\Services\LedgerService;
use App\Services\LibraryCalendar;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class MyLibraryController extends Controller
{
    public function index(Request $request, LibraryCalendar $calendar, LedgerService $ledger): Response
    {
        $filters = $request->validate(['view' => ['nullable', Rule::in(['loans', 'requests', 'history', 'notices', 'finance'])], 'page' => ['nullable', 'integer', 'min:1', 'max:100000']]);
        $view = $filters['view'] ?? 'loans';
        $member = Member::where('user_id', $request->user()->id)->first();
        $terms = LibraryPolicy::current()->terms();
        $today = $calendar->today($terms)->toDateString();

        return Inertia::render('my-library/index', [
            'member' => $member?->only(['id', 'card_number', 'status', 'expires_on', 'phone', 'loan_limit']),
            'requests' => $member && $view === 'requests' ? $member->requests()->withQueuePosition()->with(['book', 'allocation.copy'])->latest('id')->paginate(12)->withQueryString() : null,
            'loans' => $member && in_array($view, ['loans', 'history'], true) ? $member->loans()->with('copy.book')->when($view === 'history', fn ($query) => $query->where('status', '!=', 'active'), fn ($query) => $query->where('status', 'active'))->latest('id')->paginate(12)->withQueryString() : null,
            'notices' => $member && $view === 'notices' ? LibraryNotice::where('member_id', $member->id)->latest('id')->paginate(12)->withQueryString() : null,
            'account' => $member && $view === 'finance' ? $ledger->summary($member) : null,
            'entries' => $member && $view === 'finance' ? $member->entries()->with(['actor:id,name', 'reversal:id,reversal_of'])->latest('id')->paginate(20)->withQueryString() : null,
            'stats' => $member ? [
                'active' => $member->loans()->where('status', 'active')->count(),
                'overdue' => $member->loans()->where('status', 'active')->whereDate('due_on', '<', $today)->count(),
                'requests' => $member->requests()->whereIn('status', CirculationRequest::OPEN)->count(),
                'unread' => LibraryNotice::where('member_id', $member->id)->whereNull('read_at')->count(),
            ] : null,
            'view' => $view, 'today' => $today, 'timezone' => $terms['timezone'],
        ]);
    }

    public function refreshFinance(Request $request, LedgerService $ledger): RedirectResponse
    {
        $request->validate(['member_id' => ['prohibited'], 'amount_cents' => ['prohibited']]);
        $member = Member::where('user_id', $request->user()->id)->firstOrFail();
        $created = $ledger->assessMember($member->id, $request->user());

        return back()->with('success', 'Cargos nuevos registrados: '.$created.'.');
    }

    public function readNotice(Request $request, int $noticeId): RedirectResponse
    {
        $notice = LibraryNotice::where('member_id', Member::where('user_id', $request->user()->id)->value('id'))->findOrFail($noticeId);
        LibraryNotice::whereKey($notice->id)->whereNull('read_at')->update(['read_at' => now()->utc()]);

        return back()->with('success', 'Aviso marcado como leído.');
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
