<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LibraryPolicy extends Model
{
    public $incrementing = false;

    protected $guarded = ['id', 'version'];

    protected function casts(): array
    {
        return ['closed_weekdays' => 'array', 'closure_dates' => 'array', 'block_overdue' => 'boolean'];
    }

    public static function current(): self
    {
        return self::findOrFail(1);
    }

    public function terms(): array
    {
        return $this->only([
            'timezone', 'currency', 'max_loans', 'loan_days', 'max_renewals', 'pickup_days', 'grace_days',
            'daily_fine_cents', 'lost_charge_cents', 'damage_charge_cents', 'block_balance_cents',
            'block_overdue', 'closed_weekdays', 'closure_dates', 'version',
        ]);
    }
}
