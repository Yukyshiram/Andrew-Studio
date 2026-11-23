<?php

namespace App\Http\Requests;

use App\Models\Book;
use App\Rules\Isbn;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class BookRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        if (is_string($this->input('isbn'))) {
            $isbn = strtoupper(str_replace(['-', ' '], '', $this->input('isbn')));
            $this->merge(['isbn' => $isbn === '' ? null : $isbn]);
        }
    }

    public function authorize(): bool
    {
        return $this->route('book')
            ? (bool) $this->user()?->can('update', $this->route('book'))
            : (bool) $this->user()?->can('create', Book::class);
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'], 'author' => ['required', 'string', 'max:255'],
            'publisher' => ['required', 'string', 'max:255'], 'publication_year' => ['required', 'string', 'max:50'],
            'description' => ['nullable', 'string', 'max:10000'],
            'category' => ['required', Rule::in(Book::CATEGORIES)], 'cover_color' => ['required', Rule::in(Book::COLORS)],
            'isbn' => ['bail', 'nullable', 'string', new Isbn],
            'edition' => ['nullable', 'string', 'max:100'],
            'language' => ['sometimes', 'required', 'string', 'max:80'],
        ];
    }

    public function attributes(): array
    {
        return ['title' => 'título', 'author' => 'autor', 'publisher' => 'editorial', 'publication_year' => 'año de publicación', 'description' => 'descripción', 'category' => 'categoría', 'cover_color' => 'color de portada'];
    }
}
