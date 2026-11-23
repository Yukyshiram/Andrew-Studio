# Demo estática de circulación 3.0

La demo conserva React, Vite, las portadas originales, los componentes visuales compartidos y la apertura CSS. No carga Three.js ni WebGL. Laravel permanece en `modern/`, con sus operaciones y autorización reales; la demo no lo ejecuta ni le envía solicitudes.

## Qué se puede explorar

| Ruta | Experiencia |
|---|---|
| `/` y `/catalog` | Portada editorial, búsqueda, categorías, orden y paginación |
| `/catalog/:id` | Ficha, apertura de portada, disponibilidad ficticia y solicitud o reserva |
| `/my-library` | Solicitudes, préstamos, renovaciones, historial, cuenta y avisos del perfil lector seleccionado |
| `/news` | Incorporaciones y anuncios ficticios, filtros por tema, estado y fechas |
| `/demo/admin/circulation` | Validación, lista de espera, preparación, entrega y devolución; inventario de la muestra y reloj controlado |
| `/demo/admin/finance` | Pago manual ficticio y reversión conservando el original |
| `/demo/admin` y `/demo/admin/books` | Resumen, creación, edición, archivo, restauración y restablecimiento de la muestra |

El selector superior **no inicia sesión**. Visitante explora sin seleccionar otro perfil. Lucía y Nora representan lectores; Mateo, personal de biblioteca; Andrea, administración. El estado de cada cuenta ficticia sigue en memoria al cambiar de perfil, para completar ambos lados del recorrido. Elegir un perfil no autentica a una persona ni es una barrera de seguridad para datos reales.

## Recorrido del lector y del bibliotecario

1. Abre el catálogo y elige **Lucía · Lectora** en el selector de perfiles.
2. Abre **La arquitectura del silencio**, que inicia con dos ejemplares libres. Confirma **Solicitar libro**. La solicitud queda pendiente: todavía no hay préstamo ni entrega física.
3. En **Mi biblioteca**, consulta la solicitud. Cambia a **Mateo · Biblioteca**, entra al panel y abre **Circulación**.
4. Usa **Validar y preparar** sobre la solicitud de Lucía. El ejemplar queda apartado. Después, **Confirmar entrega** crea el préstamo ficticio con su vencimiento.
5. Regresa a la biblioteca y selecciona Lucía. **Mi biblioteca** muestra el préstamo, su fecha y las renovaciones usadas. **Renovar préstamo** comprueba las reglas antes de ampliar su fecha.
6. Selecciona Mateo y abre Circulación. **Recibir devolución** registra la condición y devuelve el ejemplar al inventario elegible, o lo marca como dañado/extraviado según la opción elegida.
7. Regresa a Lucía para consultar el historial y la disponibilidad actualizada en la ficha.

La solicitud inicial de **Las ciudades que recordamos** permite explorar una recogida preparada sin completar antes una nueva solicitud. Es un ejemplo distinto; no debe confundirse con una entrega confirmada.

## Reserva, fechas y cuenta

Nora inicia con el único ejemplar de **Atlas de lo invisible** prestado y vencido. Lucía puede reservar ese título; Biblioteca valida su entrada en la lista aprobada. La devolución del ejemplar prepara la siguiente reserva elegible. Una solicitud pendiente no recibe prioridad de reserva aprobada hasta su validación.

El reloj ficticio inicia el **22 de noviembre de 2026**. Biblioteca puede avanzar uno o siete días por acción, hasta 90 días desde el inicio, o actualizar la muestra sin avanzar el reloj. El plazo de recogida incluye su último día; al día siguiente se libera. Las renovaciones conservan las condiciones del préstamo y se bloquean cuando existe una solicitud ajena abierta, un vencimiento impeditivo, saldo excesivo o máximo de renovaciones.

Las tarifas de esta muestra son **ficticias**: MXN, 25 centavos por día abierto de retraso después de un día de gracia, domingos cerrados; 30.000 centavos por pérdida y 5.000 por daño. No representan tarifas oficiales. La cuenta inicial de Nora tiene 50 centavos de cargos y un pago parcial de 25: saldo de 25 centavos. La tesorería permite registrar un pago que no supere el saldo y revertirlo una vez mediante un movimiento inverso. No integra una pasarela ni mueve dinero.

Las novedades separan publicación editorial, llegada estimada e incorporación. Sus anuncios se identifican como ficticios; una estimación nunca crea ejemplares. Crear una ficha tampoco crea inventario. El archivo rechaza fichas con préstamos o solicitudes abiertos.

## Estado y límites deliberados

`library-domain.ts` ejecuta comandos sobre una copia del estado y solo acepta el resultado si conserva su integridad. Comprueba asignaciones exclusivas, solicitudes abiertas, orden de espera y eventos monetarios sin duplicar. Los importes se calculan en centavos enteros. Una operación fallida no deja cambios parciales. Las claves de operación evitan duplicar una confirmación en esta pestaña.

No hay almacenamiento de cuentas, préstamos ni dinero en cookies, `localStorage`, `sessionStorage` o bases de datos. Únicamente la preferencia de tema puede guardarse en `localStorage`. Recargar inicia la muestra como Visitante. **Restablecer datos**, con confirmación, reinicia fichas, circulación, movimientos y reloj, conservando el perfil ficticio elegido para no sacar al usuario del panel.

La demo no reproduce todos los módulos del servidor: alta real de socios, autenticación, recuperación por correo, configuración de políticas, altas físicas de inventario, concurrencia entre operadores, informes completos, créditos y ajustes contables pertenecen a Laravel. El estado conserva hasta 100 acciones de la muestra; Circulación presenta las 12 más recientes. No es una auditoría de producción. No se deben introducir datos personales reales en sus formularios de prueba.

## Ejecución y comprobación

Desde la raíz del repositorio:

```powershell
npm ci
npm run dev
```

Abre `http://127.0.0.1:4173`. La compilación estática continúa siendo `npm run build`, salida `dist/`; `vercel.json` conserva el fallback SPA. No requiere PHP, Composer, Docker, MySQL ni variables privadas para compilar la demo.

```powershell
npm run test:domain
npm run build
npm run security:check
node demo/scripts/playwright.mjs install chromium firefox webkit
npm test
```

`test:domain` comprueba TypeScript de las pruebas y ejecuta 13 casos del motor con Node. Playwright solo descubre archivos `*.spec.ts`, para mantener separado ese runner. Las pruebas de navegador comprueban operaciones mediante controles visibles, errores de consola, peticiones externas o de servidor, rutas profundas, foco, ambos temas y tamaños de pantalla. Las capturas ordinarias se guardan en directorios ignorados para no reemplazar las referencias históricas 2.6.

La medición comparativa usa `demo/tests/performance.spec.ts`; sus duraciones CDP y tareas largas no son FPS de renderizado. No garantiza 60 FPS ni representa un dispositivo móvil físico. [Resultados, capturas y limitaciones de integración](22_RESULTADOS_Y_LIMITES_3.md).
