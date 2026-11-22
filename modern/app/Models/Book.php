<?php

namespace App\Models;

use Database\Factories\BookFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Book extends Model
{
    /** @use HasFactory<BookFactory> */
    use HasFactory, SoftDeletes;

    public const CATEGORIES = ['Literatura', 'Ciencia', 'Tecnología', 'Filosofía', 'Arte', 'Historia', 'General'];

    public const COLORS = ['olive', 'amber', 'blue', 'rose', 'terracotta', 'purple'];

    protected $fillable = ['title', 'author', 'publisher', 'publication_year', 'description', 'category', 'cover_color', 'legacy_id', 'import_batch_id', 'isbn', 'edition', 'language'];

    /** @return HasMany<BookCopy, $this> */
    public function copies(): HasMany
    {
        return $this->hasMany(BookCopy::class);
    }
}
