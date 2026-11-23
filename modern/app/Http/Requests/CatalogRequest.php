<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CatalogRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'q' => ['nullable', 'string', 'max:150'], 'category' => ['nullable', 'string', 'max:80'],
            'author' => ['nullable', 'string', 'max:255'],
            'sort' => ['nullable', Rule::in(['recent', 'oldest', 'title', 'author'])],
            'status' => ['nullable', Rule::in(['active', 'trash'])], 'view' => ['nullable', Rule::in(['grid', 'list'])],
            'page' => ['nullable', 'integer', 'min:1', 'max:100000'],
        ];
    }
}
