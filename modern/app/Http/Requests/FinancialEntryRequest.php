<?php

namespace App\Http\Requests;

use App\Models\FinancialEntry;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class FinancialEntryRequest extends FormRequest
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
            'member_id' => ['required', 'integer', Rule::exists('members', 'id')],
            'kind' => ['required', Rule::in(FinancialEntry::MANUAL_KINDS)],
            'amount_cents' => ['required', 'integer', 'between:-1000000000,1000000000', 'not_in:0'],
            'operation_key' => ['required', 'uuid'],
            'reason' => ['required', 'string', 'max:500'],
            'reference' => ['nullable', 'string', 'max:100'],
            'actor_id' => ['prohibited'], 'currency' => ['prohibited'], 'occurred_on' => ['prohibited'],
            'loan_id' => ['prohibited'], 'created_at' => ['prohibited'], 'reversal_of' => ['prohibited'],
        ];
    }

    public function messages(): array
    {
        return [
            'required' => 'Completa este campo.', 'integer' => 'Escribe un número entero.',
            'amount_cents.between' => 'El importe debe estar entre -1000000000 y 1000000000 centavos.',
            'amount_cents.not_in' => 'El importe debe ser distinto de cero.',
            'member_id.exists' => 'Selecciona un socio registrado.', 'kind.in' => 'Selecciona un tipo de movimiento válido.',
            'operation_key.uuid' => 'Abre de nuevo la confirmación para generar una operación válida.',
            'reason.max' => 'El motivo admite hasta 500 caracteres.', 'reference.max' => 'La referencia admite hasta 100 caracteres.',
            'prohibited' => 'Este dato lo determina la biblioteca y no puede enviarse en el formulario.',
        ];
    }
}
