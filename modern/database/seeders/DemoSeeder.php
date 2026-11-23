<?php

namespace Database\Seeders;

use App\Models\Book;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class DemoSeeder extends Seeder
{
    public function run(): void
    {
        if (! app()->environment(['local', 'testing']) || ! config('bibliotecary.demo_seed_enabled')) {
            throw new RuntimeException('Los datos de demostración solo están habilitados en el entorno local de forma explícita.');
        }
        DB::transaction(function (): void {
            foreach ([
                ['admin', 'Andrea · Administración', 'demo.admin@example.test', 'Demo-Admin2026!'],
                ['librarian', 'Mateo · Biblioteca', 'demo.biblioteca@example.test', 'Demo-Biblio2026!'],
                ['reader', 'Lucía · Lectura', 'demo.lector@example.test', 'Demo-Lector2026!'],
            ] as [$role, $name, $email, $password]) {
                User::firstOrCreate(['email' => $email], compact('role', 'name', 'password'));
            }
            $collection = [
                ['La arquitectura del silencio', 'Elena Valdés', 'Literatura', 'olive', '2024'],
                ['Atlas de lo invisible', 'Tomás Altamirano', 'Ciencia', 'blue', '2025'],
                ['El arte de hacer preguntas', 'Inés Ferrer', 'Filosofía', 'amber', '2023'],
                ['Jardines para otros mundos', 'Clara Montes', 'Arte', 'rose', '2026'],
                ['Código y humanidad', 'Nicolás Vera', 'Tecnología', 'terracotta', '2025'],
                ['Las ciudades que recordamos', 'Marina Sol', 'Historia', 'purple', '2022'],
                ['Una habitación junto al mar', 'Elena Valdés', 'Literatura', 'amber', '2021'],
                ['El lenguaje de las estrellas', 'Tomás Altamirano', 'Ciencia', 'olive', '2024'],
                ['Pensar despacio el futuro', 'Inés Ferrer', 'Filosofía', 'blue', '2025'],
                ['Geometría de una tarde', 'Clara Montes', 'Arte', 'terracotta', '2023'],
                ['Sistemas que nos cuidan', 'Nicolás Vera', 'Tecnología', 'purple', '2026'],
                ['Cartas de una ciudad perdida', 'Marina Sol', 'Historia', 'rose', '2020'],
                ['El bosque de las palabras', 'Elena Valdés', 'Literatura', 'olive', '2026'],
                ['Materia, tiempo y asombro', 'Tomás Altamirano', 'Ciencia', 'amber', '2022'],
                ['Pequeña filosofía de lo cotidiano', 'Inés Ferrer', 'Filosofía', 'rose', '2024'],
                ['La mirada y el paisaje', 'Clara Montes', 'Arte', 'blue', '2025'],
                ['Diseñar para las personas', 'Nicolás Vera', 'Tecnología', 'terracotta', '2024'],
                ['El archivo de las estaciones', 'Marina Sol', 'Historia', 'purple', '2023'],
                ['A ambos lados de la lluvia', 'Elena Valdés', 'Literatura', 'rose', '2025'],
                ['La vida secreta de los números', 'Tomás Altamirano', 'Ciencia', 'olive', '2026'],
                ['El valor de la incertidumbre', 'Inés Ferrer', 'Filosofía', 'purple', '2021'],
                ['Cuaderno de formas posibles', 'Clara Montes', 'Arte', 'amber', '2024'],
                ['Internet a escala humana', 'Nicolás Vera', 'Tecnología', 'blue', '2026'],
                ['Memorias de un lugar imaginario', 'Marina Sol', 'Historia', 'terracotta', 'X'],
            ];
            foreach ($collection as $index => [$title, $author, $category, $color, $year]) {
                Book::firstOrCreate(['title' => $title, 'author' => $author], [
                    'publisher' => ['Ediciones Umbral', 'Casa Horizonte', 'Editorial Nómada'][$index % 3],
                    'publication_year' => $year, 'category' => $category, 'cover_color' => $color,
                    'description' => 'Una invitación a explorar nuevas ideas desde una mirada curiosa y sensible. Esta ficha, su autoría y su editorial son datos ficticios creados exclusivamente para la demostración de Andrew\'s Bibliotecary.',
                    'created_at' => now()->subDays(24 - $index),
                ]);
            }
        });
    }
}
