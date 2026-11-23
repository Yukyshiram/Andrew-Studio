<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * @property array<string, mixed> $manifest
 * @property Carbon|null $rolled_back_at
 */
class ImportBatch extends Model
{
    use HasUuids;

    protected $fillable = ['source_sha256', 'manifest', 'rolled_back_at'];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['manifest' => 'array', 'rolled_back_at' => 'datetime'];
    }
}
