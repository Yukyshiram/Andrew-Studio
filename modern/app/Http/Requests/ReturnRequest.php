<?php

namespace App\Http\Requests;

use App\Models\BookCopy;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ReturnRequest extends FormRequest
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
            'condition' => ['required', Rule::in(BookCopy::CONDITIONS)],
            'returned_at' => ['prohibited'], 'due_on' => ['prohibited'], 'member_id' => ['prohibited'],
            'active_copy_id' => ['prohibited'], 'status' => ['prohibited'],
        ];
    }
}
