<?php

namespace App\Models;

use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property CarbonImmutable $due_on
 * @property CarbonImmutable|null $returned_at
 * @property array<string, mixed> $terms
 */
class Loan extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['terms' => 'array', 'due_on' => 'immutable_date:Y-m-d', 'checked_out_at' => 'immutable_datetime', 'returned_at' => 'immutable_datetime'];
    }

    /** @return HasMany<LoanRenewal, $this> */
    public function renewals(): HasMany
    {
        return $this->hasMany(LoanRenewal::class);
    }

    /** @return BelongsTo<BookCopy, $this> */
    public function copy(): BelongsTo
    {
        return $this->belongsTo(BookCopy::class, 'book_copy_id');
    }

    /** @return BelongsTo<Member, $this> */
    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class);
    }

    /** @return BelongsTo<CirculationRequest, $this> */
    public function request(): BelongsTo
    {
        return $this->belongsTo(CirculationRequest::class, 'circulation_request_id');
    }
}
