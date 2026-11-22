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

## Estado de las etapas restantes

| Etapa | Estado actual | Evidencia que se exigirá al cerrar |
|---|---|---|
| B: solicitudes, preparación, entrega y devolución | Verificada | Ciclo real, negativas, idempotencia y concurrencia MySQL documentados arriba |
| C: reservas, renovación, vencimientos y avisos | Pendiente | FIFO, caducidad, calendario con reloj controlado y límites de renovación |
| D: multas, movimientos, pagos, ajustes e informes | Pendiente | Centavos exactos, no duplicación, auditoría y reversión trazable |
| E: novedades y administración integrada | Pendiente | Fechas diferenciadas, filtros, métricas de BD y operaciones implementadas |
| F: demo e integración visual | Pendiente | Ciclo completo lector/bibliotecario sin backend, recargas, responsive, accesibilidad y regresión |

Las guías de lector/personal, documentación financiera, nuevas capturas, cobertura funcional y resumen final de commits se completarán con las funciones ejecutadas. No se anuncia un préstamo funcional por disponer únicamente de sus modelos.

## Git y conservación

Commits de la etapa A: `6357ef7` modelo e ISBN; `095201b` inventario; `1acf7f1` socios; `376fd7e` políticas; `80e5623` tipos ISBN; `d564a11` MySQL aislado. Diseño previo: `e17e1ac`. Cada unidad se registró después de las comprobaciones pertinentes.

`git ls-remote --heads origin` confirmó que la única rama remota publicada es `main`, en `372dbf3`. No se hizo fetch que moviese referencias, push, merge o despliegue. La demo de desarrollo continúa en 4173. Las migraciones A/B se aplicaron a SQLite QA en 8082, al MySQL aislado y a la base local después del respaldo y la comparación descritos arriba.
