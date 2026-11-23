<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LoanRenewal extends Model
{
    protected $guarded = ['id'];

    protected $hidden = ['operation_key'];

    protected function casts(): array
    {
        return ['previous_due_on' => 'immutable_date:Y-m-d', 'due_on' => 'immutable_date:Y-m-d'];
    }
}
