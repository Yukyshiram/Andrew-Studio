# Novedades, incorporaciones y paneles 3.0

La aplicación Laravel dispone de novedades públicas, gestión de incorporaciones y paneles calculados desde su base de datos. La demo estática se integra por separado en la etapa F; este documento no atribuye estas operaciones a la versión estática 2.6.

## Para lectores y visitantes

Abre **Novedades** (`/news`) desde la navegación o **Consultar novedades** en Mi biblioteca. Puedes buscar un título o autor, elegir categoría/estado y desplegar **Filtrar por fechas**. El selector de fecha distingue publicación editorial, llegada estimada e incorporación real; los extremos del periodo son inclusivos. La paginación conserva los filtros. Una fecha sin confirmar no se infiere de la creación de la ficha.

Cada incorporación identifica sus datos ficticios cuando corresponde. Las estimaciones vencidas se muestran como pendientes de actualizar. **Consultar disponibilidad** abre la ficha y muestra las existencias físicas actuales: un anuncio, pedido o fecha prevista nunca crea stock. Los registros cancelados y los títulos archivados no se promocionan públicamente. Las notas se presentan como texto, sin interpretar HTML. Una fuente es un enlace HTTPS abierto por el usuario en otra pestaña; el servidor no descarga su contenido.

## Para bibliotecarios y administradores

En **Incorporaciones** (`/manage/acquisitions`), busca el título y pulsa **Registrar incorporación**. La búsqueda también limita las opciones del formulario a 200 fichas; precisa el título para localizar otras. Usa una ficha existente; una edición bibliográfica diferente debe catalogarse por separado antes de registrar su llegada.

Estados: **Anunciado**, **Pedido**, **En camino**, **Incorporado** y **Cancelado**. Los estados abiertos pueden cambiar según lo ocurrido, incluida una donación que llegue sin pedido previo. Para confirmar **Incorporado**, registra primero al menos un ejemplar no retirado en Inventario e indica la fecha real, sin superar el día local de la biblioteca. Los demás estados no admiten una fecha de incorporación efectiva. Publicación y llegada estimada son independientes: una previsión puede ser anterior o posterior a la publicación, y puede quedar vencida sin aparentar una llegada confirmada.

Los lotes cerrados conservan su estado. Puedes corregir sus metadatos con auditoría; para una nueva adquisición del mismo título registra otro lote. No hay eliminación de incorporaciones en la aplicación. El formulario conserva una versión: si otra persona modifica el registro, el servidor rechaza el guardado antiguo. Cierra y vuelve a abrir el formulario para revisar la versión actual. Las altas usan una clave ligada a su intención y responsable para impedir duplicaciones por reenvío.

El personal puede registrar notas públicas y fuentes. No incluyas datos privados en esas notas. La marca **Datos ficticios de demostración** distingue fechas y anuncios creados para probar la aplicación. No convierte una fecha inventada en un anuncio editorial confirmado.

No se puede archivar una ficha, ni todo el catálogo, mientras haya adquisiciones abiertas. Cierra o cancela primero esos lotes. Los registros cerrados se conservan al archivar; la vista interna mantiene acceso a su título y trazabilidad.

## Qué muestra cada panel

El día de referencia lo calcula Laravel en la zona horaria de la biblioteca, no el reloj del navegador.

| Perfil | Información real de su base de datos |
|---|---|
| Lector | Su membresía, préstamos activos/vencidos, solicitudes abiertas, recogidas, avisos sin leer, próximos vencimientos y saldo propio, incluida mora calculada pendiente de registrar |
| Bibliotecario | Préstamos activos/vencidos, vencimientos de hoy, validaciones, reservas en espera, recogidas, ejemplares disponibles, incorporaciones pendientes y devoluciones por atender |
| Administrador | Operación bibliotecaria, pagos registrados/revertidos/netos del mes, saldo registrado de todos los periodos e historial de acciones |

Los agregados financieros no se envían al bibliotecario ni al lector. Las personas ajenas no aparecen en el panel privado del lector. Abrir un panel no registra cargos ni altera préstamos. Los enlaces llevan a operaciones implementadas. **Últimas fichas catalogadas** conserva el listado reciente anterior, con un nombre que no confunde la catalogación con la llegada física. **Historias en camino** muestra hasta tres lotes abiertos de títulos activos; sus fechas previstas pueden necesitar actualización.

El saldo administrativo **registrado** no incluye mora aún sin liquidar. El saldo personal distingue ambos conceptos; Tesorería permite actualizar una cuenta y revisar el detalle. No hay pasarela ni cobro en línea.

## Modelo, seguridad y conservación

`acquisitions` referencia una ficha y la cuenta creadora, con restricciones de integridad. Guarda estado, las tres fechas separadas, marca de ficción, fuente, nota pública, versión y huella de creación. Las claves y huellas no se exponen en las respuestas. El listado público tampoco envía identificadores del responsable ni metadatos de importación. Cada cambio registra antes/después, versión y actor en auditoría.

Los permisos se comprueban en el servidor y de nuevo dentro de la transacción. Las mutaciones y el archivo del catálogo comparten el bloqueo de política utilizado por circulación; no pueden producirse simultáneamente una nueva adquisición y el archivo de su ficha. Las actualizaciones comprueban su versión bajo bloqueo. Los filtros SQL de fechas/estado usan listas permitidas; la búsqueda literal escapa comodines.

La migración `2026_11_22_191334_create_acquisitions_table.php` es aditiva y no reinterpreta años ni modifica fichas antiguas. La reversión de lotes importados rechaza referencias tanto desde una adquisición al libro como desde su responsable a una cuenta importada, incluido el modo de simulación. La comprobación de esta segunda referencia falló antes de añadir el control y pasó con él. El rollback de esquema se prueba exclusivamente en bases aisladas; retirar una tabla con incorporaciones reales perdería ese historial y requiere exportación/respaldo previo.

La base local recibió la migración tras un respaldo privado y comparación de las cuatro tablas históricas. El registro indicó conservación de datos y ausencia de seeding. No se ha probado la restauración de ese respaldo real; no se distribuye su SQL.

## Muestra sintética para una instalación nueva

`LibraryDemoSeeder` funciona solo en `local`/`testing` con `DEMO_SEED_ENABLED=true`. `DatabaseSeeder` delega en él: ya no genera una cuenta genérica al invocarse sin configuración. El código rechaza producción incluso si se invoca directamente el seeder.

La muestra exige una base nueva sin socios, inventario, operaciones, adquisiciones, importaciones, identificadores legados ni políticas modificadas. Admite únicamente el catálogo y las tres cuentas ficticias iniciales de `DemoSeeder`, sin cuentas archivadas o ajenas. Si hay datos existentes se detiene y revierte la transacción; no los vacía ni los convierte en demostración. Un marcador auditado hace que repetir una muestra ya instalada no reinicie cuentas, política, fechas ni operaciones.

En una **base local sintética nueva**, después de sus migraciones y con la opción de demo habilitada:

```powershell
cd modern
docker compose exec -T app php artisan db:seed --class=LibraryDemoSeeder --force
```

No ejecutes ese ejemplo sobre la base conservada del proyecto. El flag `--force` pertenece al comando de seeding; no elude los controles del código. La muestra no se instaló sobre la base local con datos existentes ni sobre la base de QA acumulada.

Contenido: 25 fichas ficticias (las 24 originales de demostración y un próximo título), seis cuentas ficticias con cuatro lectores, cuatro membresías, seis ejemplares, dos préstamos activos —uno vencido—, una devolución histórica, solicitud pendiente, reserva en espera, recogida preparada, avisos, mora y pago parcial ficticios, y seis incorporaciones. Las fechas se construyen respecto al inicio de la muestra; los relojes temporales se restauran tras generar el historial. Usuarios, membresías y ejemplares preceden cronológicamente a sus préstamos.

**Tarifas exclusivamente ficticias de esa muestra:** MXN, 25 centavos por día abierto de retraso después de un día de gracia; pérdida 30.000 centavos, daño 5.000 y umbral de saldo 2.500. No son tarifas de una biblioteca real. La aplicación sin esta muestra mantiene sus valores predeterminados de cargos cero. Las credenciales ficticias están en los seeders y solo son para entornos locales; nunca se usan en la demo pública estática ni deben habilitarse en producción.

## Verificación y límites

Las pruebas cubren separación de fechas, inventario obligatorio, clave repetida, formularios desactualizados, actores y roles, filtros literales, paginación, privacidad, referencias del legado, reversión de esquema, métricas con reloj controlado y seeding seguro/idempotente. El recorrido Playwright crea una ficha sintética, anuncia su incorporación, comprueba fechas desde un visitante móvil, registra inventario, confirma la llegada y consulta el panel sin errores de consola ni peticiones externas. Incluye Axe, foco y responsive. Sus resultados finales y las regresiones completas se registran en `17_IMPLEMENTACION_3.md` y la evidencia de E; no se sustituyen por afirmar que compila.

No se implementan compras a proveedores, facturas, presupuestos, recepción por cantidades/lotes físicos, avisos por correo ni verificación automática de fuentes editoriales. Cada lote describe una incorporación; los ejemplares se gestionan individualmente en Inventario. No se demuestra rendimiento universal ni 60 FPS por superar pruebas funcionales.
