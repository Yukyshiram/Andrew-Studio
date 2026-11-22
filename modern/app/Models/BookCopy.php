<?php

namespace App\Models;

use Database\Factories\BookCopyFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BookCopy extends Model
{
    /** @use HasFactory<BookCopyFactory> */
    use HasFactory;

    public const CONDITIONS = ['good', 'worn', 'damaged', 'lost'];

    public const EDITABLE_STATUSES = ['available', 'repair', 'lost', 'withdrawn'];

    protected $fillable = ['book_id', 'barcode', 'location', 'condition', 'status'];

    /** @return BelongsTo<Book, $this> */
    public function book(): BelongsTo
    {
        return $this->belongsTo(Book::class)->withTrashed();
    }
}
