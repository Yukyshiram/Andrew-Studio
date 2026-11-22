<?php

namespace App\Http\Controllers;

use App\Http\Requests\CatalogRequest;
use App\Models\AuditEvent;
use App\Models\Book;
use App\Models\Member;
use App\Models\User;
use App\Services\CatalogService;
use App\Services\DashboardService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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

    public function show(Request $request, Book $book): Response
    {
        $book->loadCount([
            'copies as total_copies' => fn ($copies) => $copies->where('status', '!=', 'withdrawn'),
            'copies as available_copies' => fn ($copies) => $copies->where('status', 'available')->whereIn('condition', ['good', 'worn']),
        ]);

        return Inertia::render('books/show', [
            'book' => $book, 'related' => Book::where('id', '!=', $book->id)->where('category', $book->category)->orderBy('id')->limit(4)->get(),
            'hasMembership' => $request->user() ? Member::where('user_id', $request->user()->id)->exists() : false,
        ]);
    }

    public function dashboard(Request $request, CatalogService $catalog, DashboardService $dashboard): Response
    {
        return DB::transaction(function () use ($request, $catalog, $dashboard): Response {
            $actor = User::findOrFail($request->user()->id);

            return Inertia::render('dashboard', [
                ...$dashboard->for($actor),
                'stats' => $catalog->stats($actor->canManageBooks()),
                'recentBooks' => Book::latest('id')->limit(6)->get(),
                'activity' => $actor->isAdmin() ? AuditEvent::with('actor:id,name')->latest('id')->limit(6)->get() : [],
            ]);
        });
    }
}
