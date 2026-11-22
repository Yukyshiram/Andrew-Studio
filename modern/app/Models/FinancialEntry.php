<?php

namespace App\Models;

use DomainException;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FinancialEntry extends Model
{
    public const MANUAL_KINDS = ['payment', 'credit', 'adjustment'];

    public const KINDS = ['overdue', 'lost', 'damage', 'payment', 'credit', 'adjustment', 'reversal'];

    public $timestamps = false;

    protected $guarded = ['id'];

    protected $hidden = ['event_key'];

    protected function casts(): array
    {
        return ['amount_cents' => 'integer', 'occurred_on' => 'immutable_date:Y-m-d', 'created_at' => 'immutable_datetime'];
    }

    protected static function booted(): void
    {
        static::updating(function (): never {
            throw new DomainException('Los movimientos financieros no se modifican; registra una reversión.');
        });
        static::deleting(function (): never {
            throw new DomainException('Los movimientos financieros no se eliminan; registra una reversión.');
        });
    }

    /** @return BelongsTo<Member, $this> */
    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class);
    }

    /** @return BelongsTo<User, $this> */
    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id')->withTrashed();
    }
}
