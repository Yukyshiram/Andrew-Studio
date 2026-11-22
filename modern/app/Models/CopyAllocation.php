<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CopyAllocation extends Model
{
    protected $primaryKey = 'copy_id';

    public $incrementing = false;

    protected $fillable = ['copy_id', 'circulation_request_id'];
}
