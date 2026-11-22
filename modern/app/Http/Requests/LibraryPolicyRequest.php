<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class LibraryPolicyRequest extends FormRequest
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
            'timezone' => ['required', 'timezone:all'],
            'currency' => ['required', 'string', 'regex:/^[A-Z]{3}$/'],
            'max_loans' => ['required', 'integer', 'min:1', 'max:100'],
            'loan_days' => ['required', 'integer', 'min:1', 'max:365'],
            'max_renewals' => ['required', 'integer', 'min:0', 'max:20'],
            'pickup_days' => ['required', 'integer', 'min:1', 'max:30'],
            'grace_days' => ['required', 'integer', 'min:0', 'max:30'],
            'daily_fine_cents' => ['required', 'integer', 'min:0', 'max:100000'],
            'lost_charge_cents' => ['required', 'integer', 'min:0', 'max:100000000'],
            'damage_charge_cents' => ['required', 'integer', 'min:0', 'max:100000000'],
            'block_balance_cents' => ['required', 'integer', 'min:0', 'max:100000000'],
            'block_overdue' => ['required', 'boolean'],
            'closed_weekdays' => ['present', 'array', 'list', 'max:6'],
            'closed_weekdays.*' => ['required', 'integer', 'min:0', 'max:6', 'distinct'],
            'closure_dates' => ['present', 'array', 'list', 'max:366'],
            'closure_dates.*' => ['required', 'date_format:Y-m-d', 'distinct'],
        ];
    }
}
