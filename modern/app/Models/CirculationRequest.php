<?php

namespace App\Models;

use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

/** @property CarbonImmutable|null $ready_until */
class CirculationRequest extends Model
{
    public const OPEN = ['pending', 'waiting', 'ready'];

    public const STATES = ['pending', 'waiting', 'ready', 'fulfilled', 'rejected', 'cancelled', 'expired'];

    protected $guarded = ['id'];

    /** @param Builder<static> $query */
    public function scopeWithQueuePosition(Builder $query): void
    {
        $query->select('circulation_requests.*')->selectSub(
            self::query()->from('circulation_requests as queued')->selectRaw('count(*) + 1')
                ->whereColumn('queued.book_id', 'circulation_requests.book_id')->where('queued.status', 'waiting')
                ->where(fn ($ahead) => $ahead->whereColumn('queued.priority', '<', 'circulation_requests.priority')
                    ->orWhere(fn ($samePriority) => $samePriority->whereColumn('queued.priority', 'circulation_requests.priority')
                        ->where(fn ($order) => $order->whereColumn('queued.requested_at', '<', 'circulation_requests.requested_at')
                            ->orWhere(fn ($sameDate) => $sameDate->whereColumn('queued.requested_at', 'circulation_requests.requested_at')->whereColumn('queued.id', '<', 'circulation_requests.id'))))),
            'queue_position',
        );
    }

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
