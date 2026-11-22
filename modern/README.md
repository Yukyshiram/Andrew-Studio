# Andrew's Bibliotecary 2.0

Catálogo bibliográfico en español con consulta pública, cuentas y gestión por roles. Incorpora edición de fichas, filtros, papelera recuperable, recuperación de contraseña e historial administrativo. Conserva título, autoría, editorial, año textual y descripción del dominio original. No gestiona préstamos, devoluciones ni ejemplares físicos.

La aplicación está en `modern/`. El PHP original se conserva en la raíz y usa otra base de datos. La instalación nueva no importa datos históricos ni publica servicios fuera de loopback.

![Portada de Andrew's Bibliotecary 2.0](../docs/screenshots/01-portada.png)

## Instalación local en Windows

Requisitos: Docker Desktop iniciado con contenedores Linux y Docker Compose, Node.js 24 y npm. El entorno inspeccionado usa Node 24.1.0 y npm 11.18.0. PHP y Composer se ejecutan dentro de Docker; no se requieren instalaciones globales de esas herramientas ni Python.

Desde la raíz del repositorio, en PowerShell:

```powershell
.\modern\scripts\install.ps1 -Demo
```

El script crea `modern/.env` si no existe, genera contraseñas aleatorias para el MySQL nuevo, instala dependencias desde los lockfiles, compila recursos, genera `APP_KEY` si está vacía, inicia servicios y aplica migraciones. `-Demo` agrega exclusivamente datos ficticios: 24 fichas y tres cuentas. Para una base nueva sin esos datos, omite `-Demo`. Una configuración `.env` existente se conserva; si está incompleta, revisa sus valores antes de volver a ejecutar el script.

Se verificó la reejecución exacta de `install.ps1 -Demo` en el entorno existente: salida 0, dependencias y build aprobados, migraciones al día, semilla aplicada y `APP_KEY` conservada. Esta comprobación valida la repetición en ese runtime; la instalación en una máquina limpia sigue fuera de la evidencia disponible.

Composer instala en el volumen Docker `modern_vendor`, compartido por `app` y `app-e2e`, para evitar la latencia del montaje de Windows. Ese volumen es la fuente de dependencias PHP del runtime; un `vendor/` existente en el host no lo reemplaza. El entrypoint prepara en cada arranque los directorios `storage/` y `bootstrap/cache/` de la aplicación nueva con permisos de escritura para `www-data`.

| Servicio | Dirección local | Persistencia / alcance |
| --- | --- | --- |
| Aplicación 2.0 | [localhost:8081](http://localhost:8081) | MySQL 8.4 independiente, volumen `modern_database` del proyecto Compose |
| Buzón Mailpit | [localhost:8026](http://localhost:8026) | Correo de recuperación capturado localmente; sin entrega externa |
| Aplicación E2E | [localhost:8082](http://localhost:8082) | Solo perfil `qa`; SQLite privado separado |
| Legado | [127.0.0.1:8080](http://127.0.0.1:8080) | Proyecto y volumen originales; host distinto del moderno |

Para iniciar el legado desde la raíz, conserva la carga automática del override nuevo:

```powershell
docker compose up -d --build
```

`compose.override.yaml` de la raíz oculta `modern/`, `.local/`, `.git/` y `docs/` al servidor antiguo. Es necesario porque su DocumentRoot abarca la raíz del repositorio. No lo omitas usando únicamente `-f compose.yaml`. El PHP legado conserva riesgos propios y debe permanecer local; consulta la [auditoría](../docs/02_AUDITORIA_SEGURIDAD.md).

La dirección del legado cambia explícitamente a `http://127.0.0.1:8080`, mientras 2.0 usa `http://localhost:8081`. Cambiar solo de puerto no separa cookies: estos hosts distintos evitan compartir las cookies y XSRF con el PHP antiguo. Se verificó HTTP 302 desde `localhost:8080` hacia `http://127.0.0.1:8080/` antes de ejecutar PHP y HTTP 200 en el destino. Las [comprobaciones de archivos privados](../docs/evidence/legacy-host-isolation.json) devolvieron 404. No se modificaron las fuentes originales para introducir este aislamiento.

## Recorrido de demostración

Estas credenciales son públicas y sirven únicamente para la demostración local. El seeder requiere entorno `local` o `testing` y `DEMO_SEED_ENABLED=true`.

| Rol | Correo | Contraseña |
| --- | --- | --- |
| Administrador | `demo.admin@example.test` | `Demo-Admin2026!` |
| Bibliotecario | `demo.biblioteca@example.test` | `Demo-Biblio2026!` |
| Lector | `demo.lector@example.test` | `Demo-Lector2026!` |

1. Abre el catálogo público, busca por título, autor o editorial y combina categoría, autor y orden. Los filtros quedan en la URL y la consulta pagina de 12 en 12.
2. Entra como bibliotecario para crear o editar una ficha, archivarla y restaurarla desde la papelera. El año admite valores históricos como `X`; las portadas son composiciones locales.
3. Entra como administrador para gestionar cuentas y consultar el historial. Archivar todo exige la contraseña actual y la frase exacta `ARCHIVAR CATÁLOGO`; los libros siguen recuperables.
4. Solicita recuperación de contraseña y revisa el mensaje en Mailpit. Este buzón local no acredita entrega a un proveedor externo.

El registro público siempre crea lectores. Las cuentas desactivadas no pueden autenticarse; no existe una pantalla de restauración de cuentas. El perfil y cambio de contraseña requieren la contraseña actual según el tipo de modificación.

## Desarrollo y comprobaciones

Desde `modern/`:

```powershell
docker compose ps
docker compose logs --tail=100 app
npm run dev
```

Para compilar sin el servidor de desarrollo, usa `npm run build`. Los scripts npm seleccionan expresamente `vite.config.ts` con `--config`; el `vite.config.js` del scaffold no se usa para estos comandos. Prettier está instalado como herramienta de desarrollo. Laravel Boost se limita a CLI en `config/boost.php`, con captura de logs de navegador deshabilitada; no agrega sus rutas o scripts al frontend web.

Para aplicar el formato PHP dentro del contenedor, usa rutas explícitas: la imagen no incluye Git y no admite el modo `--dirty` de Pint.

```powershell
docker compose exec -T app vendor/bin/pint --format agent app bootstrap config database routes tests scripts/export-legacy.php
```

Desde la raíz, la comprobación reproducible es:

```powershell
.\modern\scripts\test.ps1
# Comprobaciones sin navegador:
.\modern\scripts\test.ps1 -SkipBrowsers
# Mantener disponible el servidor de QA al terminar:
.\modern\scripts\test.ps1 -KeepTestServer
```

El script ejecuta PHPUnit, PHPStan, TypeScript, build y auditorías de dependencias. Sin `-SkipBrowsers`, instala Chromium, prepara `app-e2e` y ejecuta Playwright. Por defecto detiene `app-e2e` al finalizar; `-KeepTestServer` conserva ese servidor para inspección. PHPUnit usa SQLite en memoria; E2E usa `storage/app/private/e2e.sqlite` en 8082, con CSRF real y cookie distinta de la aplicación principal. Los flujos de prueba modifican datos de demostración de esa base aislada. Los informes de navegador se generan en `modern/output/playwright/`.

La suite final de [PHPUnit](../docs/evidence/phpunit-final.xml) registra 96 pruebas y 639 aserciones aprobadas. PHPStan nivel 5, TypeScript y build aprobaron la integración. La [suite completa Playwright](../docs/evidence/playwright-final.json) aprobó sus 16 casos, sin omisiones, fallos ni casos inestables. Las [cinco pruebas automatizadas de accesibilidad](../docs/evidence/accessibility-final.json) aprobaron, incluidas vistas públicas, gestión y perfil; no equivalen a conformidad WCAG completa.

La [medición histórica de rendimiento](../docs/evidence/browser-performance.json) registra LCP, FCP, TTFB, CLS y cadencia rAF en Chromium, Windows y backend caliente. Incluía una escena WebGL opcional, retirada de la versión actual por petición del usuario. Se conservan las portadas y la apertura animada con CSS. Los resultados históricos dependen de ese entorno y no certifican FPS de GPU ni rendimiento móvil. Se conservaron [13 capturas](../docs/screenshots/) de escritorio y móvil revisadas visualmente. Consulta el [informe de pruebas](../docs/08_PRUEBAS_RENDIMIENTO_Y_ACCESIBILIDAD.md) y la [comparación y operación](../docs/09_COMPARACION_Y_OPERACION.md).

## Datos, respaldo y parada

La importación es voluntaria, de solo lectura en origen y transaccional en destino. Conserva bcrypt y años textuales, asigna lectores y registra lotes con SHA-256. Revisa primero `--dry-run`; la reversión rechaza lotes usados o modificados. Consulta el [procedimiento de migración](../docs/06_MIGRACION.md).

Para detener 2.0 conservando su volumen:

```powershell
.\modern\scripts\stop.ps1
```

El script conserva los volúmenes de datos y dependencias. El volumen no sustituye una copia recuperable; véanse los [respaldos y recuperación](../docs/09_COMPARACION_Y_OPERACION.md#respaldo-de-la-base-nueva).

## Arquitectura y documentación

Laravel 13/PHP 8.4, React 19 y TypeScript, Inertia 3, Tailwind CSS 4, componentes basados en Radix y el patrón shadcn/ui, Inter local y MySQL 8.4. Sesiones y autorización se resuelven en el servidor. La búsqueda usa `LIKE` parametrizado; no se presenta como motor full text ni como un ensayo de 50.000 registros.

- [Auditoría del legado](../docs/01_AUDITORIA_LEGACY.md) y [seguridad inicial](../docs/02_AUDITORIA_SEGURIDAD.md).
- [Plan técnico](../docs/03_PLAN_TECNICO.md), [arquitectura y permisos](../docs/04_ARQUITECTURA.md), [sistema de diseño](../docs/05_SISTEMA_DISENO.md).
- [Migración](../docs/06_MIGRACION.md), [controles de seguridad](../docs/07_SEGURIDAD_IMPLEMENTADA.md), [pruebas y rendimiento](../docs/08_PRUEBAS_RENDIMIENTO_Y_ACCESIBILIDAD.md), [comparación y operación](../docs/09_COMPARACION_Y_OPERACION.md).
- [Licencias y riesgos pendientes](../docs/10_LICENCIAS_Y_RIESGOS.md).

## Licencia

GNU GPL versión 3: [LICENSE](LICENSE), copia del [LICENSE original](../LICENSE). Los manifiestos de la aplicación declaran `GPL-3.0-only`; las dependencias mantienen sus propias licencias y avisos. Consulta el [inventario y sus límites](../docs/10_LICENCIAS_Y_RIESGOS.md).
