<?php

return [
    'required' => 'El campo :attribute es obligatorio.',
    'string' => 'El campo :attribute debe ser texto.',
    'email' => 'Introduce un correo electrónico válido.',
    'unique' => 'Este :attribute ya está registrado.',
    'confirmed' => 'La confirmación de :attribute no coincide.',
    'in' => 'Selecciona una opción válida para :attribute.',
    'integer' => 'El campo :attribute debe ser un número entero.',
    'boolean' => 'El campo :attribute debe ser verdadero o falso.',
    'current_password' => 'La contraseña actual no es correcta.',
    'min' => ['string' => 'El campo :attribute debe tener al menos :min caracteres.', 'numeric' => 'El campo :attribute debe ser al menos :min.'],
    'max' => ['string' => 'El campo :attribute no debe superar :max caracteres.', 'numeric' => 'El campo :attribute no debe superar :max.'],
    'password' => ['mixed' => 'La contraseña debe incluir mayúsculas y minúsculas.', 'numbers' => 'La contraseña debe incluir un número.', 'letters' => 'La contraseña debe incluir letras.'],
    'attributes' => ['name' => 'nombre', 'email' => 'correo', 'password' => 'contraseña', 'current_password' => 'contraseña actual', 'role' => 'rol', 'confirmation' => 'confirmación'],
];
