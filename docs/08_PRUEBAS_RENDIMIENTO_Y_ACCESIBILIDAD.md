# Verificación final — 20 de noviembre de 2026

## Resultado y alcance

La aplicación moderna se comprobó en Windows con Docker Desktop Linux, PHP
8.4.28, MySQL 8.4.13, Node 24.1.0 y Chromium 159.0.8154.6. Se conservaron los
archivos y la base del legado. No se publicó ni desplegó el proyecto.

| Comprobación | Resultado ejecutado | Evidencia |
| --- | --- | --- |
| Suite PHP completa | 96 pruebas, 639 aserciones; 0 fallos/errores/omisiones | JUnit (referencia histórica o evidencia local no publicada) |
| Análisis PHP | PHPStan/Larastan nivel 5: sin errores | `phpstan.neon`, ejecución en Docker |
| Formato PHP | Pint aplicado y verificado con rutas explícitas | Ejecución `vendor/bin/pint --format agent ...` |
| TypeScript | `tsc --noEmit`: aprobado | `npm run typecheck` |
| Compilación | Vite, configuración TypeScript explícita: aprobado | `npm run build`, manifiesto en `modern/public/build/` |
| Playwright integrado | 16 pruebas aprobadas, 0 fallos, 0 reintentos inestables, 0 omitidas; 60.3 s | Informe JSON (referencia histórica o evidencia local no publicada) |
| Axe | 5 pruebas aprobadas; revisión automatizada de 10 rutas principales y variantes claras | Informe específico (referencia histórica o evidencia local no publicada) |
| Dependencias npm | Sin vulnerabilidades reportadas en la auditoría final | npm (referencia histórica o evidencia local no publicada) |
| Dependencias Composer | Sin advisories ni paquetes abandonados reportados | Composer (referencia histórica o evidencia local no publicada) |
| Conservación del legado | 34 archivos SHA-256 idénticos; 0 cambios | Manifiesto final (referencia histórica o evidencia local no publicada) |
| Licencia | LICENSE original y copia moderna SHA-256 idénticos | Ambos archivos GPL-3.0 conservados |

Los números de ejecuciones parciales anteriores no se suman a la suite completa.
El JUnit incluye una prueba unitaria de ejemplo heredada del scaffold y 95
pruebas Feature. Las pruebas de migración y de seguridad se identifican por sus
clases; el total no se presenta como 96 vulnerabilidades distintas.

## Qué se probó

**Servidor:** autenticación válida/inválida, duplicados, hash de contraseñas,
rotación de sesión, limitación de intentos, desactivación, recuperación expirada
y de un uso, permisos por rol y por estado activo/archivado, asignación de roles,
validación de entradas y consultas parametrizadas. Las matrices de políticas se
prueban además de las peticiones HTTP. Se verifica que la auditoría no almacene
contraseñas, hashes ni remember tokens.

**Migración:** validación de estructura y longitudes, IDs duplicados, conflictos,
dry-run sin cambios, conservación del bcrypt y año textual, transacciones,
digest repetido y reversión limitada al lote. Se rechaza revertir si faltan o
sobran filas, hay cambios posteriores, papelera, auditoría, sesiones o tokens
asociados. No se ejecutó el exportador contra la base original.

**Navegador real:** registro como lector, acceso administrativo denegado, salida,
búsqueda/filtros/orden/paginación/vista de tabla, estados vacíos, alta/edición,
archivado/restauración, gestión de cuentas e historial. Un título y descripción
con HTML/script de prueba se conservan como texto y no ejecutan JavaScript.
Las pruebas se realizan sobre datos ficticios, no sobre registros reales.

CSRF se comprueba con una petición real sin token, que devuelve 419. Se revisan
HttpOnly y SameSite de la cookie, CSP, `nosniff`, anti-framing y respuestas 403/404
para archivos privados. El cambio de contraseña invalida una copia de la cookie
anterior, incluyendo la propia sesión regenerada. La recuperación completa se
comprueba mediante SMTP a Mailpit, enlace canónico y rechazo del segundo uso.
No se acredita entrega a un servicio de correo externo.

**Responsive y acceso:** anchuras 390, 768 y 1440 px, ausencia de desbordamiento
horizontal del documento, navegación móvil y teclado. Axe utiliza las etiquetas
`wcag2a`, `wcag2aa`, `wcag21aa` y `wcag22aa`; incluye portada, catálogo, acceso,
registro, panel, gestión, formulario, personas, historial y perfil. Perfil y
portada también se comprueban en tema claro. No se deshabilita la regla de
contraste: sus cuatro hallazgos iniciales se corrigieron en CSS y se repitió la
prueba. Esto no sustituye una evaluación manual integral con lectores de pantalla,
zoom, diferentes motores y personas con discapacidad.

## Aislamiento de pruebas y del legado

PHPUnit usa SQLite en memoria. Playwright usa el servicio `app-e2e` en 8082 con
su archivo SQLite privado, cookie propia y `APP_ENV=local` para mantener CSRF
activo. No se usó `APP_ENV=testing` en el servidor de navegador porque Laravel
omite allí la verificación CSRF. La base MySQL de demostración en 8081 y la
base original de 8080 son independientes de los datos mutables de esos tests.

Las capturas y métricas de presentación leen la demostración en 8081; su acceso
administrativo solo genera sesiones/eventos normales en la base moderna. Los
scripts no ejecutan borrados ni importaciones sobre el legado.

Se verificó una redirección 302 de `localhost:8080` a `127.0.0.1:8080`, antes de
PHP y sin `Set-Cookie`. El legado responde 200 en su host separado. Las rutas
`/modern/.env`, `/.git/HEAD` y el respaldo privado devuelven 404. La separación de
host evita que el frontend antiguo y el moderno compartan identidad de cookies
por utilizar únicamente puertos distintos. Las máscaras de `compose.override.yaml`
ocultan además los directorios nuevos y privados. Evidencia (referencia histórica o evidencia local no publicada).

El legado conserva vulnerabilidades de su código, por diseño de conservación;
no debe publicarse ni considerarse remediado por estas medidas operativas.

## Rendimiento medido

Una ejecución en Chromium headless sobre AMD Ryzen 7 5700G, Windows
10.0.26320, viewport 1440×1000, DPR 1, red loopback y backend caliente. No se
aplicó throttling de CPU/red ni se utilizó un teléfono físico. El instante UTC
del archivo de evidencia corresponde a la noche local del 20 de noviembre.

| Métrica de laboratorio | Observación |
| --- | --- |
| TTFB | 191.8 ms |
| FCP | 412 ms |
| LCP observado | 412 ms |
| CLS observado | 0.000093 |
| Tareas largas observadas antes de interacción | 0 |
| Transferencia inicial de recursos | 238054 bytes |
| JavaScript transferido inicialmente | 144558 bytes |
| Three.js antes de activarlo | No cargado |
| WebGL tras activación voluntaria | Renderizado disponible |
| Cadencia rAF durante interacción, 120 muestras | Media 16.665 ms; p95 16.7 ms |

Métricas completas y contexto (referencia histórica o evidencia local no publicada). La cadencia
de callbacks, próxima a 60/s en este equipo, no certifica 60 FPS de GPU ni una
garantía para otros dispositivos. LCP/CLS son una observación, no percentiles de
usuarios reales ni resultados de Lighthouse. No se ejecutó una prueba de carga
con 50.000 registros o concurrencia de producción.

El renderizador 3D solo se importa al activarlo, dibuja bajo demanda y libera
recursos al desmontarse. Se comprobaron tanto `prefers-reduced-motion` como un
contexto sin WebGL: ambos conservan una presentación estática utilizable. El
catálogo y los módulos de gestión no cargan la escena.

La latencia del montaje de `vendor/` en Windows se detectó durante integración.
Se movieron las dependencias PHP a `modern_vendor` y se retiró instrumentación
web de Boost. La medición final utiliza esa configuración; las ejecuciones
fallidas previas se consideran diagnóstico y no resultados aprobados.

## Capturas y revisión visual

Se generaron y revisaron capturas reales de portada (referencia histórica o evidencia local no publicada),
catálogo (referencia histórica o evidencia local no publicada), ficha (referencia histórica o evidencia local no publicada),
acceso (referencia histórica o evidencia local no publicada), panel (referencia histórica o evidencia local no publicada),
gestión (referencia histórica o evidencia local no publicada), formulario (referencia histórica o evidencia local no publicada),
personas (referencia histórica o evidencia local no publicada), historial (referencia histórica o evidencia local no publicada),
perfil (referencia histórica o evidencia local no publicada), portada móvil (referencia histórica o evidencia local no publicada)
y catálogo móvil (referencia histórica o evidencia local no publicada), además del
estado antiguo (referencia histórica o evidencia local no publicada). No son mockups.

La captura del legado es opcional al reproducir la suite en una máquina donde
no se haya iniciado el servidor antiguo; en esta ejecución sí se obtuvo.

## Reproducción

Desde la raíz del repositorio:

```powershell
.\modern\scripts\install.ps1 -Demo
.\modern\scripts\test.ps1
```

El instalador conserva `.env`, `APP_KEY` y los datos existentes; no utiliza
`migrate:fresh` ni borra volúmenes. La opción `-Demo` es explícita e idempotente.
Se verificó su reejecución en este entorno, no una instalación en otra máquina
limpia. El script de QA detiene `app-e2e` al terminar; `-KeepTestServer` permite
dejarlo abierto de forma explícita. La aplicación principal continúa disponible.

Los informes detallados se generan en `modern/output/`. Los resultados relevantes
de esta entrega se conservan en `docs/evidence/`. No se ejecutaron escáneres de
CVE de imágenes Docker, auditoría criptográfica, pentesting externo, certificación
ASVS o una certificación de conformidad WCAG.
