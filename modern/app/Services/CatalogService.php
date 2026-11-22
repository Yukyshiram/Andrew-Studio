<?php

namespace App\Services;

use App\Models\Book;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

class CatalogService
{
    public function listing(array $filters, bool $management = false): array
    {
        $filters = array_merge(['q' => '', 'category' => '', 'author' => '', 'sort' => 'recent', 'view' => 'grid', 'status' => 'active'], $filters);
        if (! $management) {
            $filters['status'] = 'active';
        }

        return [
            'books' => $this->query($filters, $management)->paginate(12)->withQueryString(),
            'filters' => $filters, 'categories' => Book::CATEGORIES,
            'authors' => Book::distinct()->orderBy('author')->limit(200)->pluck('author'),
            'stats' => $this->stats($management), 'management' => $management,
        ];
    }

    public function stats(bool $includePrivate = false): array
    {
        $stats = [
            'books' => Book::count(), 'authors' => Book::distinct()->count('author'),
            'publishers' => Book::distinct()->count('publisher'), 'categories' => Book::distinct()->count('category'),
        ];
        if ($includePrivate) {
            $stats += ['archived' => Book::onlyTrashed()->count(), 'users' => User::count()];
        }

        return $stats;
    }

    /** @return Builder<Book> */
    public function query(array $filters, bool $management = false): Builder
    {
        $query = Book::query();
        if ($management && ($filters['status'] ?? '') === 'trash') {
            $query->onlyTrashed();
        }
        if ($term = ($filters['q'] ?? '')) {
            $like = '%'.str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $term).'%';
            $query->where(function (Builder $search) use ($like) {
                $search->whereRaw("title LIKE ? ESCAPE '!'", [$like])
                    ->orWhereRaw("author LIKE ? ESCAPE '!'", [$like])
                    ->orWhereRaw("publisher LIKE ? ESCAPE '!'", [$like]);
            });
        }
        if ($filters['category'] ?? null) {
            $query->where('category', $filters['category']);
        }
        if ($filters['author'] ?? null) {
            $query->where('author', $filters['author']);
        }
        match ($filters['sort'] ?? 'recent') {
            'title' => $query->orderBy('title'), 'author' => $query->orderBy('author'),
            'oldest' => $query->orderBy('created_at'), default => $query->orderByDesc('created_at'),
        };

        return $query->orderBy('id');
    }
}
