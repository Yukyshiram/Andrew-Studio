# Preparación de revisión y publicación 3.0

Este documento prepara acciones futuras. No acredita un PR remoto, un despliegue, un merge ni una URL pública. La instrucción de la misión exige aprobación explícita antes de push, merge o publicación; esas operaciones no se ejecutaron.

## Estado comprobado

- Repositorio: `Yukyshiram/Andrew-Studio`. Trabajo local: `codex/bibliotecary-3`, basado en la versión 2.6 conservada en `827be7c`.
- La demo se compila desde la **raíz**, con `npm ci` y `npm run build`; salida `dist`. No debe seleccionarse `demo/` como Root Directory: importa presentación y recursos legales compartidos de `modern/resources/` y `modern/legal/`.
- `vercel.json` usa Vite, fallback SPA hacia `/index.html` y cabeceras de seguridad. No incluye funciones PHP, MySQL, secretos ni un backend simulado por HTTP.
- GitHub Actions ejecuta las puertas de demo y Laravel; no incorpora un trabajo de despliegue. Sus comandos se comprobaron localmente. Una ejecución de GitHub Actions alojada no se realizó porque no se publicó la rama ni se abrió un PR.
- El plugin Vercel está disponible y su conexión respondió a una consulta de proyectos. No existe `.vercel/project.json` en la raíz. Las búsquedas por `bibliotecary` y `andrew` no devolvieron coincidencias en la conexión consultada. Esto no descarta proyectos en otras cuentas/equipos; no se seleccionaron ni modificaron proyectos ajenos al repositorio.
- No se inició sesión de nuevo, no se creó un proyecto remoto, no se activaron servicios facturables y no se cambió la configuración de Vercel.

## Cómo consultar Vercel con el plugin

Se puede pedir al agente: «Usa Vercel para buscar Andrew's Bibliotecary y consultar su configuración y últimos despliegues, sin cambiar nada». Las operaciones de lectura disponibles son `list_projects`, `get_project` y `list_deployments`.

Primero debe identificarse el equipo y proyecto correctos. Después se comprueban repositorio, rama/commit, framework, Root Directory, install/build/output y estado del despliegue. Los nombres por sí solos no prueban que un despliegue corresponda al commit 3.0. No es necesario volver a iniciar sesión para una consulta cuando la conexión ya funciona.

No se solicitan tokens en el chat ni se guardan credenciales en el repositorio. La integración Git puede crear previews al publicar ramas; conectar o cambiar esa integración es una acción remota que debe aprobarse sobre el destino concreto.

## Borrador del Pull Request

**Título:** `Añade circulación bibliotecaria y demo interactiva 3.0`

**Origen propuesto:** `codex/bibliotecary-3`. **Destino:** `main`. La apertura remota queda pendiente de aprobación y publicación de la rama. No debe utilizarse force push ni moverse la rama histórica o `release/bibliotecary-v2` para conseguir el resultado.

Texto preparado para revisión:

> El catálogo anterior permitía consultar y gestionar fichas. Esta versión distingue títulos, ejemplares y socios, y añade el ciclo solicitud → preparación → entrega → renovación/devolución, con reservas FIFO, plazos, avisos internos, movimientos exactos e incorporaciones.
>
> Laravel conserva autenticación y autorización reales; las operaciones sensibles se validan dentro de transacciones y se auditan. La demo React permite completar ambos lados del recorrido con perfiles ficticios, estado en memoria y ninguna petición al backend. Conserva la identidad editorial, la apertura CSS y la navegación accesible; elimina la escena 3D.
>
> Vercel compila únicamente `dist/` desde la raíz. El PHP antiguo queda fuera del artefacto estático; Laravel permanece en `modern/`, y su futuro servidor debe usar `modern/public/`. Las referencias históricas no se reescriben. Las migraciones son aditivas y el procedimiento de actualización crea un respaldo privado antes de aplicarlas.
>
> Validación y alcance: consultar `docs/22_RESULTADOS_Y_LIMITES_3.md`, las evidencias por etapa y sus capturas. Incluyen PHP/SQLite/MySQL, concurrencia mediante procesos separados, análisis estático, TypeScript, build, auditorías, recorridos de navegador, instalación aislada y restauración sintética. Ninguna cifra sustituye una validación en el hosting final.
>
> No hay pasarela ni dinero real. Quedan pendientes la publicación autorizada, TLS/correo/monitorización de producción y recuperación con un respaldo real. La demo no ofrece autenticación. No se ejecuta merge automático.

## Secuencia de publicación, tras aprobación

1. Revisar el diff, estado de Git, evidencias, licencias y lista de archivos. Confirmar que no se publican `.local/`, `.env`, SQL, respaldos, logs, sesiones, credenciales ni trazas privadas.
2. Publicar únicamente la rama revisada y abrir el PR hacia `main`. Mantener protegidas las ramas y etiquetas históricas. Revisar CI sobre el commit exacto; no asumir que una ejecución local equivale a GitHub Actions aprobado.
3. Confirmar cuenta/equipo, nombre de proyecto, repositorio y rama de producción de Vercel. Evitar una publicación accidental de la vieja `main`, que no contiene aún esta demo.
4. Crear o enlazar el proyecto aprobado con Root Directory raíz, install `npm ci`, build `npm run build`, output `dist`. Configurar previews por PR con la integración Git si se aprueba su conexión. La demo no requiere variables privadas ni servicios de datos.
5. Verificar el preview del commit revisado: carga inicial, `/catalog/1`, `/my-library`, `/news`, `/demo/admin/circulation` y `/demo/admin/finance`, recarga directa, recorrido completo, consola, peticiones, cabeceras y movimiento reducido. Si el preview está protegido, usar acceso autorizado sin desactivar su protección.
6. Registrar URL, commit y estado real del despliegue, y solo entonces añadir el enlace público al README. El merge a `main` y cualquier promoción a producción requieren aprobación explícita.

## Reversión y conservación

Para la demo, una reversión de publicación debe apuntar a un artefacto anterior identificado y verificado en Vercel. No debe reconstruirse una versión distinta y presentarla como el mismo build. Revertir tráfico también es una acción remota, pendiente de autorización si llega a necesitarse.

Para código, crear commits de reversión o una nueva rama de revisión; no reescribir el historial ni mover etiquetas históricas. `codex/ux-role-clarity-2.6` conserva el punto de recuperación anterior; `archive/legacy-v1` y `v1-legacy-final`, el legado. La actualización documental de `README.md` se identifica expresamente en la evidencia de conservación; no se modifica el PHP ejecutable original.

Para Laravel, volver al código anterior no basta para revertir datos o esquema. Conservar dump, versión del esquema y ventana de escritura; probar restauración en otro destino antes de promoverla. El ensayo realizado utilizó datos sintéticos en un proyecto Docker distinto. No se restaura automáticamente ningún respaldo real ni se ejecuta un rollback destructivo sobre la instalación conservada.

## Antes de publicar Laravel con servidor

La aplicación local no equivale a producción aprobada. El destino futuro deberá verificar PHP 8.4 y MySQL compatibles, document root `public/`, configuración de entorno, HTTPS y cookies Secure, proxy confiable, correo externo y recuperación, ausencia de cuentas demo, permisos mínimos de base, scheduler, colas si se utilizan, backups cifrados y restauración comprobada, retención de logs y alertas. También debe revisarse la imagen Docker y sus parches en el entorno concreto.

No se eligió ni contrató hosting con backend en esta fase. La prioridad de publicación actual es la demo estática; el servidor Laravel permanece listo para una evaluación de staging separada y autorizada.
