<?php

namespace App\Http\Controllers;

use App\Http\Requests\CatalogRequest;
use App\Models\AuditEvent;
use App\Models\Book;
use App\Services\CatalogService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CatalogController extends Controller
{
    public function welcome(CatalogService $catalog): Response
    {
        return Inertia::render('welcome', [
            'stats' => $catalog->stats(), 'featured' => Book::orderBy('id')->limit(6)->get(),
            'categories' => Book::selectRaw('category as name, count(*) as count')->groupBy('category')->orderBy('category')->get(),
        ]);
    }

    public function index(CatalogRequest $request, CatalogService $catalog): Response
    {
        return Inertia::render('books/index', $catalog->listing($request->validated()));
    }

    public function show(Book $book): Response
    {
        return Inertia::render('books/show', [
            'book' => $book, 'related' => Book::where('id', '!=', $book->id)->where('category', $book->category)->orderBy('id')->limit(4)->get(),
        ]);
    }

    public function dashboard(Request $request, CatalogService $catalog): Response
    {
        return Inertia::render('dashboard', [
            'stats' => $catalog->stats($request->user()->canManageBooks()),
            'recentBooks' => Book::latest('id')->limit(6)->get(),
            'activity' => $request->user()->isAdmin() ? AuditEvent::with('actor:id,name')->latest('id')->limit(6)->get() : [],
        ]);
    }
}
