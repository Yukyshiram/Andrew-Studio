# Guía del lector, biblioteca y administración

Esta guía describe la aplicación **Laravel**. Utiliza cuentas, permisos y datos persistentes. La [demo estática](21_DEMO_CIRCULACION.md) tiene otros perfiles, datos ficticios en memoria y ningún inicio de sesión real.

## Antes de comenzar

Inicia la aplicación según `modern/README.md`. En el entorno local principal abre `http://localhost:8081`; el servidor de QA en 8082 es independiente y no debe utilizarse como biblioteca de trabajo. No sirvas la raíz del repositorio: Apache apunta a `modern/public/`.

Una instalación nueva sin demo inicia con políticas conservadoras y cargos cero. Administración debe revisar calendario, cupos, plazos y restricciones antes de operar. Las tarifas presentes en las muestras no son recomendaciones ni reglas oficiales de una biblioteca.

## Lector

1. Crea una cuenta mediante el registro público o inicia sesión con una existente. El registro crea un socio dentro de la misma transacción. Una cuenta antigua sin membresía debe solicitar su alta al personal; no se le conceden derechos de préstamo automáticamente por existir en el legado.
2. Explora `/catalog`. Busca por título, autor o editorial y utiliza categorías, orden y paginación. La disponibilidad corresponde a ejemplares físicos elegibles, no al número de fichas. Una ficha sin inventario no significa que haya un libro listo para entregar.
3. Abre una ficha y utiliza su acción de solicitud o reserva. Confirma el formulario. La solicitud queda pendiente de validación; **no es un préstamo ni una entrega física**.
4. En **Mi biblioteca** (`/my-library`), consulta préstamos activos, solicitudes, historial, avisos y cargos/saldo. Los datos pertenecen a la cuenta autenticada. Las pestañas conservan filtros y muestran estados vacíos cuando corresponde.
5. Si la solicitud queda en espera, consulta su posición en la lista aprobada. Si está preparada, revisa la fecha límite de recogida: incluye ese día. La entrega debe confirmarla Biblioteca cuando recibas físicamente el ejemplar.
6. En un préstamo activo, revisa vencimiento y renovaciones usadas. **Renovar préstamo** muestra las condiciones y pide confirmación. Una renovación puede rechazarse por membresía, vencimiento, cupo, saldo, máximo permitido o una solicitud ajena abierta. El mensaje explica el motivo; el préstamo conserva sus condiciones originales.
7. Para devolver, entrega el ejemplar al personal. El lector no confirma por su cuenta una recepción física. Una devolución registrada aparece en el historial; tener deuda no impide devolver.
8. Puedes cancelar solicitudes abiertas. Si había un ejemplar apartado, se libera y se atiende a la siguiente reserva elegible. Las solicitudes ya cerradas y el historial no se borran.

Los avisos internos informan recogidas, vencimientos de reservas, entregas, renovaciones y cierres; puedes marcarlos como leídos. No se promete entrega de estos avisos por correo. La recuperación de contraseña usa el flujo de correo separado; en local, Mailpit captura el mensaje, y un proveedor externo sigue pendiente para producción.

En **Cargos y saldo** consulta movimientos registrados y cargos calculados pendientes. No hay pasarela de pago: un administrador registra operaciones manuales de la biblioteca. El saldo no representa un cobro automático ni una autorización para transferir dinero.

## Biblioteca

El bibliotecario atiende socios, inventario y circulación. No administra roles, políticas ni tesorería.

### Preparar el inventario y al socio

- En **Socios** (`/manage/members`), localiza una cuenta, registra su membresía cuando sea necesario y revisa estado, vencimiento y límite individual. Suspender una membresía no elimina sus operaciones históricas.
- En **Ejemplares** (`/manage/inventory`), asocia cada copia con una ficha. Registra código de barras único, ubicación y condición. Crear una ficha o anunciar una llegada no crea existencias. Un ejemplar asignado no puede alterarse directamente para aparentar que está libre.
- Mantén separados condición física y estado de circulación. Una copia con desgaste habitual puede ser elegible; una dañada o extraviada no está disponible para otro préstamo.

### Atender una solicitud

1. Abre **Circulación** (`/manage/circulation`) y filtra solicitudes por estado o búsqueda.
2. **Validar y preparar** comprueba derechos, cupos, vencimientos, saldo y disponibilidad. Si hay un ejemplar elegible, lo aparta; si no, la solicitud validada pasa a la lista de espera. **Comprobar disponibilidad** permite revisar una reserva ya aprobada.
3. Cuando el socio recoja físicamente el ejemplar, utiliza **Confirmar entrega**. Se crea el préstamo, se guarda una copia de sus condiciones y se calcula su vencimiento con la zona y el calendario de la biblioteca. Preparar y entregar son operaciones distintas.
4. Si corresponde rechazar, utiliza su acción y escribe un motivo. El motivo queda en el historial y se informa al lector. Rechazar una recogida libera el ejemplar.

Dos operadores no pueden entregar el mismo ejemplar simultáneamente. Si otro operador cambió el estado, revisa el mensaje y actualiza la vista; no repitas una entrega física basándote en una pantalla desactualizada. Los reenvíos de la misma operación no deben crear un segundo préstamo.

### Devoluciones, renovaciones y reservas

En préstamos/devoluciones, localiza el préstamo y confirma la recepción con su condición. Una devolución en buen estado o con desgaste devuelve la copia al conjunto elegible; un daño la deja en reparación y una pérdida cierra el préstamo como extraviado. Se calculan los cargos aplicables con las condiciones guardadas y se conserva el historial. No conviertas un extravío en devolución normal para ocultar un cargo.

El personal puede tramitar una renovación, pero no elude sus reglas. Un cambio posterior de política no reescribe los términos de préstamos existentes.

La lista aprobada se atiende por orden FIFO. Una copia libre se asigna a la siguiente persona elegible; un bloqueo temporal no le concede una entrega indebida ni elimina silenciosamente su posición. Las membresías que dejan de estar activas reciben el cierre explicado de sus reservas en espera. Las recogidas vencen al terminar su último día y liberan la copia al siguiente día bibliotecario.

**Actualizar reservas vencidas** ejecuta la revisión manual. El programador Docker es opcional y debe estar activo si se desea revisión automática:

```powershell
cd modern
docker compose --profile automation up -d scheduler
docker compose exec -T app php artisan schedule:list
```

El scheduler revisa reservas y cargos cada hora. Repetir la revisión no duplica multas. En una publicación futura debe configurarse y observarse el programador del entorno de destino; que exista el comando no prueba que un cron externo esté funcionando.

## Administración

El administrador dispone de las operaciones de Biblioteca y añade gestión de cuentas/roles, **Políticas**, **Tesorería** e informes. Las comprobaciones se realizan en el servidor; ocultar o mostrar un botón no sustituye los permisos.

En **Políticas** (`/manage/policy`), revisa zona horaria, moneda, duración, renovaciones, recogida, cupos, calendario, gracia, tarifas y restricciones. Guarda mediante su confirmación. La moneda no puede cambiarse cuando ya existen préstamos o movimientos; esto evita reinterpretar importes históricos. Los valores usados para una demostración deben identificarse como ficticios.

En **Tesorería** (`/manage/finance`), busca un socio y revisa su cuenta. **Registrar movimiento** admite pago registrado, abono autorizado o ajuste de saldo. Introduce un importe válido, motivo y referencia cuando corresponda. El servidor determina responsable, moneda, signo y fecha efectiva; no acepta sobrepagos ni saldos a favor.

Los importes se almacenan en centavos enteros. Un ajuste requiere indicar si aumenta o reduce el saldo. Para corregir una entrada usa **Revertir movimiento**: crea su contrapartida y conserva el original; no hay edición ni borrado de movimientos. La devolución física de dinero, si existiese, se gestiona fuera de esta aplicación.

El informe por periodo separa pagos brutos, reversiones y pagos netos. Un pago y su reversión pueden pertenecer a periodos diferentes; el neto de un periodo puede ser negativo. Saldo actual, cargos pendientes y movimiento del periodo son magnitudes distintas. [Reglas completas de tesorería](19_TESORERIA_Y_MOVIMIENTOS.md).

## Incorporaciones y panel

El personal autorizado utiliza **Incorporaciones** (`/manage/acquisitions`) para anunciar o actualizar la llegada de un título. Fecha editorial, llegada estimada e incorporación son campos diferentes. Para marcar una incorporación deben existir ejemplares y una fecha de incorporación válida; se bloquea una edición que llega desactualizada. Los anuncios públicos están en `/news`, con filtros y notas identificadas como ficticias cuando corresponde.

El **Panel** (`/dashboard`) adapta sus indicadores al rol. Lector ve su cuenta y próximos vencimientos; Biblioteca ve trabajo de circulación e inventario; Administración añade indicadores financieros. Las cifras consultan la base de datos y no crean cargos al abrir la página.

Las fichas, cuentas y operaciones anteriores se conservan mediante archivo e historial. No se permite archivar una ficha con circulación o incorporaciones abiertas. Una reversión del importador del legado tampoco puede eliminar registros ya utilizados por estos módulos. [Migración y conservación](06_MIGRACION.md).
