# Seguridad de Andrew's Bibliotecary 2.0 — controles y verificación

Fecha de preparación y ejecución: 2026-11-20. **Integración verificada: 96 pruebas PHP/639 aserciones y 16 pruebas Playwright aprobadas.** Los resultados completos, medidas y límites se conservan en [08_PRUEBAS_RENDIMIENTO_Y_ACCESIBILIDAD.md](08_PRUEBAS_RENDIMIENTO_Y_ACCESIBILIDAD.md). Las ejecuciones parciales siguientes se conservan como trazabilidad y no se suman a la suite final.

## Alcance y separación del legado

La auditoría inicial se conserva en [02_AUDITORIA_SEGURIDAD.md](02_AUDITORIA_SEGURIDAD.md). El código PHP legado no se modifica para aparentar su remediación: 2.0 vive en `modern/`, usa su propio document root `public/` y una base distinta. La conservación del legado en loopback sigue teniendo los riesgos registrados en aquella auditoría.

No se afirma certificación OWASP ASVS ni conformidad integral con un nivel. La trazabilidad siguiente se refiere a las amenazas identificadas y a los controles específicos comprobables.

### Aislamiento operativo del servidor legado

La convivencia introducía un riesgo nuevo: el montaje de la raíz del repositorio del servidor antiguo podía servir `modern/.env` y futuros respaldos locales. Se añadió `compose.override.yaml` en la raíz, con máscaras `tmpfs` para `modern/`, `.local/`, `.git/` y `docs/`. El build del legado usa un contexto mínimo `modern/docker/legacy`, sin copiar el repositorio completo. Estas medidas no alteran los scripts ni la base de datos del legado.

El integrador recreó únicamente el servicio web antiguo. La comprobación posterior exige que la portada siga disponible y que archivos concretos de los directorios enmascarados no puedan recuperarse. Esta mitigación es posterior a `security-baseline.json`; aquella evidencia conserva correctamente las respuestas anteriores, incluidas las de `/.git/HEAD`. El aislamiento operativo no corrige el resto de las vulnerabilidades del PHP legado ni lo convierte en una aplicación apta para publicar.

Resultado comprobado por GET local y registrado en [security-operational-hardening.json](evidence/security-operational-hardening.json): `/` responde 200, `/modern/.env` responde 404 y `/.git/HEAD` responde 404. No se guardaron cuerpos de respuesta.

Después se separaron también los hosts: `localhost:8080` redirige con 302 a
`127.0.0.1:8080` antes de PHP y sin establecer cookies; el destino responde 200.
2.0 usa `localhost:8081`. Cambiar únicamente de puerto no habría aislado las
cookies y el token XSRF respecto del frontend antiguo. El código del legado
sigue intacto. [Comprobación final](evidence/legacy-host-isolation.json).

## Contrato de controles para la nueva aplicación

| Hallazgo de origen | Control de 2.0 que debe existir | Prueba automatizada asignada |
| --- | --- | --- |
| SEC-01 autenticación/autorización | Policies del servidor; lector/bibliotecario/admin; privilegios mínimos en registro; restricciones sobre gestión de cuentas | `BookSecurityTest`, `UserAuthorizationTest`, `AuthSecurityTest` |
| SEC-02 XSS del catálogo | Texto de React/Blade; sin HTML ejecutable para campos bibliográficos | `BookSecurityTest` y E2E: HTML visible como texto, sin marcador JavaScript ejecutado |
| SEC-03 CSRF y logout GET | Middleware Laravel en mutaciones; logout POST | Método y sesión en `AuthSecurityTest`; protección CSRF real en E2E HTTP |
| SEC-04 phpinfo público | Sin endpoint de diagnóstico crudo; errores sanitizados | E2E HTTP de `/info.php` y configuración |
| SEC-05 repositorio/config accesibles | Docroot solo `modern/public/` y reglas de servidor | E2E HTTP de archivos sensibles y comprobación de contenido |
| SEC-06 cookie y sesiones | HttpOnly/SameSite, rotación y logout; Secure para HTTPS | Rotación y salida en PHPUnit; atributos reales de cookie en E2E |
| SEC-07 contraseñas/rate limiting | Hash seguro, política de contraseña y limitador por identidad/IP | `AuthSecurityTest` |
| SEC-08 recuperación ausente | Broker Laravel, token expirado/de un uso, transporte local | `AuthSecurityTest`; entrega real a Mailpit en E2E |
| SEC-09 validación/tipos | Form Requests, límites, role no editable desde perfil/autoregistro, año textual legado | Las tres suites de feature |
| SEC-10 secretos y DB | Config por proyecto, DB independiente, claves fuera del docroot/Git | Inspección de configuración y E2E HTTP; no se imprimen claves |
| SEC-11 excepciones | Manejo central y operaciones transaccionales | Suite de migración independiente y pruebas de error del integrador |
| SEC-12 cabeceras | CSP, frame-ancestors, nosniff y referrer policy | E2E HTTP y ausencia de roturas por CSP |
| SEC-13 dependencias | Lockfiles, auditores de Composer/npm y análisis estático | Comandos/resultados del informe general de QA |
| SEC-14 auditoría | Eventos sin contraseñas/tokens; archivo recuperable | Eventos de login/logout/fallo y ausencia de credenciales en `AuthSecurityTest`; archivo reversible en `BookSecurityTest` |
| SEC-15 SQLi histórica | Eloquent/query builder y valores parametrizados | Apóstrofes y cadenas SQL tratadas como datos en `BookSecurityTest` |

## Suites añadidas

- `modern/tests/Feature/AuthSecurityTest.php`: registro con intento de elevación de rol, hash y atributos ocultos, validación, límite de 72 bytes para bcrypt incluso con Unicode, duplicados, login correcto/incorrecto/desconocido, rotación de sesión, limitación temporal, logout, cuenta desactivada, recuperación con respuesta uniforme, uso único/expiración de token, cambios del perfil/contraseña propios y eventos de auditoría sin credenciales.
- `modern/tests/Feature/BookSecurityTest.php`: matriz de política por rol y estado activo/archivado, acceso público al catálogo, invitado/lector sin permiso de escritura, bibliotecario con alta/edición, año legado textual, archivo/restauración, archivo masivo reservado a admin con contraseña/confirmación exacta, validación, ID inexistente, búsqueda parametrizada, contenido potencialmente XSS conservado como dato, rechazo de ordenación no permitida y búsqueda de tipo array, filtros combinados, paginación y prevención de acceso público a la papelera.
- `modern/tests/Feature/UserAuthorizationTest.php`: matriz de política por rol, permisos de invitado/lector/bibliotecario, creación de cuentas por admin, roles válidos, desactivación lógica, protección de la propia cuenta, efecto de una degradación de privilegios y ausencia de hashes de contraseña en la respuesta administrativa.

Todas utilizan `RefreshDatabase` con SQLite **`:memory:`**, según `modern/phpunit.xml`. No deben apuntar a MySQL ni a datos del legado. `withoutVite()` evita que estas pruebas dependan de un bundle de presentación. No se añaden pruebas triviales que dupliquen getters o los mecanismos internos de SoftDeletes.

## Ejecución y estado

Comando reproducible desde `modern/`:

```powershell
docker compose exec -T app php artisan test --compact tests/Feature/AuthSecurityTest.php tests/Feature/BookSecurityTest.php tests/Feature/UserAuthorizationTest.php
```

Se ejecutaron estos comandos sobre el runtime Docker, con SQLite en memoria y sin modificar MySQL ni el legado:

| Ejecución | Alcance | Resultado real | Duración del runner |
| --- | --- | --- | --- |
| 1 | Los tres archivos, antes de añadir los últimos seis casos | **42 aprobados, 316 aserciones**, salida 0 | 36,31 s |
| 2 | `php artisan test --compact tests/Feature/BookSecurityTest.php`, incluidos los cinco casos nuevos de consulta/filtros/paginación | **20 aprobados, 207 aserciones**, salida 0 | 26,24 s |
| 3 | `php artisan test --compact --filter=test_authentication_audit_records_events_without_credentials` | **1 aprobado, 13 aserciones**, salida 0 | 22,19 s |

La unión de los casos comprobados contiene **48 casos distintos**: no deben sumarse los conteos de las tres ejecuciones, porque se solapan. Evidencia de comandos y resultados: [security-phpunit.json](evidence/security-phpunit.json). Después se ejecutó Pint únicamente sobre los tres archivos de esta suite: salida 0, con ajustes de alineación de PHPDoc en dos archivos. No hubo cambios de lógica posteriores a las comprobaciones.

La integración completa se ejecutó después: 96 pruebas/639 aserciones aprobadas,
PHPStan nivel 5 sin errores y 16 pruebas Playwright aprobadas. Incluye migración,
URLs canónicas y los controles que no demuestra PHPUnit. Evidencia:
[JUnit final](evidence/phpunit-final.xml), [Playwright](evidence/playwright-final.json)
y [revisión independiente del backend](evidence/backend-review.json).

La revisión identificó y corrigió dos problemas adicionales: los enlaces de
recuperación ahora fijan el origen desde `APP_URL`, con rechazo de hosts ajenos
en producción; el cambio de contraseña usa `regenerate(true)` para destruir
también el ID de la propia sesión anterior. Tres pruebas de URLs y un E2E con
una copia de la cookie antigua verifican esas regresiones.

## Qué no demuestra PHPUnit por sí solo

Laravel omite normalmente CSRF mientras ejecuta pruebas unitarias/feature. Por ello, un POST exitoso de estas suites **no demuestra protección CSRF**. El E2E final utiliza un servidor con `APP_ENV=local`, cookies reales y una petición sin token: se verificó el rechazo 419.

La presencia de una cadena `<img ...>` en props Inertia demuestra conservación de datos, no que React la escape en cada vista. Playwright comprobó el alta con HTML/script ficticios, su visualización como texto y que no se ejecutase el marcador ni se creara la imagen inyectada.

Las rutas inexistentes en el router de PHPUnit no demuestran que Apache impida servir archivos estáticos privados. La prueba contra `/.git/HEAD`, `/.env`, `/compose.yaml`, `/composer.json` y `/database/schema.sql` debe hacerse contra el servidor real y comprobar ausencia de contenido, además del estado HTTP.

`Notification::fake()` verifica la emisión de la notificación al destinatario; no verifica SMTP ni la entrega visible. El E2E final verificó entrega SMTP a Mailpit de una cuenta ficticia, origen canónico del enlace, restablecimiento y rechazo al reutilizarlo. No se enviaron mensajes a proveedores externos.

## Riesgos y decisiones que deben quedar explícitos

- HTTP loopback admite cookie sin Secure para desarrollo. En HTTPS se exige Secure y configuración de proxy confiable; este informe no valida un despliegue externo.
- El catálogo público de 2.0 es una decisión de producto nueva y debe figurar en arquitectura/README; los privilegios de escritura permanecen restringidos.
- El campo de publicación es texto por compatibilidad con el legado (`X`, fecha aproximada u otra anotación). No se fuerza una conversión destructiva a entero.
- No hay carga real de archivos en el alcance migrado. No se declara endurecimiento de un subsistema de archivos inexistente.
- No se declara MFA, protección distribuida contra DDoS, TLS de producción, escaneo de imágenes ni auditoría ASVS completa si no existen resultados correspondientes.
- Las operaciones destructivas históricas se sustituyen por archivo lógico recuperable y autorización explícita. Su retorno al estado activo debe probarse; conservar una fila en DB sin flujo de restauración no sería suficiente.
- Las pruebas aisladas con SQLite no demuestran las propiedades de bloqueo bajo concurrencia de MySQL. El invariante de conservar un administrador activo requiere además revisión de transacciones y, para un despliegue real, ensayo concurrente contra una base de pruebas MySQL.
