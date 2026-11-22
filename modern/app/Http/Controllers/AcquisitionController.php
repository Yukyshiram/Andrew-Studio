<?php

namespace App\Http\Controllers;

use App\Http\Requests\AcquisitionRequest;
use App\Models\Acquisition;
use App\Models\Book;
use App\Services\AcquisitionService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AcquisitionController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('circulate');
        $filters = $request->validate(['q' => ['nullable', 'string', 'max:80'], 'status' => ['nullable', Rule::in(['all', ...Acquisition::STATUSES])], 'page' => ['nullable', 'integer', 'min:1', 'max:100000']]);
        $q = $filters['q'] ?? '';
        $status = $filters['status'] ?? 'all';
        $like = '%'.str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $q).'%';

        return Inertia::render('acquisitions/index', [
            'acquisitions' => Acquisition::with('book:id,title,deleted_at')->when($q !== '', fn ($query) => $query->whereHas('book', fn ($book) => $book->whereRaw("title LIKE ? ESCAPE '!'", [$like])))
                ->when($status !== 'all', fn ($query) => $query->where('status', $status))->latest('id')->paginate(12)->withQueryString(),
            'books' => Book::when($q !== '', fn ($book) => $book->whereRaw("title LIKE ? ESCAPE '!'", [$like]))->orderBy('title')->limit(200)->get(['id', 'title']),
            'filters' => ['q' => $q, 'status' => $status],
        ]);
    }

    public function store(AcquisitionRequest $request, AcquisitionService $service): RedirectResponse
    {
        $service->save($request->user(), $request->validated());

        return back()->with('success', 'Incorporación registrada. La previsión no cambia el inventario.');
    }

    public function update(AcquisitionRequest $request, Acquisition $acquisition, AcquisitionService $service): RedirectResponse
    {
        $service->save($request->user(), $request->validated(), $acquisition->id);

        return back()->with('success', 'Incorporación actualizada y registrada en el historial.');
    }
}
