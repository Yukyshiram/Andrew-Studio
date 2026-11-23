<?php

declare(strict_types=1);

/**
 * Export-only CLI boundary: credentials stay in the process environment and
 * the source transaction is read-only. This file never bootstraps Laravel.
 */
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

$arguments = array_slice($argv, 1);

if ($arguments === ['--help']) {
    fwrite(STDOUT, "Exportación local de solo lectura de Andrew's Bibliotecary.\n\n");
    fwrite(STDOUT, "Uso: php scripts/export-legacy.php [--output=nombre.json]\n");
    fwrite(STDOUT, "Origen mediante LEGACY_DB_HOST, LEGACY_DB_PORT, LEGACY_DB_DATABASE, LEGACY_DB_USERNAME y LEGACY_DB_PASSWORD.\n");
    fwrite(STDOUT, "Salida privada: storage/app/private/legacy/. No se muestran registros ni contraseñas.\n");
    exit(0);
}

$pdo = null;
$handle = null;
$createdFile = null;

try {
    $filename = 'legacy-'.gmdate('Ymd-His').'-'.bin2hex(random_bytes(4)).'.json';

    if ($arguments !== []) {
        if (count($arguments) !== 1 || ! str_starts_with($arguments[0], '--output=')) {
            throw new DomainException('Argumentos no admitidos. Consulta --help.');
        }

        $filename = substr($arguments[0], strlen('--output='));
    }

    if (! preg_match('/\A[a-zA-Z0-9][a-zA-Z0-9._-]{0,120}\.json\z/', $filename)) {
        throw new DomainException('La salida debe ser un nombre simple terminado en .json, sin rutas.');
    }

    $host = getenv('LEGACY_DB_HOST');
    $database = getenv('LEGACY_DB_DATABASE');
    $username = getenv('LEGACY_DB_USERNAME');
    $port = getenv('LEGACY_DB_PORT') ?: '3306';
    $password = getenv('LEGACY_DB_PASSWORD');

    if ($host === false || $host === '' || str_contains($host, ';')
        || $database === false || ! preg_match('/\A[A-Za-z0-9_]+\z/', $database)
        || $username === false || $username === ''
        || filter_var($port, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 65535]]) === false) {
        throw new DomainException('Configura un origen local válido mediante las variables LEGACY_DB_*.');
    }

    $pdo = new PDO(
        "mysql:host={$host};port={$port};dbname={$database};charset=utf8mb4",
        $username,
        $password === false ? '' : $password,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::ATTR_TIMEOUT => 10,
        ],
    );

    $engines = $pdo->query("SELECT TABLE_NAME, ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('users', 'catalogo_books')")->fetchAll();

    if (count($engines) !== 2) {
        throw new DomainException('El origen no contiene las dos tablas históricas esperadas.');
    }

    foreach ($engines as $table) {
        if (strtoupper((string) $table['ENGINE']) !== 'INNODB') {
            throw new DomainException('Se requiere InnoDB para garantizar una lectura consistente de ambas tablas.');
        }
    }

    $pdo->exec('SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ');
    $pdo->exec('START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY');

    $userCount = (int) $pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
    $bookCount = (int) $pdo->query('SELECT COUNT(*) FROM catalogo_books')->fetchColumn();

    if ($userCount > 50000 || $bookCount > 50000) {
        throw new DomainException('El origen supera 50.000 filas por tabla. Planifica una migración por lotes, sin truncar datos.');
    }

    $users = $pdo->query('SELECT id, email, password FROM users ORDER BY id')->fetchAll();
    $books = $pdo->query('SELECT id_libro, Nombre_book, Autor_book, Editorial_book, `Año_Salida_book`, Des_book FROM catalogo_books ORDER BY id_libro')->fetchAll();

    foreach ($users as &$user) {
        $user['id'] = (int) $user['id'];
    }
    unset($user);

    foreach ($books as &$book) {
        $book['id_libro'] = (int) $book['id_libro'];
    }
    unset($book);

    $json = json_encode(
        ['version' => 1, 'users' => $users, 'catalogo_books' => $books],
        JSON_THROW_ON_ERROR | JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES,
    )."\n";

    if (strlen($json) > 20 * 1024 * 1024) {
        throw new DomainException('El archivo superaría 20 MiB. No se genera una exportación parcial.');
    }

    $pdo->commit();
    $directory = __DIR__.'/../storage/app/private/legacy';

    if (! is_dir($directory) && ! mkdir($directory, 0700, true) && ! is_dir($directory)) {
        throw new DomainException('No se puede crear el directorio privado de exportación.');
    }

    @chmod($directory, 0700);
    $path = $directory.DIRECTORY_SEPARATOR.$filename;
    $handle = @fopen($path, 'x+b');

    if ($handle === false) {
        throw new DomainException('No se puede crear la exportación: revisa permisos o elige un nombre que no exista.');
    }

    $createdFile = $path;
    @chmod($path, 0600);
    $written = 0;
    $length = strlen($json);

    while ($written < $length) {
        $bytes = fwrite($handle, substr($json, $written));

        if ($bytes === false || $bytes === 0) {
            throw new DomainException('No se pudo completar el archivo privado. No se conserva una exportación parcial.');
        }

        $written += $bytes;
    }

    if (! fflush($handle)) {
        throw new DomainException('No se pudo guardar completamente el archivo privado.');
    }

    fclose($handle);
    $handle = null;
    $createdFile = null;
    fwrite(STDOUT, sprintf("Exportación completa: %d usuarios y %d libros.\n", $userCount, $bookCount));
    fwrite(STDOUT, 'Archivo privado: storage/app/private/legacy/'.$filename."\n");
    exit(0);
} catch (Throwable $exception) {
    if ($pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    if (is_resource($handle)) {
        fclose($handle);
    }

    if ($createdFile !== null) {
        // Only a file exclusively created by this invocation may be removed.
        @unlink($createdFile);
    }

    $message = $exception instanceof DomainException
        ? $exception->getMessage()
        : 'No se pudo exportar. Verifica el acceso de lectura, las columnas y la codificación UTF-8 del origen.';
    fwrite(STDERR, $message." No se escribió en la base de datos original.\n");
    exit(1);
}
