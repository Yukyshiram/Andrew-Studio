<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class ReverseFinancialEntryRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->isAdmin() ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'operation_key' => ['required', 'uuid'], 'reason' => ['required', 'string', 'max:500'],
            'amount_cents' => ['prohibited'], 'member_id' => ['prohibited'], 'actor_id' => ['prohibited'],
            'currency' => ['prohibited'], 'occurred_on' => ['prohibited'], 'created_at' => ['prohibited'],
        ];
    }

    public function messages(): array
    {
        return [
            'required' => 'Completa este campo.', 'reason.max' => 'El motivo admite hasta 500 caracteres.',
            'operation_key.uuid' => 'Abre de nuevo la confirmación para generar una operación válida.',
            'prohibited' => 'La reversión conserva los datos del movimiento original.',
        ];
    }
}
