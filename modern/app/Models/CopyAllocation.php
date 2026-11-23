<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CopyAllocation extends Model
{
    protected $primaryKey = 'copy_id';

    public $incrementing = false;

    protected $fillable = ['copy_id', 'circulation_request_id'];

    /** @return BelongsTo<BookCopy, $this> */
    public function copy(): BelongsTo
    {
        return $this->belongsTo(BookCopy::class, 'copy_id');
    }
}
