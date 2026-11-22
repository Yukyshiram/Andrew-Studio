<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class MemberRequest extends FormRequest
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
            'user_id' => $this->route('member') ? ['prohibited'] : ['required', 'integer', Rule::exists('users', 'id')->whereNull('deleted_at'), 'unique:members,user_id'],
            'phone' => ['nullable', 'string', 'max:40'],
            'status' => ['required', Rule::in(['active', 'suspended'])],
            'expires_on' => ['nullable', 'date_format:Y-m-d'],
            'loan_limit' => ['nullable', 'integer', 'min:0', 'max:100'],
        ];
    }
}
