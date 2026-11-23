<?php

namespace App\Http\Requests;

use App\Models\User;
use Illuminate\Validation\Rule;

class AdminUserRequest extends RegisterRequest
{
    public function authorize(): bool
    {
        return $this->route('user')
            ? (bool) $this->user()?->can('update', $this->route('user'))
            : (bool) $this->user()?->can('create', User::class);
    }

    public function rules(): array
    {
        $role = ['role' => ['required', Rule::in(User::ROLES)]];

        return $this->isMethod('post') ? array_merge(parent::rules(), $role) : $role;
    }
}
