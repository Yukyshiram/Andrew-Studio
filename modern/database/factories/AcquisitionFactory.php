<?php

namespace Database\Factories;

use App\Models\Acquisition;
use App\Models\Book;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Acquisition>
 */
class AcquisitionFactory extends Factory
{
    public function definition(): array
    {
        return [
            'book_id' => Book::factory(), 'created_by' => User::factory()->state(['role' => 'librarian']),
            'status' => 'announced', 'publication_on' => null, 'expected_on' => null, 'incorporated_on' => null,
            'is_fictional' => true, 'public_note' => 'Previsión ficticia de prueba.', 'source_url' => null,
            'operation_key' => (string) Str::uuid(), 'creation_fingerprint' => hash('sha256', (string) Str::uuid()),
        ];
    }
}
