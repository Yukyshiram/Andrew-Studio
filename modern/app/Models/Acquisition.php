<?php

namespace App\Models;

use Carbon\CarbonImmutable;
use Database\Factories\AcquisitionFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property CarbonImmutable|null $publication_on
 * @property CarbonImmutable|null $expected_on
 * @property CarbonImmutable|null $incorporated_on
 */
class Acquisition extends Model
{
    /** @use HasFactory<AcquisitionFactory> */
    use HasFactory;

    public const OPEN = ['announced', 'ordered', 'in_transit'];

    public const STATUSES = ['announced', 'ordered', 'in_transit', 'incorporated', 'cancelled'];

    public const FIELDS = ['status', 'publication_on', 'expected_on', 'incorporated_on', 'is_fictional', 'source_url', 'public_note'];

    protected $guarded = ['id', 'version', 'created_by', 'operation_key', 'creation_fingerprint'];

    protected $hidden = ['operation_key', 'creation_fingerprint'];

    protected function casts(): array
    {
        return ['publication_on' => 'immutable_date:Y-m-d', 'expected_on' => 'immutable_date:Y-m-d', 'incorporated_on' => 'immutable_date:Y-m-d', 'is_fictional' => 'boolean', 'version' => 'integer'];
    }

    /** @return BelongsTo<Book, $this> */
    public function book(): BelongsTo
    {
        return $this->belongsTo(Book::class)->withTrashed();
    }

    /** @return BelongsTo<User, $this> */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by')->withTrashed();
    }
}
