# Implementación de Andrew's Bibliotecary 3.0

Este es un registro de avance, no una declaración de versión completa. El alcance íntegro está en [Dominio y etapas](16_DOMINIO_BIBLIOTECARIO_3.md). La misión sigue activa hasta comprobar circulación, reservas, tesorería, novedades, demo y entregables finales.

## Etapa A verificada

Se añadieron ISBN validado/normalizado, edición e idioma sin reemplazar los campos antiguos; ejemplares con códigos únicos, ubicación y condición; membresías asociadas a cuentas; políticas y calendario configurables. Ninguna ficha antigua se convirtió automáticamente en un ejemplar. Las cuentas nuevas reciben membresía dentro de su transacción; las antiguas pueden registrarse mediante el personal.

Las pantallas reales `/manage/inventory`, `/manage/members` y `/manage/policy` permiten las operaciones correspondientes, con validación, búsquedas/paginación y auditoría. Solo administrador modifica políticas. Personal bibliotecario no modifica roles ni tarifas. Los cambios de política requieren confirmación. No se añadieron cuentas falsas al frontend estático.

Puerta ejecutada: **113 pruebas PHP / 729 aserciones tanto en SQLite como en MySQL 8.4**, sin fallos ni omisiones; PHPStan, TypeScript y builds de Laravel/demo aprobados; control heurístico de secretos aprobado; **3 nuevos recorridos Playwright aprobados**. [Evidencia](evidence/v3-stage-a.json). No se confunde esta puerta con la regresión completa de navegador, que se repetirá al integrar los módulos.

Se corrigieron durante la etapa: reversión SQLite que necesitaba retirar primero el índice ISBN, entrada ISBN de tipo array que causaba error de servidor y adaptación de tablas nuevas al estilo desplazable existente. Las pruebas comprueban la conservación de títulos/cuentas al revertir/reaplicar la migración aislada.

### Reproducción

```powershell
cd modern
docker compose exec -T app php artisan test --compact
npm run typecheck
npm run build
./scripts/test-mysql.ps1
npm run test:e2e -- inventory.spec.ts policy.spec.ts
```

El script MySQL crea credenciales sintéticas dentro de `.local/v3-test.env` (ignorado por Git) y levanta el proyecto Docker separado `bibliotecary-v3-qa`. La base `bibliotecary_v3_qa` usa tmpfs y no publica puertos. Comparte solamente el código y las dependencias PHP ya instaladas; no monta el volumen de la base existente. Requiere haber construido la imagen `bibliotecary-v2-app` y disponer del volumen Composer instalado. No ejecutarlo con configuraciones de producción.

Pint se ejecutó con los archivos PHP modificados explícitos y `--format agent`. `--dirty` no puede detectar Git dentro del contenedor porque el repositorio está en la carpeta padre del montaje; no se montó ni copió `.git` para eludir esa limitación.

La migración es aditiva. Para bases con datos nuevos de membresía/inventario, una reversión debe ir precedida de respaldo/exportación: retirar las tablas nuevas perdería esas operaciones. La prueba de reversión se ejecuta exclusivamente en bases aisladas; no se aplicó rollback sobre datos existentes.

## Etapa B verificada

La circulación real separa solicitud, validación, preparación de un ejemplar, entrega física y devolución. Incluye rechazo con motivo, cancelación privada, condiciones de retorno, historial, disponibilidad e inventario; las operaciones repetidas conservan el resultado anterior. Las fichas con circulación abierta no se archivan. Se revalida el permiso del personal dentro de la transacción.

Puerta ejecutada: **159 pruebas PHP / 1.055 aserciones en SQLite**, con una omisión deliberada de la prueba exclusiva de concurrencia MySQL; **159 pruebas / 1.077 aserciones en MySQL 8.4**, sin omisiones ni fallos. Dos procesos simultáneos verificaron que un ejemplar no se prepara para dos personas y que una entrega repetida crea un único préstamo y evento. **21 recorridos Playwright Laravel aprobados**, incluidos los anteriores y el ciclo lector/personal. PHPStan, TypeScript, compilaciones y control heurístico de secretos aprobados. El posterior ajuste de mensajes de entregas repetidas tiene una comprobación HTTP específica. [Evidencia de B](evidence/v3-stage-b.json).

Las capturas en `screenshots/v3/laravel/` corresponden a operaciones reales en la base sintética de QA. Las de `demo-before-circulation/` son una línea base de la demo 2.6, todavía sin el recorrido 3.0. No se conserva un informe completo verificable del último recorrido estático tras sobrescribirse su archivo; se repetirá al integrar F. La comprobación específica de ausencia de 3D aprobó seis pruebas en tres motores.

Se reforzó el aislamiento: el arranque de las pruebas rechaza cualquier base distinta de SQLite en memoria o del MySQL de QA en `db-test`. La reversión de lotes importados comprueba referencias nuevas y admite las huellas antiguas solamente si los nuevos metadatos permanecen neutros. Los archivos temporales de las pruebas de migración se separan por motor.

### Actualización de la base local

Se ejecutó `node modern/scripts/upgrade-local.mjs`: respaldo privado transaccional, mantenimiento, migraciones aditivas y comparación de todas las columnas anteriores de usuarios, libros, lotes y auditoría. El registro privado confirma `existingDataPreserved: true`. No se sembraron datos ficticios en esa base. Los scripts de respaldo y actualización están versionados; los SQL y sus registros permanecen ignorados en `.local/backups/` y no deben publicarse ni incluirse en entregas. **La restauración de ese respaldo no se ha probado**. Las pruebas destructivas y de reversión se ejecutan únicamente en bases sintéticas aisladas.

## Etapa C verificada

Se completaron posición de espera privada, caducidad de recogida con fecha local inclusiva, asignación automática al incorporar/reparar ejemplares, cierre con aviso de reservas en espera de membresías inactivas y renovaciones privadas/idempotentes con registro propio. Las renovaciones conservan las condiciones acordadas, revalidan derechos y se bloquean ante solicitudes abiertas de otras personas. Los avisos internos incluyen título y fechas legibles; no son correo externo. La interfaz real permite confirmar/cancelar la renovación, revisar avisos y ejecutar mantenimiento manual. [Reglas y guía](18_RESERVAS_Y_RENOVACIONES.md).

Puerta final: **180 pruebas PHP / 1.195 aserciones en SQLite**, con dos omisiones deliberadas de concurrencia exclusiva de MySQL; **180 pruebas / 1.231 aserciones en MySQL 8.4**, todas aprobadas. Incluye dos procesos simultáneos con una misma clave de renovación. PHPStan, TypeScript, Pint y compilación aprobados. **21 recorridos Playwright aprobados**, más una repetición dirigida del ciclo con el texto final de avisos y restauración del foco. Las últimas ramas de membresía se comprobaron después con las suites PHP completas. [Evidencia](evidence/v3-stage-c.json).

Se corrigió un desfase de fecha civil al renovar: convertir primero un `DATE` de UTC a México restaba un día. La prueba sobre un día de cierre demuestra el cálculo correcto. El diálogo ahora restaura el foco en su alternativa cuando la acción queda desactivada al agotarse las renovaciones. Las capturas de C se guardan en carpetas nuevas, conservando B.

La migración C se aplicó a QA y a la base local tras un nuevo respaldo privado y comparación de tablas históricas, sin seeding. Está activo el servicio local opcional `scheduler`, sin puertos ni cambios globales; se comprobó la tarea horaria declarada y una ejecución manual. No se ha confundido esa comprobación con haber observado todavía su siguiente disparo horario. Los SQL privados no se publican y su restauración sigue pendiente de prueba.

## Etapa D verificada

El libro financiero registra cargos por retraso, daño y pérdida, pagos recibidos por otros medios, abonos, ajustes y reversiones vinculadas. Los cálculos usan centavos enteros, las claves evitan duplicación y las correcciones no borran movimientos. La mora anterior se registra antes de renovar y puede reconstruirse desde renovaciones previas. Se distinguen saldos registrados y cargos calculados pendientes; el bloqueo por deuda permite siempre devolver.

El lector consulta su cuenta en **Cargos y saldo**; el administrador dispone de **Tesorería**, búsqueda de socios, movimientos confirmados e informes por periodo con pagos y reversiones separados. La moneda mostrada al abrir el formulario se revalida dentro de la transacción. [Guía y reglas](19_TESORERIA_Y_MOVIMIENTOS.md).

Puerta ejecutada: **226 pruebas PHP / 1.474 aserciones en SQLite** (222 aprobadas y cuatro omisiones exclusivas de MySQL); **226 pruebas / 1.534 aserciones en MySQL 8.4**, todas aprobadas. PHPStan, TypeScript, Pint y builds de Laravel/demo aprobados. **22 recorridos nativos aprobados**, **seis de circulación/finanzas en Chromium, Firefox y WebKit**, y otros **tres financieros en esos motores tras el control de moneda**. NPM y Composer: cero vulnerabilidades notificadas. [Evidencia](evidence/v3-stage-d.json). La comprobación estática completa de 2.6 continúa como regresión adicional; todavía no es la demo funcional 3.0.

Se corrigieron el reinicio de formularios tras guardar en Inertia 3, el retorno del foco en WebKit y una regresión de Firefox 1572 al analizar regiones con `aria-labelledby`. Se conservaron sus nombres accesibles mediante `aria-label` y pasó Axe normal. La demo comparte componentes con Laravel; su TypeScript ahora resuelve una sola copia de los tipos React, coherente con la deduplicación de Vite ya existente.

Las migraciones D se aplicaron a la base local tras respaldo privado, sin seed. Se observaron ambos disparos horarios de reservas/cargos con `DONE` a las 10:00 UTC del 22/11/2026. Se verificaron los 34 archivos del snapshot inicial y todas las referencias protegidas. La comparación del trabajo 3.0 usa la base 2.6 `827be7c`; el commit `372dbf3` es anterior a la restauración, distinción ya documentada en la auditoría inicial. [Conservación](evidence/v3-preservation-after-finance.json).

**Regresión estática adicional aún abierta:** la suite de 36 casos terminó con 31 aprobados, dos omisiones de capturas redundantes y tres fallos en WebKit. Los tres casos pasaron aislados, pero otra ejecución completa volvió a fallar en navegación/filtrado y foco responsive. Una tercera comprobación de WebKit, ya con condiciones explícitas de llegada a las rutas, aprobó siete casos, omitió una captura y falló cuatro. Se observaron entre 156 y 262 MiB de RAM libre durante la investigación; los snapshots de algunos fallos mostraron el DOM final correcto tras la espera. Esto no demuestra una causa única ni permite afirmar ausencia de regresiones. No se detuvieron procesos de otros proyectos ni se descartaron las aserciones. Falta comprobar los recorridos con recursos suficientes y resolver cualquier fallo que persista.

Commits D: `fb6d6f8` persistencia; `d8b0e2d` cálculo y movimientos; `def5433` rutas, permisos y deuda; `fd228d0` interfaz; `8b1e490` moneda al confirmar; `77b98de` tipos de React compartidos. E y F todavía deben aportar novedades, paneles operativos, datos sintéticos ampliados, circulación estática y cierre de CI/entregables.

## Estado de las etapas restantes

| Etapa | Estado actual | Evidencia que se exigirá al cerrar |
|---|---|---|
| B: solicitudes, preparación, entrega y devolución | Verificada | Ciclo real, negativas, idempotencia y concurrencia MySQL documentados arriba |
| C: reservas, renovación, vencimientos y avisos | Verificada | FIFO, caducidad, calendario, límites, avisos y concurrencia de renovación documentados arriba |
| D: multas, movimientos, pagos, ajustes e informes | Verificada | Enteros, idempotencia, permisos, historial, reversión y concurrencia MySQL documentados arriba |
| E: novedades y administración integrada | Pendiente | Fechas diferenciadas, filtros, métricas de BD y operaciones implementadas |
| F: demo e integración visual | Pendiente | Ciclo completo lector/bibliotecario sin backend, recargas, responsive, accesibilidad y regresión |

Las guías de lector/personal, documentación financiera, nuevas capturas, cobertura funcional y resumen final de commits se completarán con las funciones ejecutadas. No se anuncia un préstamo funcional por disponer únicamente de sus modelos.

Commits de C: `feb267f` tablas de avisos/renovaciones; `0bee5d6` operaciones y controles; `b798ac8` interfaz y navegación por teclado; `d773b18` programador Docker local; `43eb46f` cierre de reservas con membresías inactivas y mensajes legibles. D incorporó la liquidación de periodos anteriores antes de renovar.

## Git y conservación

Commits de la etapa A: `6357ef7` modelo e ISBN; `095201b` inventario; `1acf7f1` socios; `376fd7e` políticas; `80e5623` tipos ISBN; `d564a11` MySQL aislado. Diseño previo: `e17e1ac`. Cada unidad se registró después de las comprobaciones pertinentes.

`git ls-remote --heads origin` confirmó que la única rama remota publicada es `main`, en `372dbf3`. No se hizo fetch que moviese referencias, push, merge o despliegue. La demo de desarrollo continúa en 4173. Las migraciones A/B se aplicaron a SQLite QA en 8082, al MySQL aislado y a la base local después del respaldo y la comparación descritos arriba.
