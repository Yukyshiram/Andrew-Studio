<?php

namespace App\Http\Controllers;

use App\Models\Acquisition;
use App\Models\Book;
use App\Models\LibraryPolicy;
use App\Services\LibraryCalendar;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class NewsController extends Controller
{
    public function index(Request $request, LibraryCalendar $calendar): Response
    {
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:80'], 'category' => ['nullable', Rule::in(Book::CATEGORIES)],
            'status' => ['nullable', Rule::in(['all', ...Acquisition::OPEN, 'incorporated'])],
            'date_field' => ['nullable', Rule::in(['publication_on', 'expected_on', 'incorporated_on'])],
            'from' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:1000-01-01'],
            'to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:1000-01-01'],
            'page' => ['nullable', 'integer', 'min:1', 'max:100000'],
        ]);
        $filters = array_replace(['q' => '', 'category' => '', 'status' => 'all', 'date_field' => 'expected_on', 'from' => '', 'to' => ''], array_filter($filters, fn ($value) => $value !== null));
        if ($filters['from'] !== '' && $filters['to'] !== '' && $filters['from'] > $filters['to']) {
            throw ValidationException::withMessages(['to' => 'La fecha final debe ser igual o posterior a la inicial.']);
        }
        $query = Acquisition::where('status', '!=', 'cancelled')
            ->whereHas('book', function ($book) use ($filters): void {
                $book->whereNull('books.deleted_at');
                if ($filters['category'] !== '') {
                    $book->where('category', $filters['category']);
                }
                if ($filters['q'] !== '') {
                    $like = '%'.str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $filters['q']).'%';
                    $book->where(fn ($search) => $search->whereRaw("title LIKE ? ESCAPE '!'", [$like])->orWhereRaw("author LIKE ? ESCAPE '!'", [$like]));
                }
            })
            ->when($filters['status'] !== 'all', fn ($query) => $query->where('status', $filters['status']))
            ->when($filters['from'] !== '', fn ($query) => $query->where($filters['date_field'], '>=', $filters['from']))
            ->when($filters['to'] !== '', fn ($query) => $query->where($filters['date_field'], '<=', $filters['to']))
            ->with(['book' => fn ($book) => $book->select(['id', 'title', 'author', 'publisher', 'publication_year', 'category', 'cover_color', 'deleted_at'])->withCount([
                'copies as available_copies' => fn ($copies) => $copies->where('status', 'available')->whereIn('condition', ['good', 'worn']),
            ])]);
        $terms = LibraryPolicy::current()->terms();

        return Inertia::render('news/index', [
            'acquisitions' => $query->orderByDesc('incorporated_on')->orderBy('expected_on')->orderByDesc('id')
                ->paginate(12, ['id', 'book_id', ...Acquisition::FIELDS])->withQueryString(),
            'filters' => array_intersect_key($filters, array_flip(['q', 'category', 'status', 'date_field', 'from', 'to'])),
            'categories' => Book::CATEGORIES, 'today' => $calendar->today($terms)->toDateString(), 'timezone' => $terms['timezone'],
        ]);
    }
}
