<?php

namespace App\Http\Controllers;

use App\Http\Requests\InventoryRequest;
use App\Models\AuditEvent;
use App\Models\Book;
use App\Models\BookCopy;
use App\Models\LibraryPolicy;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class InventoryController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('circulate');
        $filters = $request->validate(['q' => ['nullable', 'string', 'max:80'], 'page' => ['nullable', 'integer', 'min:1', 'max:100000']]);
        $copies = BookCopy::with('book:id,title')->when($filters['q'] ?? '', function ($query, $term): void {
            $query->where(function ($query) use ($term): void {
                $query->where('barcode', 'like', '%'.$term.'%')->orWhereHas('book', fn ($book) => $book->where('title', 'like', '%'.$term.'%'));
            });
        })->orderBy('id')->paginate(12)->withQueryString();

        return Inertia::render('inventory/index', [
            'copies' => $copies, 'filters' => ['q' => $filters['q'] ?? ''],
            'books' => Book::when($filters['q'] ?? '', fn ($query, $term) => $query->where('title', 'like', '%'.$term.'%'))->orderBy('title')->limit(200)->get(['id', 'title']),
        ]);
    }

    public function store(InventoryRequest $request): RedirectResponse
    {
        DB::transaction(function () use ($request): void {
            LibraryPolicy::lockForUpdate()->findOrFail(1);
            Gate::forUser(User::findOrFail($request->user()->id))->authorize('circulate');
            $copy = BookCopy::create($request->validated());
            AuditEvent::record('copy.created', $copy);
        });

        return back()->with('success', 'Ejemplar incorporado al inventario.');
    }

    public function update(InventoryRequest $request, BookCopy $copy): RedirectResponse
    {
        DB::transaction(function () use ($request, $copy): void {
            LibraryPolicy::lockForUpdate()->findOrFail(1);
            Gate::forUser(User::findOrFail($request->user()->id))->authorize('circulate');
            $fresh = BookCopy::lockForUpdate()->findOrFail($copy->id);
            if (in_array($fresh->status, ['held', 'loaned'], true)) {
                throw ValidationException::withMessages(['status' => 'El ejemplar está asignado. Cancela la recogida o registra su devolución antes de modificarlo.']);
            }
            $fresh->update($request->validated());
            AuditEvent::record('copy.updated', $fresh, ['before' => $copy->only(['status', 'condition']), 'after' => $fresh->only(['status', 'condition'])]);
        });

        return back()->with('success', 'Inventario actualizado.');
    }
}
