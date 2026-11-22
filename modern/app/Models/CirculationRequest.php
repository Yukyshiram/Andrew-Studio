<?php

namespace App\Models;

use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

/** @property CarbonImmutable|null $ready_until */
class CirculationRequest extends Model
{
    public const OPEN = ['pending', 'waiting', 'ready'];

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['requested_at' => 'immutable_datetime', 'ready_until' => 'immutable_date:Y-m-d', 'closed_at' => 'immutable_datetime'];
    }

    /** @return BelongsTo<Book, $this> */
    public function book(): BelongsTo
    {
        return $this->belongsTo(Book::class)->withTrashed();
    }

    /** @return BelongsTo<Member, $this> */
    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class);
    }

    /** @return HasOne<CopyAllocation, $this> */
    public function allocation(): HasOne
    {
        return $this->hasOne(CopyAllocation::class);
    }

    /** @return HasOne<Loan, $this> */
    public function loan(): HasOne
    {
        return $this->hasOne(Loan::class);
    }
}
