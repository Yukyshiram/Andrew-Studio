<?php

namespace App\Services;

use App\Models\Acquisition;
use App\Models\AuditEvent;
use App\Models\Book;
use App\Models\BookCopy;
use App\Models\LibraryPolicy;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AcquisitionService
{
    public function __construct(private LibraryCalendar $calendar) {}

    /** @return array<string, mixed> */
    public static function rules(bool $updating): array
    {
        return [
            'book_id' => $updating ? ['prohibited'] : ['required', 'integer', 'min:1'],
            'status' => ['required', Rule::in(Acquisition::STATUSES)],
            'publication_on' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:1000-01-01'],
            'expected_on' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:1000-01-01'],
            'incorporated_on' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:1000-01-01'],
            'is_fictional' => ['required', 'boolean'],
            'source_url' => ['nullable', 'string', 'max:500', 'url:https', 'not_regex:/^https:\/\/[^\/]*@/i'],
            'public_note' => ['nullable', 'string', 'max:1000'],
            'operation_key' => $updating ? ['prohibited'] : ['required', 'uuid'],
            'version' => $updating ? ['required', 'integer', 'min:1'] : ['prohibited'],
            'created_by' => ['prohibited'], 'creation_fingerprint' => ['prohibited'],
        ];
    }

    public function save(User $actor, array $input, ?int $acquisitionId = null): Acquisition
    {
        return DB::transaction(function () use ($actor, $input, $acquisitionId): Acquisition {
            $policy = LibraryPolicy::lockForUpdate()->findOrFail(1);
            $actor = User::findOrFail($actor->id);
            Gate::forUser($actor)->authorize('circulate');
            $data = Validator::make($input, self::rules($acquisitionId !== null), [
                'source_url.url' => 'La fuente debe ser un enlace HTTPS válido.',
                'source_url.not_regex' => 'El enlace no debe contener credenciales.',
                '*.date_format' => 'Usa una fecha válida con formato año-mes-día.',
            ])->validate();
            $fields = [];
            foreach (Acquisition::FIELDS as $field) {
                $fields[$field] = $field === 'is_fictional' ? (bool) $data[$field] : ($data[$field] ?? null);
            }
            foreach (['public_note', 'source_url'] as $field) {
                $fields[$field] = trim($fields[$field] ?? '') ?: null;
            }
            if ($acquisitionId === null) {
                $key = strtolower($data['operation_key']);
                $fingerprint = hash('sha256', json_encode([(int) $data['book_id'], $actor->id, $fields], JSON_THROW_ON_ERROR));
                $existing = Acquisition::where('operation_key', $key)->first();
                if ($existing) {
                    if (! hash_equals($existing->creation_fingerprint, $fingerprint)) {
                        $this->fail('operation_key', 'Esta operación ya se utilizó para una incorporación diferente.');
                    }

                    return $existing;
                }
                $book = Book::findOrFail($data['book_id']);
                $record = new Acquisition(['book_id' => $book->id]);
                $record->forceFill(['created_by' => $actor->id, 'operation_key' => $key, 'creation_fingerprint' => $fingerprint, 'version' => 1]);
                $before = null;
            } else {
                $record = Acquisition::lockForUpdate()->findOrFail($acquisitionId);
                if ($record->version !== (int) $data['version']) {
                    $this->fail('version', 'Otra persona modificó esta incorporación. Recarga la lista antes de guardar.');
                }
                if (in_array($record->status, ['incorporated', 'cancelled'], true) && $fields['status'] !== $record->status) {
                    $this->fail('status', 'Una incorporación cerrada conserva su estado. Registra otro lote para una nueva adquisición.');
                }
                $before = $record->only(Acquisition::FIELDS);
                $record->forceFill(['version' => $record->version + 1]);
            }
            $today = $this->calendar->today($policy->terms())->toDateString();
            if ($fields['status'] === 'incorporated') {
                if (! $fields['incorporated_on'] || $fields['incorporated_on'] > $today) {
                    $this->fail('incorporated_on', 'Indica la fecha real de incorporación, sin superar el día local de la biblioteca.');
                }
                if (! BookCopy::where('book_id', $record->book_id)->where('status', '!=', 'withdrawn')->exists()) {
                    $this->fail('status', 'Registra primero al menos un ejemplar en Inventario. Una previsión no crea disponibilidad.');
                }
            } elseif ($fields['incorporated_on'] !== null) {
                $this->fail('incorporated_on', 'La fecha real se registra únicamente cuando el título se incorpora.');
            }
            $record->fill($fields)->save();
            AuditEvent::create([
                'user_id' => $actor->id, 'action' => $before === null ? 'acquisition.created' : 'acquisition.updated',
                'subject_type' => 'Acquisition', 'subject_id' => $record->id,
                'metadata' => ['book_id' => $record->book_id, 'before' => $before, 'after' => $record->only(Acquisition::FIELDS), 'version' => $record->version],
            ]);

            return $record;
        }, 3);
    }

    private function fail(string $field, string $message): never
    {
        throw ValidationException::withMessages([$field => $message]);
    }
}
