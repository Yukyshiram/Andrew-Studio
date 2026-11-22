# Reservas, renovaciones y avisos — Etapa C

Esta guía describe Laravel real. La demo estática sigue pendiente de integración en la etapa F. No hay correo externo, cobros ni notificaciones push en este módulo.

## Guía del lector

1. Inicia sesión y abre una ficha del catálogo. «Solicitar préstamo» registra una solicitud a tu nombre; todavía no asigna ni entrega un ejemplar.
2. Consulta **Mi biblioteca → Mis solicitudes**. El personal debe validar la solicitud. Si no hay existencias, aparece la posición entre las reservas validadas. No se muestran nombres ni datos de otras personas.
3. Cuando se prepara un ejemplar, se muestra su código, ubicación y último día de recogida. Puedes recogerlo durante ese día, inclusive. La entrega física se confirma por separado.
4. En **Préstamos activos**, consulta el vencimiento y las renovaciones disponibles. «Renovar préstamo» abre una confirmación y muestra los errores de las reglas aplicables. Confirma para consultar la nueva fecha; cancelar conserva la anterior.
5. En **Avisos**, consulta recogidas preparadas, decisiones, entregas, renovaciones y cierres. Marcar un aviso como leído conserva el mensaje y su fecha. Los avisos son internos y privados.
6. Puedes cancelar una solicitud abierta. Si había un ejemplar apartado, se libera y se atiende la siguiente reserva elegible. Las solicitudes cerradas y devoluciones permanecen en el historial.

Las cuentas antiguas sin membresía necesitan el alta del personal; no se fabrican socios ni ejemplares a partir del catálogo. Las cuentas nuevas obtienen su membresía dentro de la transacción de registro.

## Guía del personal

En **Circulación**, valida/prepara solicitudes y confirma entregas únicamente cuando se hayan realizado. Una reserva en espera obtiene el siguiente ejemplar disponible después de las reservas anteriores elegibles. Incorporar un ejemplar o devolverlo a estado disponible desde reparación también revisa esa cola, sin pedir una segunda validación.

«Actualizar reservas vencidas» libera recogidas cuyo último día ya terminó en la zona horaria de la biblioteca. Asigna los ejemplares liberados a las siguientes reservas validadas. La operación es repetible y no crea préstamos. Los resultados muestran recogidas vencidas y nuevas asignaciones.

En préstamos activos también puedes renovar para un socio; se aplican las mismas reglas y queda registrada tu identidad. Para cerrar un préstamo registra la devolución y su condición física. Consulta las decisiones cerradas con el filtro de estado y el historial de préstamos.

Una reserva **en espera** de una membresía suspendida, vencida o desactivada se cierra como rechazada con motivo y aviso, incluso si no hay existencias. Un bloqueo temporal por cupo o vencimientos conserva la espera y se omite durante la asignación. Una recogida ya preparada no se entrega si la cuenta pierde derechos; puede rechazarse por el personal o liberarse al caducar. Reactivar una membresía no reabre solicitudes cerradas: el lector presenta una nueva.

## Reglas comprobables

| Operación | Regla |
|---|---|
| Orden de espera | Todas las solicitudes públicas nacen con igual prioridad. Se ordenan por fecha de solicitud y después por ID; la aprobación posterior no cambia ese orden. |
| Asignación | Solo solicitudes validadas y socios elegibles. Ejemplar del mismo título, disponible, en buen estado o con desgaste y sin otra asignación. |
| Recogida | Días naturales de la política actual, desplazados al siguiente día abierto; el último día es inclusivo. |
| Caducidad | Se compara la fecha civil con el día actual en la zona de la biblioteca. Se cierra la solicitud, se libera su clave activa y el ejemplar, y se registra un aviso una sola vez. |
| Renovación | Préstamo activo, membresía vigente, cupo y regla actual de bloqueo de vencidos. El préstamo renovado se excluye del recuento de otros préstamos para no rechazar una renovación por estar exactamente en el cupo. |
| Otras reservas | Cualquier solicitud abierta de otra persona para ese título impide renovar, incluida una pendiente de validación. Es una regla conservadora explícita de esta aplicación. |
| Nueva fecha | Se añade la duración acordada a la mayor de la fecha de vencimiento anterior y el día actual; se desplaza al siguiente día abierto del calendario acordado. |
| Condiciones acordadas | Duración, calendario y máximo de renovaciones proceden de la instantánea guardada al entregar el préstamo. Cambios posteriores de esos valores se aplican a nuevos préstamos. El estado del socio y el bloqueo de vencidos sí se revalidan con la política actual. |
| Vencidos | Si el administrador desactiva el bloqueo de vencidos, la renovación parte como mínimo del día actual. Esto no borra su historial ni representa condonación de un cargo. La tesorería se integrará en D. |
| Reenvío | La clave UUID se normaliza a minúsculas. El mismo actor y préstamo recuperan el registro original, incluso tras la devolución; usarla para otro actor/préstamo se rechaza. Una confirmación nueva representa una renovación nueva, limitada por la política. |
| Concurrencia | Bloqueo transaccional de la política compartido con las demás operaciones, clave única por operación y número único de renovación dentro de cada préstamo. |
| Avisos | Mensajes guardados una vez por evento, con título y fechas legibles. El texto anterior no se reescribe si cambia una ficha. Solo su socio puede consultarlos o marcarlos como leídos. |

El cálculo conserva las **fechas civiles**: una fecha de vencimiento almacenada como `DATE` no se convierte primero de UTC al horario local, lo que desplazaría el día. La prueba de renovación sobre un cierre concreto detectó y cubre esa regresión.

## Ejecución automática y manual

La tarea está declarada en `modern/routes/console.php`, cada hora y sin solapamiento. El perfil Docker opcional `automation` ejecuta un proceso local de Laravel como `www-data`, sin puertos publicados y con las mismas dependencias; no agrega bases ni reemplaza volúmenes.

Después de respaldar y aplicar las migraciones:

```powershell
cd modern
docker compose --profile automation up -d --no-deps scheduler
docker compose exec -T scheduler php artisan schedule:list
docker compose exec -T scheduler php artisan library:refresh-reservations
```

En este workspace se comprobó el proceso activo, la tarea registrada y una ejecución manual correcta (cero recogidas vencidas y cero nuevas asignaciones). Esto no equivale a haber observado todavía su siguiente disparo horario. Para detener solo ese proceso: `docker compose stop scheduler`.

En otro hosting se necesita un único planificador que ejecute `php artisan schedule:run` cada minuto, como indica la [documentación de Laravel 13](https://laravel.com/docs/13.x/scheduling). No se instaló cron ni se cambió la configuración global del equipo. El trabajador debe usar el mismo entorno y caché compartida que la aplicación. Un fallo del planificador retrasa la liberación automática; la entrega rechaza de todos modos las recogidas vencidas y el personal conserva la revisión manual.

## Persistencia, seguridad y reversión

La migración C crea `library_notices` y `loan_renewals`, con referencias restrictivas, claves únicas e índices. No sustituye tablas anteriores. La base local se actualizó mediante respaldo privado y comparación de los datos históricos, sin sembrar cuentas ficticias. La restauración del respaldo privado todavía no está verificada.

Una reversión de C retiraría el historial de renovaciones y los avisos nuevos: exporta y verifica un respaldo antes de considerar esa operación. Las pruebas de ida/vuelta se ejecutan solo sobre bases sintéticas. No se ejecutó rollback en la base existente.

Las rutas requieren sesión y las operaciones de mantenimiento requieren personal autorizado. Las renovaciones revalidan el actor y la propiedad dentro de la transacción. Un préstamo o aviso ajeno responde 404. La fecha, condiciones, rol y socio nunca se toman del formulario. Los mensajes se renderizan como texto de React; no se interpreta HTML del título o del motivo. Las tareas automáticas registran actor nulo, en lugar de atribuirse una persona que no las ejecutó.

La interfaz reutiliza el diálogo, formularios y estilo existentes; genera la clave al abrir una confirmación, bloquea el envío en curso y restaura el foco. Si el botón queda desactivado por alcanzar el límite, el foco vuelve al contenedor del control. Marcar un aviso como leído devuelve el foco al contexto de la vista. No se añadieron dependencias ni escenas 3D.

## Verificación y límites

La evidencia final de C se registra en `docs/evidence/v3-stage-c.json`. Incluye pruebas con reloj controlado de medianoche local, recogida inclusiva, cierres, FIFO y cierre de reservas con membresía inactiva; idempotencia y concurrencia real de renovaciones en MySQL; privacidad, manipulación de fechas, incorporación/reparación de existencias y regresiones anteriores. El recorrido de navegador comprueba cancelación del diálogo, confirmación por lector y personal, persistencia al recargar, avisos y foco, además de accesibilidad automatizada en móvil.

Las capturas nuevas están en `docs/screenshots/v3/renewals/`, `reservations-cycle/` y `reservations-smoke/`; las de B se conservan. La medición de presentación corresponde al entorno local y no prueba 60 FPS universales ni accesibilidad completa. No se han implementado aún cargos, pagos, ajustes o informes: son el alcance de D. Tampoco se presenta la demo 2.6 como circulación estática 3.0.
