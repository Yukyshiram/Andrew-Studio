<?php

namespace App\Http\Controllers;

use App\Http\Requests\ReturnRequest;
use App\Models\BookCopy;
use App\Models\CirculationRequest;
use App\Models\LibraryPolicy;
use App\Models\Loan;
use App\Services\CirculationService;
use App\Services\LibraryCalendar;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class CirculationController extends Controller
{
    public function index(Request $request, LibraryCalendar $calendar): Response
    {
        Gate::authorize('circulate');
        $filters = $request->validate([
            'view' => ['nullable', Rule::in(['requests', 'loans', 'history'])],
            'status' => ['nullable', Rule::in(CirculationRequest::STATES)],
            'q' => ['nullable', 'string', 'max:80'], 'page' => ['nullable', 'integer', 'min:1', 'max:100000'],
        ]);
        $view = $filters['view'] ?? 'requests';
        $today = $calendar->today(LibraryPolicy::current()->terms())->toDateString();
        $requests = CirculationRequest::with(['book', 'member.user:id,name,email', 'allocation.copy'])->whereIn('status', ! empty($filters['status']) ? [$filters['status']] : CirculationRequest::OPEN)
            ->when($filters['q'] ?? '', fn ($query, $q) => $query->where(fn ($query) => $query->whereHas('book', fn ($book) => $book->where('title', 'like', '%'.$q.'%'))->orWhereHas('member', fn ($member) => $member->where('card_number', 'like', '%'.$q.'%')->orWhereHas('user', fn ($user) => $user->where('name', 'like', '%'.$q.'%')))));
        $loans = Loan::with(['copy.book', 'member.user:id,name,email'])->when($view === 'history', fn ($query) => $query->where('status', '!=', 'active'), fn ($query) => $query->where('status', 'active'))
            ->when($filters['q'] ?? '', fn ($query, $q) => $query->where(fn ($query) => $query->whereHas('copy', fn ($copy) => $copy->where('barcode', 'like', '%'.$q.'%')->orWhereHas('book', fn ($book) => $book->where('title', 'like', '%'.$q.'%')))->orWhereHas('member', fn ($member) => $member->where('card_number', 'like', '%'.$q.'%')->orWhereHas('user', fn ($user) => $user->where('name', 'like', '%'.$q.'%')))));

        return Inertia::render('circulation/index', [
            'requests' => $view === 'requests' ? $requests->orderBy('requested_at')->orderBy('id')->paginate(12)->withQueryString() : null,
            'loans' => $view !== 'requests' ? $loans->orderBy('due_on')->orderBy('id')->paginate(12)->withQueryString() : null,
            'filters' => ['view' => $view, 'status' => $filters['status'] ?? '', 'q' => $filters['q'] ?? ''],
            'today' => $today,
            'stats' => [
                'active' => Loan::where('status', 'active')->count(),
                'overdue' => Loan::where('status', 'active')->whereDate('due_on', '<', $today)->count(),
                'pending' => CirculationRequest::where('status', 'pending')->count(),
                'ready' => CirculationRequest::where('status', 'ready')->count(),
                'available' => BookCopy::where('status', 'available')->whereHas('book', fn ($book) => $book->whereNull('deleted_at'))->count(),
            ],
        ]);
    }

    public function prepare(Request $request, int $requestId, CirculationService $service): RedirectResponse
    {
        $result = $service->prepare($request->user(), $requestId);

        return back()->with('success', $result->status === 'ready' ? 'Ejemplar preparado. Falta confirmar su entrega física.' : 'Solicitud validada: queda en lista de espera.');
    }

    public function issue(Request $request, int $requestId, CirculationService $service): RedirectResponse
    {
        $loan = $service->issue($request->user(), $requestId);

        return back()->with('success', $loan->status === 'active' ? 'Entrega confirmada. El préstamo está activo.' : 'La entrega ya estaba registrada y el préstamo está cerrado.');
    }

    public function reject(Request $request, int $requestId, CirculationService $service): RedirectResponse
    {
        Gate::authorize('circulate');
        $data = $request->validate(['reason' => ['required', 'string', 'max:500']]);
        $service->reject($request->user(), $requestId, $data['reason']);

        return back()->with('success', 'Solicitud rechazada; se conserva el motivo.');
    }

    public function receive(ReturnRequest $request, int $loanId, CirculationService $service): RedirectResponse
    {
        Gate::authorize('receive', Loan::findOrFail($loanId));
        $service->receive($request->user(), $loanId, $request->validated('condition'));

        return back()->with('success', 'Cierre registrado. Consulta en inventario el estado actual del ejemplar.');
    }
}
