<?php

namespace App\Http\Requests;

use App\Services\AcquisitionService;
use Illuminate\Foundation\Http\FormRequest;

class AcquisitionRequest extends FormRequest
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
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return AcquisitionService::rules($this->route('acquisition') !== null);
    }
}
