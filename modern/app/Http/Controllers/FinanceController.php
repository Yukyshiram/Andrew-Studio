<?php

namespace App\Http\Controllers;

use App\Http\Requests\FinancialEntryRequest;
use App\Http\Requests\ReverseFinancialEntryRequest;
use App\Models\LibraryPolicy;
use App\Models\Member;
use App\Services\FinanceReport;
use App\Services\LedgerService;
use App\Services\LibraryCalendar;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class FinanceController extends Controller
{
    public function index(Request $request, FinanceReport $report, LedgerService $ledger, LibraryCalendar $calendar): Response
    {
        Gate::authorize('admin');
        $filters = $request->validate([
            'from' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:1900-01-01'],
            'to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:1900-01-01'],
            'member_id' => ['nullable', 'integer', Rule::exists('members', 'id')],
            'q' => ['nullable', 'string', 'max:80'],
            'page' => ['nullable', 'integer', 'min:1', 'max:100000'],
            'members_page' => ['nullable', 'integer', 'min:1', 'max:100000'],
        ], ['date_format' => 'Usa una fecha válida con formato año-mes-día.', 'after_or_equal' => 'La fecha debe ser posterior a 1900.']);
        $today = $calendar->today(LibraryPolicy::current()->terms());
        $from = $filters['from'] ?? $today->startOfMonth()->toDateString();
        $through = $filters['to'] ?? $today->toDateString();
        if ($through < $from || CarbonImmutable::parse($from)->diffInDays(CarbonImmutable::parse($through)) > 365) {
            throw ValidationException::withMessages(['to' => 'Selecciona un periodo ordenado de hasta 366 días.']);
        }
        $memberId = isset($filters['member_id']) ? (int) $filters['member_id'] : null;
        $search = $filters['q'] ?? '';

        return DB::transaction(function () use ($from, $through, $memberId, $search, $ledger, $report): Response {
            $member = $memberId ? Member::with('user:id,name,email,deleted_at')->findOrFail($memberId) : null;
            $members = Member::with('user:id,name,email,deleted_at')->withSum('entries as ledger_balance_cents', 'amount_cents')
                ->when($search !== '', fn ($query) => $query->where(fn ($query) => $query->where('card_number', 'like', '%'.$search.'%')->orWhereHas('user', fn ($user) => $user->where('name', 'like', '%'.$search.'%'))))
                ->orderBy('id')->paginate(12, ['*'], 'members_page')->withQueryString();

            return Inertia::render('finance/index', [
                'members' => $members, 'member' => $member, 'account' => $member ? $ledger->summary($member) : null,
                'entries' => $report->entries($from, $through, $memberId, $search)->with(['member.user:id,name', 'actor:id,name', 'reversal:id,reversal_of'])->latest('id')->paginate(20)->withQueryString(),
                'report' => $report->period($from, $through, $memberId, $search),
                'currency' => LibraryPolicy::current()->currency,
                'filters' => ['q' => $search, 'from' => $from, 'to' => $through, 'member_id' => $memberId],
            ]);
        });
    }

    public function store(FinancialEntryRequest $request, LedgerService $ledger): RedirectResponse
    {
        $ledger->manual($request->user(), $request->integer('member_id'), $request->validated('kind'), $request->integer('amount_cents'),
            $request->validated('operation_key'), $request->validated('reason'), $request->validated('reference'));

        return back()->with('success', 'Movimiento registrado en el historial financiero.');
    }

    public function reverse(ReverseFinancialEntryRequest $request, int $entryId, LedgerService $ledger): RedirectResponse
    {
        $ledger->reverse($request->user(), $entryId, $request->validated('operation_key'), $request->validated('reason'));

        return back()->with('success', 'Reversión registrada; se conserva el movimiento original.');
    }

    public function refresh(Request $request, LedgerService $ledger): RedirectResponse
    {
        Gate::authorize('admin');
        $data = $request->validate(['member_id' => ['required', 'integer', Rule::exists('members', 'id')]]);
        $created = $ledger->assessMember((int) $data['member_id'], $request->user());

        return back()->with('success', 'Cargos nuevos registrados: '.$created.'.');
    }
}
