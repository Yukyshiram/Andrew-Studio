# Tesorería y movimientos — Etapa D

El módulo registra cargos y pagos recibidos por otros medios. El registro pertenece a Laravel y su base de datos. La demo estática tendrá ejemplos ficticios en F. Los datos y capturas de QA son sintéticos; las tarifas iniciales de la aplicación son cero y cada institución debe configurar las suyas.

## Guía del lector

Abre **Mi biblioteca → Cargos y saldo**. Se muestran tres cantidades: saldo registrado, cargos calculados pendientes de registrar y saldo total calculado. El historial paginado incluye fecha efectiva, importe, motivo, referencia y responsable. Los importes negativos reducen el saldo. Los pagos y abonos aparecen después de registrarlos el administrador.

«Actualizar mis cargos» registra los cargos pendientes calculados con las condiciones de tus préstamos. Repetirlo no duplica cargos. La consulta y esta acción se limitan a tu cuenta, independientemente de los identificadores que se intenten enviar. La consulta GET no crea movimientos.

## Guía administrativa

1. Abre **Tesorería**. Busca por nombre o número de socio y selecciona la cuenta. Los resultados de socios y movimientos tienen paginación independiente.
2. Comprueba el saldo registrado y los cargos calculados. «Actualizar cargos de esta cuenta» registra los pendientes. También se calculan automáticamente al renovar o cerrar un préstamo y mediante la tarea horaria.
3. «Registrar movimiento» permite un pago recibido, un abono autorizado o un ajuste que aumente/reduzca el saldo. Introduce el importe con hasta dos decimales, motivo obligatorio y referencia opcional. La referencia y el motivo serán visibles para el socio.
4. Confirma después de revisar el tipo y efecto. Cada apertura empieza con campos limpios y tipo «Pago registrado». Un envío fallido no crea movimientos; se conserva el formulario para corregirlo.
5. Para corregir un registro, usa «Revertir». Escribe el motivo. Se añade el importe opuesto, vinculado al original, y ambos permanecen visibles. Una reversión no se revierte otra vez. Si retirar un cargo crearía saldo a favor, hay que revisar/revertir primero los pagos o abonos pertinentes.

Solo administradores actuales registran movimientos manuales, revierten o consultan informes generales. El bibliotecario registra circulación: los cargos que procedan se calculan con la política acordada. El lector consulta su propia cuenta y puede solicitar su actualización.

## Importes, política y cálculo

Todos los cálculos de negocio usan enteros en centavos. El formulario convierte por separado unidades y decimales a enteros; rechaza exponentes, separadores de miles, más de dos decimales y valores inválidos. La división entre cien se usa únicamente para presentación. El servidor valida otra vez el entero y calcula el signo. Un movimiento manual admite hasta 1.000.000.000 centavos; el saldo puede acumular varios movimientos.

| Tipo | Efecto y origen |
|---|---|
| Retraso | Cargo positivo por día abierto, después de la gracia, usando la tarifa y calendario guardados al entregar. |
| Pérdida / daño | Cargo positivo configurable al cerrar el préstamo en esa condición; una sola vez por préstamo y concepto. |
| Pago registrado | Importe negativo, registrado manualmente después de recibir el pago por otro medio. |
| Abono autorizado | Importe negativo que reduce deuda con un motivo explícito. |
| Ajuste | Importe positivo o negativo, con motivo, referencia opcional y responsable. |
| Reversión | Importe exactamente opuesto al original, con enlace único y motivo. |

La gracia se aplica a los días abiertos posteriores a cada vencimiento. El último día de un cargo se determina en la zona de la biblioteca; una devolución detiene el devengo ese día. Las tarifas de un préstamo no cambian retroactivamente al editar la política.

Al renovar se registran los cargos del periodo anterior **antes de cambiar el vencimiento**. Para préstamos que ya se habían renovado antes de incorporar tesorería, se reconstruyen los periodos anteriores desde `loan_renewals`. La clave diaria única por préstamo/fecha evita duplicar cargos al repetir el proceso o reconstruir periodos. Revertir un cargo no lo vuelve a generar. Un préstamo cerrado se marca como liquidado para el cálculo después de evaluar sus cargos; ese marcador no significa que el socio haya pagado.

No se admiten sobrepagos ni saldos a favor. Un pago, abono o reversión que los causaría se rechaza dentro de la transacción. El sistema lleva una cuenta global por socio; todavía no distribuye cada pago entre facturas o cargos individuales. La reversión registra una corrección contable de la aplicación; cualquier devolución física de dinero se gestiona por otros medios.

El saldo máximo de política es inclusivo: con máximo 100 centavos se permiten 100 y se bloquea al superar 100. El valor 0 desactiva este bloqueo. Se consideran tanto cargos registrados como calculados para impedir que el retraso del planificador permita eludirlo. El bloqueo afecta solicitudes, preparación, entrega y renovación, y permite devolver el ejemplar. Una regularización del saldo permite volver a solicitar cuando se cumplen las demás reglas.

La moneda no puede cambiar después del primer préstamo o movimiento financiero. Si cambia antes del primer registro mientras está abierto un formulario, el servidor rechaza esa confirmación y pide revisar el importe. Una conversión de cuentas requeriría una migración explícita; no se reinterpretan cantidades cambiando un código de moneda.

## Informes

Los periodos incluyen ambas fechas y admiten hasta 366 días, incluido un año bisiesto completo. Se filtra por fecha efectiva del movimiento, socio y búsqueda. La fecha/hora UTC de registro y la zona civil usada se conservan por separado.

El informe separa pagos brutos registrados, reversiones de pagos y pagos netos. Una reversión de un pago de otro periodo puede producir pagos netos negativos en el periodo consultado; el pago original sigue en el suyo. También se muestran grupos por tipo, movimiento neto del periodo y saldo registrado actual de las cuentas filtradas. El movimiento neto del periodo y el saldo actual representan cantidades diferentes; los cargos calculados pendientes no se presentan como movimientos ya registrados.

Este es un registro operativo de biblioteca. No se emiten comprobantes fiscales ni se verifica una conciliación bancaria externa.

## Persistencia, auditoría y concurrencia

`financial_entries` conserva socio, préstamo opcional, responsable, tipo, centavos, moneda, clave única, reversión de origen, motivo, referencia, fecha efectiva, zona y fecha/hora de registro. Sus referencias restringen la eliminación de historia. No hay endpoints de edición o borrado; los modelos rechazan ambas operaciones. La corrección es otro movimiento. Las credenciales administrativas de la base siguen permitiendo operaciones SQL: restringir y auditar ese acceso forma parte de la preparación de producción.

Todos los movimientos se serializan con la misma fila de política utilizada por circulación y cambios de permisos. Las claves UUID se normalizan y quedan vinculadas al actor y la intención; reusarlas con cantidades, cuenta o motivo distintos se rechaza. La reversión original es única. Las pruebas MySQL usan procesos simultáneos: dos pagos distintos que excederían la deuda producen un pago y un rechazo; dos reenvíos del mismo pago producen un solo registro.

Cada entrada genera auditoría con actor, tipo, importe, moneda y vínculo de reversión. En cálculos solicitados por un usuario queda registrada esa identidad; la ejecución programada registra actor nulo. Los datos financieros se consultan con sesión y autorización, los formularios tienen CSRF y los datos de actor, moneda, fecha y origen se determinan en servidor. Los mensajes se muestran como texto, incluido el contenido usado en las pruebas XSS.

## Operación local y migración

La migración añade la tabla financiera y `loans.fee_settled_at`, sin sustituir los registros de circulación. Se comprobó la ida/vuelta con préstamos y asignaciones sintéticos conservados. La base local se amplió tras un respaldo privado y comparación de las tablas históricas, sin sembrar datos ficticios. La restauración de los respaldos privados continúa pendiente de comprobar.

```powershell
cd modern
docker compose --profile automation up -d --no-deps scheduler
docker compose exec -T scheduler php artisan schedule:list
docker compose exec -T scheduler php artisan library:assess-charges
```

El proceso local está activo. Se observaron los disparos horarios de `library:refresh-reservations` y `library:assess-charges` el **22/11/2026 a las 10:00 UTC**, ambos con resultado `DONE`. No se instaló un planificador global del sistema. El comando de cargos recorre por lotes préstamos activos o aún no evaluados, con un límite de ID tomado al comenzar; las claves únicas y transacciones permiten reejecutarlo.

Retirar la migración D eliminaría el libro de movimientos y sus referencias: antes de cualquier reversión operativa se necesita exportación y restauración verificadas. Las pruebas destructivas utilizan solo SQLite en memoria o el MySQL QA separado. Tras la comprobación de D se detuvo únicamente el MySQL QA para liberar recursos; el script vuelve a arrancarlo cuando hace falta.

## Validación y compatibilidad

La evidencia de D (referencia histórica o evidencia local no publicada) registra 226 pruebas PHP: en SQLite hay 222 aprobadas, cuatro omisiones deliberadas y 1.474 aserciones; en MySQL se aprobaron las 226 con 1.534 aserciones. Los 22 recorridos nativos, seis de circulación/tesorería en tres motores y tres financieros repetidos después del control de moneda verifican importes, encadenamiento de formularios, rechazo de sobrepagos, consulta privada, XSS, pagos, reversión, historial, foco y accesibilidad automatizada. Las capturas sintéticas están en `docs/screenshots/v3/finance/`.

Las pruebas detectaron dos particularidades corregidas en la interfaz: Inertia 3 actualiza los valores predeterminados después de guardar, por lo que una operación nueva ahora establece explícitamente sus valores iniciales; WebKit no siempre enfoca un botón al pulsarlo, por lo que el diálogo admite una referencia explícita de retorno y alternativa si el control desaparece o se desactiva.

Firefox 1572 con Playwright 1.65.1 reproducía un cierre al analizar regiones con `aria-labelledby`. Coincide con la [incidencia del proyecto Playwright](https://github.com/microsoft/playwright/issues/44135). Las regiones financieras conservan sus encabezados y nombres accesibles mediante `aria-label`. Tras ese cambio pasaron las repeticiones finales en los tres motores con Axe normal. Se retiró el modo de compatibilidad que se había probado sin resolverlo; no se desactivaron reglas ni se instalaron versiones preliminares.

La adaptación sigue la separación entre cargos, abonos y correcciones descrita en el [manual de cuentas de Koha](https://koha-community.org/manual/latest/en/html/patrons.html#accounting), con reglas propias documentadas aquí. No implica compatibilidad contable con Koha ni una certificación fiscal. La auditoría automatizada de accesibilidad es una comprobación parcial; la revisión manual completa y el despliegue de producción siguen siendo trabajo posterior.
