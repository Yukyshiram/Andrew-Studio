<?php

namespace App\Models;

use Carbon\CarbonImmutable;
use Database\Factories\MemberFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** @property CarbonImmutable|null $expires_on */
class Member extends Model
{
    /** @use HasFactory<MemberFactory> */
    use HasFactory;

    protected $fillable = ['user_id', 'card_number', 'status', 'phone', 'expires_on', 'loan_limit'];

    protected function casts(): array
    {
        return ['expires_on' => 'immutable_date:Y-m-d', 'loan_limit' => 'integer'];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class)->withTrashed();
    }

    public static function enroll(User $user): self
    {
        return self::firstOrCreate(['user_id' => $user->id], [
            'card_number' => 'SOC-'.str_pad((string) $user->id, 12, '0', STR_PAD_LEFT),
        ]);
    }

    /** @return HasMany<CirculationRequest, $this> */
    public function requests(): HasMany
    {
        return $this->hasMany(CirculationRequest::class);
    }

    /** @return HasMany<Loan, $this> */
    public function loans(): HasMany
    {
        return $this->hasMany(Loan::class);
    }
}
