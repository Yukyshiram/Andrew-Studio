# Comparación funcional y operación local

Fecha de revisión: 20 de noviembre de 2026. La comparación toma como origen el árbol legado restaurado recibido, que ya incluía consultas preparadas y compatibilidad PHP 8; no atribuye esas reparaciones a 2.0. El commit histórico y el árbol restaurado se distinguen en la [auditoría inicial](01_AUDITORIA_LEGACY.md).

## Original frente a 2.0

| Área | Legado restaurado | 2.0 / ruta principal | Evidencia y límite |
| --- | --- | --- | --- |
| Portada y consulta | PHP con tablas completas; CSS de ancho fijo | `/`, `/catalog`, `/catalog/{id}`; fichas, tarjetas/tabla y estados vacíos | [Sistema visual](05_SISTEMA_DISENO.md), E2E (referencia histórica o evidencia local no publicada) y capturas desktop/móvil; no cubre todos los dispositivos |
| Búsqueda | Título, coincidencia parcial, sin paginación | `/catalog`: título/autor/editorial, categoría/autor, orden permitido, 12 resultados por página | `modern/app/Services/CatalogService.php`; `BookSecurityTest`; usa `LIKE`, sin ensayo de gran volumen |
| Registro y sesión | Registro sin contrato de validación; menús administrativos públicos | `/register`, `/login`, logout por POST; lector por defecto, rate limit y sesión regenerada | `AuthSecurityTest`; [regresiones](07_SEGURIDAD_IMPLEMENTADA.md); TLS de producción pendiente |
| Permisos | Nombres de directorio sin autorización efectiva | Policies del servidor para lector, bibliotecario y administrador | `BookSecurityTest`, `UserAuthorizationTest`; ocultar botones no es el control |
| Alta de ficha | Cinco metadatos, sin validación central | `/manage/books/create`, validación de servidor; año conservado como texto | Form Requests y prueba del año `X`; no existen archivos adjuntos ni ejemplares |
| Edición | Sin `UPDATE` de fichas | `/manage/books/{id}/edit`, bibliotecario/admin | Mejora nueva; prueba autorizada y auditoría |
| Eliminación individual | `DELETE` irreversible por ID | Archivar mediante `DELETE /manage/books/{id}` y restaurar desde papelera | `BookSecurityTest`; soft delete de negocio, distinto del rollback de migración |
| Eliminación de catálogo | Borrado físico sin permiso/confirmación | `POST /manage/books/archive-all`: admin, contraseña actual y `ARCHIVAR CATÁLOGO` | `BookSecurityTest`; conserva los registros para restauración |
| Cuentas | Registro público y sin roles reales | `/manage/users`: admin crea cuentas, cambia rol y desactiva lógicamente | `UserAuthorizationTest`; no hay restauración de cuentas desde interfaz |
| Recuperación y perfil | Sin recuperación de contraseña | `/forgot-password`, `/reset-password/{token}`, `/profile`; broker Laravel y SMTP Mailpit | Backend y recorrido E2E (referencia histórica o evidencia local no publicada) con SMTP local, token de un uso y sesión revocada; sin proveedor externo |
| Diagnóstico y secretos | `info.php` público y raíz del repositorio publicada | Docroot moderno `public/`; sin endpoint phpinfo; máscaras para la convivencia antigua | Hardening operativo (referencia histórica o evidencia local no publicada); `info.php` del legado sigue siendo un riesgo |
| Historial | Sin registro de acciones | `/manage/audit`, reservado a admin; eventos sin credenciales | `AuthSecurityTest` y modelo `AuditEvent`; no equivale a monitorización operativa |
| Datos históricos | Sin migraciones ni reversión por lote | Exportador de lectura, importación atómica, lote SHA-256 y rollback con fingerprints | [Migración](06_MIGRACION.md); no se exportaron datos reales durante el trabajo |
| Dependencias | Sin Composer/npm ni suite de proyecto | Lockfiles, scripts, PHPUnit, PHPStan, Playwright y axe | [Inventarios y riesgos](10_LICENCIAS_Y_RIESGOS.md); la existencia de herramientas no acredita su ejecución |

No se introducen préstamos, devoluciones, reservas, multas, ISBN, disponibilidad por ejemplar, OCR ni subida de archivos. Las estadísticas describen fichas, autorías, editoriales y categorías del catálogo.

## Entornos separados

| Entorno | Puerto de la aplicación | Base de datos | Uso |
| --- | --- | --- | --- |
| Raíz / legado | `127.0.0.1:8080` | MySQL original | Conservación con host distinto del moderno |
| `modern/` | `localhost:8081`, loopback | MySQL 8.4 y volumen propio | Demostración y operación local de 2.0 |
| Perfil `qa` | `localhost:8082`, loopback | SQLite privado `e2e.sqlite` | Flujos de navegador con datos ficticios y CSRF real |
| PHPUnit | Sin puerto propio | SQLite `:memory:` | Regresiones aisladas, sin tocar MySQL |

Mailpit expone su interfaz en 8026; el SMTP es interno entre contenedores. Ninguna base MySQL publica puerto al host. Los secretos locales están en `modern/.env`, ignorado por Git; el instalador conserva ese archivo cuando ya existe.

`app` y `app-e2e` comparten únicamente el volumen de dependencias `modern_vendor`, además del código montado de `modern/`; mantienen sus bases y cookies separadas. Composer se ejecuta desde Docker y escribe en ese volumen. El `vendor/` del host no determina lo que carga el runtime. El entrypoint crea los directorios de ejecución y prepara los permisos de `www-data` sobre `storage/` y `bootstrap/cache/` de la aplicación nueva en cada arranque.

El Compose de la raíz carga automáticamente el nuevo `compose.override.yaml`. Este añade máscaras temporales para directorios nuevos y Git, y usa un contexto de build mínimo sin copiar todo el repositorio. Se conservaron las fuentes originales; no debe omitirse el override al arrancar el legado. En la primera fase de aislamiento, la portada antigua siguió respondiendo 200 y `/modern/.env` y `/.git/HEAD` devolvieron 404: evidencia HTTP (referencia histórica o evidencia local no publicada).

La segunda fase cambia la URL del legado a `http://127.0.0.1:8080`. El moderno continúa en `http://localhost:8081`: separar solo puertos no separa cookies, por lo que se utilizan hosts diferentes. `modern/docker/legacy/isolation.conf` añade una redirección 302 desde `localhost:8080` antes de ejecutar PHP y rechaza hosts ajenos. El Dockerfile del contexto mínimo copia únicamente esa configuración y habilita rewrite; no copia código ni secretos. Las máscaras siguen vigentes. Se verificaron HTTP 302 con `Location: http://127.0.0.1:8080/` y HTTP 200 en el destino. Las tres comprobaciones de archivos privados (referencia histórica o evidencia local no publicada) devolvieron 404 para `/modern/.env`, `/.git/HEAD` y el snapshot de `.local/backups/`.

La verificación final de integridad (referencia histórica o evidencia local no publicada) compara los 34 archivos originales inventariados: todos conservan su hash y no registra cambios. Incluye el README y la licencia originales; la licencia en `modern/` conserva también el mismo SHA-256 que la raíz.

## Operación cotidiana

Instala desde la raíz con `.\modern\scripts\install.ps1 -Demo`; el [README de 2.0](../modern/README.md) explica requisitos, cuentas y recorrido. Para comprobar salud y revisar errores, desde `modern/`:

```powershell
docker compose ps
docker compose logs --tail=100 app
docker compose logs --tail=100 db
```

No compartas logs completos sin revisar datos personales. Para detener desde la raíz, `.\modern\scripts\stop.ps1` conserva el volumen. Después puedes reiniciar desde `modern/` con `docker compose up -d --wait`. No regeneres `APP_KEY` en una instalación con datos: la clave protege información cifrada y sesiones.

La reejecución exacta de `install.ps1 -Demo` terminó con salida 0 sobre el entorno existente: Composer/npm y build aprobados, migraciones ya aplicadas, semilla completada y `APP_KEY` conservada. Esta validación cubre la repetición local, sin acreditar una instalación desde cero en una máquina limpia.

## Respaldo de la base nueva

La copia inicial del legado está en `.local/backups/legacy-before-modernization.zip`, junto con el parche de restauración. Los hashes iniciales constan en legacy-integrity.json (referencia histórica o evidencia local no publicada). Ese snapshot conserva las fuentes recibidas; no sustituye un respaldo actualizado de MySQL.

El siguiente ejemplo crea un dump de 2.0, sin imprimir la contraseña y sin pasar SQL por la recodificación de la salida de PowerShell. Ejecútalo desde `modern/`, con Docker iniciado:

```powershell
$backupDirectory = [IO.Path]::GetFullPath((Join-Path (Get-Location).Path '..\.local\backups'))
New-Item -ItemType Directory -Path $backupDirectory -Force | Out-Null
$backupFile = Join-Path $backupDirectory ('bibliotecary-v2-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.sql')
docker compose exec -T db sh -c 'MYSQL_PWD="$MYSQL_PASSWORD" mysqldump --single-transaction --no-tablespaces -u"$MYSQL_USER" "$MYSQL_DATABASE" > /tmp/bibliotecary-backup.sql'
if ($LASTEXITCODE -ne 0) { throw 'Falló el dump; no se considera una copia válida.' }
docker compose cp db:/tmp/bibliotecary-backup.sql $backupFile
if ($LASTEXITCODE -ne 0) { throw 'Falló la copia del dump al host.' }
Get-Item -LiteralPath $backupFile | Select-Object Name, Length
Get-FileHash -LiteralPath $backupFile -Algorithm SHA256
```

La contraseña procede del entorno interno del contenedor. El archivo resultante contiene datos y hashes de contraseña: protege sus permisos NTFS, limita el acceso y mantén una copia cifrada fuera del equipo. Conserva también `APP_KEY` y la configuración necesaria en un almacén privado separado; no los agregues a Git. Las exportaciones privadas y adjuntos futuros que se incorporen al dominio necesitan su propio respaldo.

No se ha ensayado una restauración de producción. Antes de depender de un respaldo, restaura una copia en un proyecto y una base desechables, verifica cantidades e inicio de sesión y documenta el resultado. La restauración sobre una base existente requiere una ventana operativa y revisión del destino; este documento no incluye un comando que sobrescriba por defecto la base activa. La retención, cifrado, programación y monitorización de copias siguen pendientes para operación externa.

## Recuperación y reversión

- Una ficha archivada se recupera desde la papelera por bibliotecario o administrador. Es la primera vía para un error de gestión.
- La desactivación de una cuenta no cuenta con restauración en interfaz. Conserva el historial y requiere revisión administrativa fuera de ese flujo si hay que revertirla.
- Una importación tiene reversión específica por UUID: empieza con `docker compose exec -T app php artisan legacy:rollback UUID-DEL-LOTE --dry-run`. Los comandos interactivos y restricciones se detallan en [Migración](06_MIGRACION.md#reversión-por-lote).
- El rollback del importador solo admite filas originales intactas, sin uso posterior. Si el lote fue modificado o utilizado, se detiene y se planifica conciliación; no se fuerza la eliminación ni se usa `migrate:rollback` para deshacer datos.
- Volver a consultar el legado en 8080 no sincroniza cambios hechos en 2.0. No se ha ejecutado un corte ni sincronización bidireccional. Debe elegirse explícitamente un sistema de escritura antes de una migración real.

## Estado verificable de calidad

La suite completa de PHPUnit (referencia histórica o evidencia local no publicada) registra **96 pruebas, 639 aserciones, sin fallos, errores ni casos omitidos**. Incluye las regresiones backend y migración; no debe sumarse a las ejecuciones parciales anteriores de seguridad (referencia histórica o evidencia local no publicada). La auditoría npm final (referencia histórica o evidencia local no publicada) informa 0 vulnerabilidades y 140 dependencias; la auditoría Composer (referencia histórica o evidencia local no publicada), ningún advisory ni paquete abandonado. Son resultados locales y puntuales.

La revisión independiente del backend (referencia histórica o evidencia local no publicada) registró y volvió a comprobar la corrección del dominio canónico de recuperación: 3 pruebas y 5 aserciones aprobadas. Un Host ajeno devuelve 400 en producción y los enlaces se generan desde `APP_URL`; la restricción de Host de Laravel se omite en local y en pruebas unitarias. Esta comprobación fue sintética, sin enviar correo ni modificar bases reales.

PHPStan en nivel 5, TypeScript y build aprobaron la integración. La suite completa Playwright (referencia histórica o evidencia local no publicada) registra **16 casos aprobados, sin fallos, omisiones ni casos inestables**. Incluye autenticación/roles, CRUD, XSS tratado como texto, CSRF por HTTP real, cookies/cabeceras/archivos privados, recuperación SMTP local y token de un uso, revocación de sesión anterior, móvil, movimiento reducido y accesibilidad automatizada. Los cinco casos de axe de la ejecución completa no deben sumarse de nuevo al informe focalizado siguiente. El [informe final de QA](08_PRUEBAS_RENDIMIENTO_Y_ACCESIBILIDAD.md) reúne los resultados y duraciones de la última ejecución.

El informe final de accesibilidad automatizada (referencia histórica o evidencia local no publicada) registra **5 pruebas aprobadas, sin fallos ni omisiones, en 14,1 s**. Comprende portada, catálogo, login y registro, además de seis vistas de gestión/perfil en tema oscuro y perfil/portada en tema claro. La ausencia de violaciones detectadas por axe en esos estados no acredita conformidad WCAG integral; falta la revisión manual completa.

### Capturas revisadas

Se conservaron y revisaron visualmente 13 capturas: legado, portada, catálogo, ficha, acceso, panel, gestión, formulario, personas, historial, perfil y dos vistas móviles. La inspección no observó errores de layout en esas capturas; no sustituye una revisión de todas las combinaciones de datos o dispositivos.

| Vista | Evidencia |
| --- | --- |
| Legado | 00-legado.png (referencia histórica o evidencia local no publicada) |
| Portada y catálogo modernos | 01-portada.png (referencia histórica o evidencia local no publicada), 02-catalogo.png (referencia histórica o evidencia local no publicada) |
| Ficha y acceso | 03-ficha.png (referencia histórica o evidencia local no publicada), 04-acceso.png (referencia histórica o evidencia local no publicada) |
| Panel y gestión | 05-panel.png (referencia histórica o evidencia local no publicada), 06-gestion.png (referencia histórica o evidencia local no publicada), 07-formulario.png (referencia histórica o evidencia local no publicada) |
| Personas, historial y perfil | 08-personas.png (referencia histórica o evidencia local no publicada), 09-historial.png (referencia histórica o evidencia local no publicada), 10-perfil.png (referencia histórica o evidencia local no publicada) |
| Móvil | 11-portada-movil.png (referencia histórica o evidencia local no publicada), 12-catalogo-movil.png (referencia histórica o evidencia local no publicada) |

### Medición local de rendimiento

La evidencia de navegador (referencia histórica o evidencia local no publicada) corresponde a una ejecución Chromium headless 159.0.8154.6 sobre Windows, Ryzen 7 5700G, viewport 1440×1000, DPR 1, sin throttling, red loopback y backend caliente. No es una prueba en un móvil físico ni un percentil de usuarios reales.

Las cifras de LCP, FCP, TTFB, CLS, tareas largas, transferencia inicial e intervalos rAF se mantienen en el [informe final de rendimiento](08_PRUEBAS_RENDIMIENTO_Y_ACCESIBILIDAD.md) y su JSON enlazado. La escena de Three.js no se carga inicialmente y WebGL se activa al solicitarla.

La cadencia rAF no mide directamente FPS de GPU ni garantiza una tasa en todos los dispositivos. Las pruebas SQLite tampoco demuestran concurrencia de MySQL. La instalación en una máquina limpia y la recuperación de producción no se dan por verificadas con estas medidas.

Los [riesgos pendientes](10_LICENCIAS_Y_RIESGOS.md#registro-de-riesgos-y-limitaciones) delimitan cualquier evaluación de publicación futura. No se efectuó un despliegue externo.
