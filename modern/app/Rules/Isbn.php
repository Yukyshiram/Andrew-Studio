<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Translation\PotentiallyTranslatedString;

class Isbn implements ValidationRule
{
    /**
     * Run the validation rule.
     *
     * @param  Closure(string, ?string=): PotentiallyTranslatedString  $fail
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value)) {
            $fail('Escribe un ISBN en formato de texto.');

            return;
        }
        $isbn = $value;
        $valid = false;
        if (preg_match('/^\d{9}[\dX]$/', $isbn)) {
            $sum = 0;
            for ($index = 0; $index < 10; $index++) {
                $sum += (10 - $index) * ($isbn[$index] === 'X' ? 10 : (int) $isbn[$index]);
            }
            $valid = $sum % 11 === 0;
        } elseif (preg_match('/^97[89]\d{10}$/', $isbn)) {
            $sum = 0;
            for ($index = 0; $index < 13; $index++) {
                $sum += (int) $isbn[$index] * ($index % 2 === 0 ? 1 : 3);
            }
            $valid = $sum % 10 === 0;
        }
        if (! $valid) {
            $fail('Escribe un ISBN-10 o ISBN-13 con dígito de control válido.');
        }
    }
}
