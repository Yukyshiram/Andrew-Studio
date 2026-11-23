<?php

namespace Database\Factories;

use App\Models\Book;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Book> */
class BookFactory extends Factory
{
    public function definition(): array
    {
        return [
            'title' => fake()->sentence(3), 'author' => fake()->name(),
            'publisher' => fake()->company(), 'publication_year' => (string) fake()->year(),
            'description' => fake()->paragraph(), 'category' => 'Literatura', 'cover_color' => 'olive',
        ];
    }
}
