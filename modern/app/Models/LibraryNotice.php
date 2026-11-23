<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LibraryNotice extends Model
{
    protected $guarded = ['id'];

    protected $hidden = ['event_key'];

    protected function casts(): array
    {
        return ['read_at' => 'immutable_datetime'];
    }
}
