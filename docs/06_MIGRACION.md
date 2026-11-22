# Migración conservadora y reversible del legado

La versión 2.0 usa su propia base MySQL. El procedimiento no cambia ni reemplaza las tablas de la instalación antigua. La exportación es una lectura consistente del origen; la importación y su reversión actúan exclusivamente sobre la base configurada en `modern/.env`.

## Contrato y alcance

Se migran las dos tablas comprobadas en la auditoría, no préstamos ni otras entidades inexistentes:

| Origen | Destino | Regla |
| --- | --- | --- |
| `users.id` | `users.legacy_id` | Identificador de procedencia; el ID interno nuevo es independiente. |
| `users.email` | `users.email` | Se conserva literalmente; correo inválido o conflicto cancela todo el lote. |
| `users.password` | `users.password` | Se conserva el bcrypt original sin volver a hashearlo. |
| Sin nombre | `users.name` | Se deriva de la parte anterior a `@`; no se inventan identidades personales. |
| Sin rol | `users.role` | Siempre `reader`. Nunca se concede administración por migración. |
| `catalogo_books.id_libro` | `books.legacy_id` | Mapeo de procedencia, sin reutilizar la PK de destino. |
| `Nombre_book`, `Autor_book`, `Editorial_book` | `title`, `author`, `publisher` | Texto conservado sin recortar, interpretar HTML o normalizar silenciosamente. |
| `Año_Salida_book` | `publication_year` | Cadena de hasta 50 caracteres; conserva «X», rangos y otros valores históricos. |
| `Des_book` | `description` | Texto preservado; cadena vacía sigue siendo cadena vacía. |
| Sin categoría/color | `category`, `cover_color` | Valores iniciales `General` y `olive`, sin pretender inferir temática. |
| Sin procedencia | `import_batch_id` | UUID del lote tanto en usuarios como en libros. |

El registro público no permite asignar roles. Si una cuenta importada necesita privilegios, debe promoverse después por el procedimiento administrativo autorizado. Esa modificación impide el rollback automático del lote, para proteger el trabajo posterior.

## Formato del archivo

JSON UTF-8, versión 1, con tres claves de primer nivel: `version`, `users`, `catalogo_books`. Los nombres históricos son deliberados:

```json
{
  "version": 1,
  "users": [],
  "catalogo_books": [
    {
      "id_libro": 41,
      "Nombre_book": "Un libro ficticio",
      "Autor_book": "Autora de demostración",
      "Editorial_book": "Editorial ficticia",
      "Año_Salida_book": "X / 1984",
      "Des_book": ""
    }
  ]
}
```

Un usuario exportado contiene únicamente `id`, `email` y `password`. El hash no se reproduce en esta guía. La fixture `modern/tests/Fixtures/legacy.json` contiene datos ficticios y un bcrypt de pruebas, no datos de una instalación real.

Se admite un máximo de 20 MiB por archivo y 50.000 registros por tabla. El límite evita agotar memoria con una importación accidentalmente enorme. Si se supera, se requiere planificar una migración por lotes compatible con las restricciones de identidad; no se truncan datos automáticamente.

## Antes de operar

1. Conserva un respaldo verificado de la instalación antigua y un respaldo de la base 2.0. No uses `migrate:fresh`, `db:wipe`, `docker compose down -v` o un DELETE de tablas para migrar.
2. Comprueba que la aplicación nueva se conecta a su base separada y que sus migraciones ya están aplicadas.
3. Ejecuta primero el procedimiento con las fixtures ficticias en un entorno de prueba. La suite automatizada comprueba importación, conflictos y rollback sin tocar la base antigua.
4. Acuerda una ventana sin escrituras en destino durante el cambio final. Las transacciones y restricciones únicas impiden lotes parciales, pero no sustituyen una ventana operativa controlada.
5. Usa, cuando esté disponible, una cuenta de origen con permisos `SELECT` sobre las dos tablas. No necesitas privilegios de escritura o DDL sobre el legado.
6. Si mantienes el servidor antiguo en 8080, usa `docker compose` desde la raíz sin omitir `compose.override.yaml`. El override nuevo oculta `modern`, `.local`, `.git` y `docs` del DocumentRoot antiguo mediante montajes temporales y evita copiar el nuevo código al construir su imagen. No cambies estas máscaras: el PHP antiguo publica la raíz del repositorio y, sin ellas, podría servir el `.env` o las exportaciones privadas de 2.0. Las fuentes originales y los datos siguen intactos.

## Exportación de solo lectura

`modern/scripts/export-legacy.php` es una herramienta CLI independiente de Laravel. Necesita PHP con `pdo_mysql`; no muestra registros, hashes ni credenciales. Lee estas variables de entorno:

| Variable | Significado |
| --- | --- |
| `LEGACY_DB_HOST` | Host del MySQL de origen; obligatorio. |
| `LEGACY_DB_PORT` | Puerto, 3306 por omisión. |
| `LEGACY_DB_DATABASE` | Base de origen; obligatoria. |
| `LEGACY_DB_USERNAME` | Usuario de lectura; obligatorio. |
| `LEGACY_DB_PASSWORD` | Contraseña desde el entorno; puede ser vacía si la cuenta local así lo requiere. |

La contraseña debe introducirse mediante el gestor de secretos o el entorno del proceso, nunca como argumento de CLI, en Git, en un script compartido o en una captura de pantalla.

Desde `modern/`, si tienes el runtime PHP del proyecto:

```powershell
php scripts/export-legacy.php --help
php scripts/export-legacy.php
```

La salida se escribe exclusivamente en `modern/storage/app/private/legacy/`, directorio ignorado por Git. Puede elegirse un nombre simple mediante `--output=exportacion-local.json`. No acepta rutas arbitrarias, no sirve ese archivo por HTTP y no sobrescribe un archivo existente. El proceso solo informa cantidades y el nombre del archivo. Aplica permisos 0700 al directorio y 0600 al archivo cuando el sistema lo permite; en Windows debes verificar además los permisos NTFS y proteger las copias/respaldos.

Para Docker, los dos proyectos usan redes distintas deliberadamente. No publiques MySQL ni unas ambas redes de forma permanente para exportar. Puedes ejecutar temporalmente la imagen PHP 2.0 en la red privada del legado, montando **solo el directorio `modern`**:

```powershell
# Ejecutar desde modern/. Configurar previamente las variables LEGACY_DB_*.
# En el Compose local antiguo, el host resoluble es andrew-studio-db-1.
$modernPath = (Get-Location).Path
docker run --rm --network andrew-studio_default `
  --mount "type=bind,source=$modernPath,target=/var/www/html" `
  --workdir /var/www/html `
  --env LEGACY_DB_HOST --env LEGACY_DB_PORT --env LEGACY_DB_DATABASE `
  --env LEGACY_DB_USERNAME --env LEGACY_DB_PASSWORD `
  bibliotecary-v2-app php scripts/export-legacy.php
```

Confirma los nombres reales de la red y la imagen con `docker network ls` y `docker image ls` si tu entorno usa nombres diferentes. Este contenedor temporal no publica puertos. No ejecutes el exportador dentro del contenedor legado si su montaje del repositorio es de solo lectura: la creación del archivo fallaría.

El exportador establece `REPEATABLE READ`, comprueba que las tablas sean InnoDB y abre `START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY`. Ambas lecturas pertenecen al mismo snapshot. Ver [manual de transacciones de MySQL](https://dev.mysql.com/doc/refman/8.4/en/commit.html). No exporta configuración, sesiones, variables de entorno ni información de `phpinfo()`.

## Validación y aplicación

Desde `modern/`:

```powershell
# Solo inspección: valida archivo, registros y conflictos, sin escribir nada.
docker compose exec -T app php artisan legacy:import `
  storage/app/private/legacy/exportacion-local.json --dry-run

# Aplicación interactiva: requiere confirmar el lote.
docker compose exec app php artisan legacy:import `
  storage/app/private/legacy/exportacion-local.json

# Automatización local revisada: consentimiento explícito en la CLI.
docker compose exec -T app php artisan legacy:import `
  storage/app/private/legacy/exportacion-local.json --yes --no-interaction
```

Sin `--dry-run`, la operación pide confirmación; `--no-interaction` sin `--yes` no aplica cambios. No hay una opción `--force` que salte la validación.

Antes de iniciar la transacción se valida la estructura completa, los tipos, longitudes, bcrypt, IDs y duplicados del archivo. Dentro de la transacción se vuelven a comprobar conflictos de destino, incluyendo registros en la papelera. No hay merges, sobrescrituras, reasignaciones de contraseña o cambios silenciosos de correo. Un conflicto cancela el lote entero; el mensaje identifica la clase de problema sin imprimir hashes ni SQL con valores.

El título debe ser no vacío y caber en 255 caracteres. Autor y editorial pueden conservar cadenas vacías históricas; año debe ser texto de hasta 50 caracteres; la descripción puede estar vacía y debe caber en 65.535 bytes (`TEXT`). El importador acepta bcrypt `$2y$` reconocidos por PHP, como los generados por `password_hash(..., PASSWORD_BCRYPT)` del legado, sin ejecutar comprobaciones costosas de contraseña. Prefijos históricos que PHP no reconoce mediante `password_get_info()` requieren revisión y no se importan silenciosamente como cuentas incapaces de autenticar. Claves inesperadas, como un rol añadido al JSON, se rechazan. Si el archivo cambia entre la revisión interactiva y la aplicación, el comando cancela la importación.

El SHA-256 de los bytes del archivo impide importar el mismo archivo dos veces. El UUID del lote y las cantidades se muestran al aplicar. Guarda ese UUID: identifica la unidad exacta de rollback. Una edición del JSON cambia su SHA-256, pero no permite eludir los conflictos de `legacy_id` o email.

Si una fila histórica no cumple el contrato, el origen permanece intacto. Revisa una copia del archivo, documenta cualquier transformación acordada y vuelve a validar. No «arregles» la base antigua desde el importador.

## Reversión por lote

La reversión es una herramienta operativa de la migración, separada de la papelera de libros de la aplicación. Solo elimina los registros nuevos creados por ese lote y conserva la evidencia del lote:

```powershell
docker compose exec -T app php artisan legacy:rollback UUID-DEL-LOTE --dry-run
docker compose exec app php artisan legacy:rollback UUID-DEL-LOTE

# Equivalente no interactivo, únicamente tras revisar el dry-run:
docker compose exec -T app php artisan legacy:rollback UUID-DEL-LOTE --yes --no-interaction
```

El manifiesto almacena IDs de destino y fingerprints SHA-256 de todos los atributos persistidos de cada objeto. No almacena contraseñas o bcrypt en texto dentro del manifiesto. Bajo una transacción y locks se verifica que:

- El lote existe y no fue revertido anteriormente.
- Están todas y solo las filas originales del lote.
- Ningún atributo cambió desde la importación, incluidos rol, contraseña, timestamps o estado de papelera.
- Los usuarios importados no se han usado en eventos de auditoría.
- Los libros importados no tienen eventos de auditoría y las cuentas no tienen sesiones persistidas o tokens de recuperación pendientes.

Si cualquiera de esas condiciones falla, se cancela toda la reversión: no elimina una parte del lote ni modifica registros de otros lotes. Un cambio de esquema que altere los atributos también puede bloquear el fingerprint; requiere revisión, no un bypass.

Cuando las verificaciones pasan, se realiza una eliminación física **solo de las filas importadas sin cambios** y se marca `import_batches.rolled_back_at`; la tabla de lotes y su manifiesto permanecen. Se usa eliminación física para liberar `legacy_id` y no confundir una reversión de migración con la papelera de negocio. El archivo original exportado y la base antigua siguen disponibles. El mismo digest queda registrado como procesado, incluso después del rollback; una repetición idéntica requiere revisión operativa, no se reactiva automáticamente.

No se ejecuta `migrate:rollback` para deshacer datos importados: eso revierte el esquema y puede afectar información ajena. Tampoco se revierte automáticamente un lote utilizado o editado; debe planificarse una conciliación conservadora con respaldos.

## Verificación y límites

La suite `modern/tests/Feature/LegacyMigrationTest.php` cubre preservación del bcrypt y del año textual, roles de lector, dry-run, validación atómica, conflictos, importación duplicada, rollback por procedencia y rechazo cuando existen cambios posteriores. Su ejecución y resultados se registran en la documentación de pruebas; la presencia del archivo de pruebas no equivale a una ejecución exitosa.

Durante la implementación no se ejecuta el exportador sobre datos reales. La prueba de importación usa únicamente fixtures ficticias. El corte final, exportación de una instalación existente, promoción de roles y selección del sistema activo son decisiones operativas explícitas. La aplicación antigua puede mantenerse disponible en 8080 mientras se valida la 2.0 en 8081.
