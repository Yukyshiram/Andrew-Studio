<?php

namespace App\Http\Controllers;

use App\Http\Requests\BookRequest;
use App\Http\Requests\CatalogRequest;
use App\Models\AuditEvent;
use App\Models\Book;
use App\Services\CatalogService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class BookController extends Controller
{
    public function index(CatalogRequest $request, CatalogService $catalog): Response
    {
        Gate::authorize('viewAny', Book::class);

        return Inertia::render('books/index', $catalog->listing($request->validated(), true));
    }

    public function create(): Response
    {
        Gate::authorize('create', Book::class);

        return Inertia::render('books/form', ['book' => null, 'categories' => Book::CATEGORIES]);
    }

    public function store(BookRequest $request): RedirectResponse
    {
        $book = DB::transaction(function () use ($request): Book {
            $book = Book::create([...$request->validated(), 'description' => $request->validated('description') ?? '']);
            AuditEvent::record('book.created', $book);

            return $book;
        });

        return redirect()->route('catalog.show', $book)->with('success', 'El libro ya forma parte de la colección.');
    }

    public function edit(Book $book): Response
    {
        Gate::authorize('update', $book);

        return Inertia::render('books/form', ['book' => $book, 'categories' => Book::CATEGORIES]);
    }

    public function update(BookRequest $request, Book $book): RedirectResponse
    {
        DB::transaction(function () use ($request, $book): void {
            $book->update([...$request->validated(), 'description' => $request->validated('description') ?? '']);
            AuditEvent::record('book.updated', $book);
        });

        return redirect()->route('catalog.show', $book)->with('success', 'Ficha actualizada.');
    }

    public function destroy(Book $book): RedirectResponse
    {
        Gate::authorize('delete', $book);
        DB::transaction(function () use ($book): void {
            $book->delete();
            AuditEvent::record('book.archived', $book);
        });

        return redirect()->route('manage.books.index')->with('success', 'Libro archivado. Puedes recuperarlo desde la papelera.');
    }

    public function restore(Book $book): RedirectResponse
    {
        Gate::authorize('restore', $book);
        DB::transaction(function () use ($book): void {
            $book->restore();
            AuditEvent::record('book.restored', $book);
        });

        return back()->with('success', 'Libro restaurado en el catálogo.');
    }

    public function archiveAll(Request $request): RedirectResponse
    {
        Gate::authorize('archiveAll', Book::class);
        $request->validate(['password' => ['required', 'string', 'current_password'], 'confirmation' => ['required', Rule::in(['ARCHIVAR CATÁLOGO'])]]);
        $count = DB::transaction(function (): int {
            $count = Book::query()->update(['deleted_at' => now(), 'updated_at' => now()]);
            AuditEvent::record('catalog.archived', metadata: ['count' => $count]);

            return $count;
        });

        return redirect()->route('manage.books.index')->with('success', "Se archivaron {$count} registros. Permanecen recuperables en la papelera.");
    }
}
