<?php

namespace App\Http\Requests;

use App\Models\BookCopy;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class InventoryRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->canManageBooks() ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'book_id' => $this->route('copy') ? ['prohibited'] : ['required', 'integer', Rule::exists('books', 'id')->whereNull('deleted_at')],
            'barcode' => ['required', 'string', 'max:80', 'regex:/^[A-Za-z0-9._-]+$/', Rule::unique('book_copies')->ignore($this->route('copy'))],
            'location' => ['required', 'string', 'max:160'],
            'condition' => ['required', Rule::in(BookCopy::CONDITIONS)],
            'status' => ['required', Rule::in(BookCopy::EDITABLE_STATUSES)],
        ];
    }

    public function after(): array
    {
        return [function (Validator $validator): void {
            if ($this->input('status') === 'available' && in_array($this->input('condition'), ['lost', 'damaged'], true)) {
                $validator->errors()->add('status', 'Un ejemplar dañado o extraviado no puede estar disponible.');
            }
            if ($this->input('condition') === 'lost' && ! in_array($this->input('status'), ['lost', 'withdrawn'], true)) {
                $validator->errors()->add('status', 'El ejemplar extraviado debe marcarse como extraviado o retirado.');
            }
            if ($this->input('status') === 'lost' && $this->input('condition') !== 'lost') {
                $validator->errors()->add('condition', 'Comprueba y marca la condición de extravío.');
            }
            if ($this->input('condition') === 'damaged' && ! in_array($this->input('status'), ['repair', 'withdrawn', 'available'], true)) {
                $validator->errors()->add('status', 'Un ejemplar dañado debe quedar en reparación o retirado.');
            }
        }];
    }
}
