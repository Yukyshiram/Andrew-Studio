# Resultados, cobertura y límites de Andrew's Bibliotecary 3.0

> Informe de validación local previo a la limpieza de publicación. Las evidencias completas y capturas masivas se conservan en el workspace y ZIP local, fuera de GitHub. Las referencias a commits corresponden a la rama de desarrollo local. La publicación, pruebas finales y correspondencias se registran en [publicación limpia](25_PUBLICACION_LIMPIA.md). La interacción «Abrir portada» fue retirada después de esta medición por petición del usuario.

La implementación local A–F está comprobada. Laravel incorpora circulación persistente; la demo completa el recorrido con datos ficticios y sin backend. Este informe no declara un despliegue público ni aprobación de producción.

La evidencia consolidada es v3-stage-f.json (referencia histórica o evidencia local no publicada), sobre el código `5439879`. Los commits posteriores de documentación no modifican ese comportamiento. Las etapas anteriores tienen sus propios informes A–E; sus cifras históricas no sustituyen esta ejecución final.

## Controles ejecutados

| Control | Resultado real |
|---|---|
| PHP / SQLite en memoria | 272 aprobadas, 4 omisiones exclusivas de MySQL; 1.869 aserciones |
| PHP / MySQL 8.4 aislado | 276 aprobadas; 1.929 aserciones; 0 fallos y 0 omisiones |
| PHPStan | Aplicación y `LibraryDemoSeeder`, nivel 5, aprobados |
| Laravel: TypeScript y build | Aprobados; PHP 8.4.28 y dependencias de los lockfiles |
| Laravel: Playwright | 23 recorridos en Chromium, sin fallos, omisiones ni reintentos |
| Demo: TypeScript de aplicación y pruebas | Aprobado |
| Motor de demo: Node | 13 pruebas aprobadas |
| Demo: suite completa Playwright | 69 casos: **65 aprobados y 4 omisiones previstas**; 0 fallos y 0 casos inestables; sin reintentos |
| Motores y tamaños | Chromium, Firefox y WebKit; escritorio, tablet/móvil, reflujo a 320 px y tacto emulado |
| Desarrollo en tiempo real | Otros 3 casos Chromium aprobados en el servidor existente de 4173: ciclo completo y filtro con/sin movimiento |
| Instalación independiente de demo | `npm ci`, build y 13 pruebas del motor aprobados; sin `modern/node_modules`, `vendor`, PHP ni MySQL |
| Reproducibilidad del artefacto | Los 24 archivos de `dist/` de esa copia coinciden por SHA-256 con el build comprobado |
| Instalación limpia de Laravel | Instalación y repetición aprobadas en otro proyecto Compose, con dependencias/volúmenes nuevos y puertos propios |
| Recuperación sintética | Dump y restauración en otra base aislada; mismas cantidades y firma de todos los datos |
| Auditorías de dependencias | npm raíz y Laravel: 0 vulnerabilidades; Composer: 0 advisories y 0 paquetes abandonados |
| Secretos/artefacto | Escaneo heurístico aprobado, sin archivos de servidor o configuración privada en `dist/` |

Las cuatro omisiones de navegador corresponden a las capturas generales y medición CDP en Firefox/WebKit; esas tareas diagnósticas se ejecutan en Chromium. **Los recorridos funcionales y táctiles no se omiten en esos motores.** Las cuatro omisiones SQLite son los procesos simultáneos exclusivos de MySQL; en MySQL sí se ejecutan.

La comprobación final solicitada de retirada de la vista 3D volvió a pasar en Chromium, Firefox y WebKit sobre el servidor de desarrollo: sin botón «Vista 3D» ni canvas, con navegación y apertura CSS operativas. No se incorporaron Three.js ni WebGL.

La suite nativa completa volvió a ejecutarse con `modern/scripts/test.ps1 -KeepTestServer`, incluyendo el MySQL separado y su detención en `finally`. Las matrices nativas adicionales de circulación, finanzas e incorporaciones en tres motores están registradas en E (referencia histórica o evidencia local no publicada) y [D](19_TESORERIA_Y_MOVIMIENTOS.md). F no modificó lógica PHP ni componentes visuales del servidor: añadió la demo y reforzó instalación/QA. Pint pertenece a las puertas PHP anteriores; no se afirma una nueva ejecución de Pint sobre cambios exclusivamente TS/PowerShell/documentales.

## Cobertura funcional y comparación

| Requisito | Antes de 3.0 | Implementación y evidencia |
|---|---|---|
| Dominio bibliográfico | Fichas sin copias físicas | ISBN opcional, edición e idioma; `BookCopy`, `Member`, `LibraryPolicy`. Migraciones, reglas HTTP/servicio e integridad comprobadas en A y regresión PHP final |
| Socios | Cuentas de acceso | Membresía separada, alta al registrarse, alta explícita de cuentas antiguas, suspensión/vencimiento/cupo; permisos y formularios probados |
| Solicitar y entregar | No existía circulación | Solicitud pendiente, preparación y entrega separadas; reserva de una copia, préstamo y devolución. Pruebas HTTP, servicios y E2E reales |
| Variantes | No existían | Rechazo con motivo, cancelación, falta de copia, espera, vencimiento, daño/pérdida y bloqueos; historial conservado |
| Exclusión de ejemplar | No aplicaba | Asignaciones y préstamo activo únicos, transacciones y locks; procesos MySQL simultáneos comprueban preparación/entrega competidoras |
| Calendario y renovación | No existían | Zona bibliotecaria, días cerrados, cierres explícitos, gracia, máximo y términos guardados. Reloj controlado y renovación concurrente probados |
| Reserva y avisos | No existían | FIFO de solicitudes aprobadas, recogida inclusiva, liberación/siguiente persona, cierre explicado de membresías inactivas y avisos privados. Pruebas C y regresión final |
| Tesorería | No existía | Cargos en centavos, mora reproducible, daño/pérdida, pagos/abonos/ajustes, reversión e informes; duplicados y pagos competidores probados en MySQL |
| Privacidad y roles | Autenticación y roles 2.0 | Lector solo consulta su cuenta; bibliotecario sin tesorería/roles/políticas; administrador autorizado. CSRF, IDOR, validaciones, actor fresco y auditoría en servidor comprobados |
| Próximos títulos | No existían incorporaciones | Publicación/llegada/incorporación separadas; stock físico antes de incorporar, versión de edición, filtros y notas públicas. Pruebas E, incluidas referencias que bloquean rollback del legado |
| Paneles | Resumen de catálogo | Datos reales de BD adaptados a lector/personal/administrador; abrir el panel no crea cargos. Pruebas `DashboardTest` y recorrido de incorporaciones |
| Demo | Catálogo y fichas en memoria | Perfiles ficticios; solicitud → preparación → entrega → renovación/devolución → historial/disponibilidad; reservas, reloj, avisos, pago/reversión y novedades. Node y E2E sin llamadas a PHP/API/servicios locales |
| Experiencia y navegación | Apertura CSS y transiciones 2.6 | Identidad conservada; desplazamiento real de tarjetas al filtrar, navegación compartida/fallback, foco/restauración, diálogo, estados vacíos y carga real. Movimiento reducido explícito |
| Migración e historia | Importación y papelera 2.0 | Esquema aditivo, sin fabricar copias/socios de datos antiguos; rollback conservador e integridad de lote; referencias protegidas y originales recuperables |
| Entrega y puesta en marcha | Scripts 2.0 | Instalación protegida 3.0, dos aplicaciones documentadas, CI preparado, guías, capturas, resultados y procedimiento de publicación sin acciones remotas |

El [modelo entidad-relación y reglas](16_DOMINIO_BIBLIOTECARIO_3.md), [reservas](18_RESERVAS_Y_RENOVACIONES.md), [finanzas](19_TESORERIA_Y_MOVIMIENTOS.md), [incorporaciones/paneles](20_NOVEDADES_Y_PANELES.md), [demo](21_DEMO_CIRCULACION.md) y [guía operativa](23_GUIA_DE_USO_3.md) desarrollan las decisiones. La inspección inicial no atribuía préstamos al legado; se implementaron como alcance nuevo, según la misión 3.0.

La demo no reproduce un ERP ni sustituye autorización o concurrencia de servidor. La tabla distingue sus operaciones simuladas de las reales. No hay lectura completa de libros, uploads, pasarela de pago, compra a proveedores, contabilidad fiscal, MARC, RFID o préstamos entre sucursales.

## Seguridad corregida y riesgos conservados

| Área | Control activo 3.0 | Verificación / límite |
|---|---|---|
| SQL e inputs | Eloquent/consultas parametrizadas, Form Requests y validación de servicios | Entradas inválidas, filtros literales y persistencia atómica; no es una certificación ASVS completa |
| XSS y URLs | Texto escapado, colores controlados y fuentes de noticias HTTPS sin credenciales embebidas | Formularios reales y demo prueban texto `<img ...>` sin ejecutarlo; las fuentes editoriales no se verifican automáticamente |
| CSRF, sesión y cuenta | Autenticación y controles Laravel, cookie HttpOnly/SameSite, recuperación local e invalidación de sesión | E2E con CSRF real, cabeceras y SMTP Mailpit; HTTPS/correo externos pendientes |
| Permisos/IDOR | Actor y titular determinados en servidor, políticas y comprobación tras lock | Negativas de roles y cuentas ajenas; el selector ficticio de la demo no autentica ni protege datos reales |
| Doble préstamo / reenvío | Restricciones, transacciones, claves de operación y términos guardados | Competencia real de procesos MySQL; el estado en memoria solo serializa acciones de una pestaña |
| Dinero | Enteros, historial sin endpoints de edición/borrado, reversión única y auditoría | Pagos/reversiones exactos, sobrepago rechazado, cargo sin duplicar; un administrador SQL todavía puede alterar la BD fuera de la aplicación |
| Datos y secretos | Configuración privada fuera de Git y del artefacto; pruebas en bases sintéticas | Escaneo heurístico y selección explícita de entregables; no equivale a ausencia demostrada de todo secreto imaginable |
| Legado | Código preservado, host local separado y fuera de `dist/`/`modern/public/` | Conserva sus debilidades históricas. **Riesgo alto si alguien vuelve a servirlo públicamente**; no debe publicarse la raíz como PHP |

La auditoría del legado y ASVS focalizada permanece en los informes originales. Estas correcciones corresponden al sistema moderno; no se afirma haber endurecido y publicado los endpoints históricos manteniéndolos intactos.

Pendientes operativos de producción: TLS/proxy y cookies Secure; proveedor de correo; cuentas demo deshabilitadas; credenciales de BD con permisos mínimos; revisión/parches de imágenes; copias externas, cifrado/retención y restauración de un respaldo real; logs y alertas; scheduler/colas del destino. No se afirma despliegue, escaneo Docker completo, monitorización activa o validación en otro hosting.

La fila de política actúa como exclusión conservadora para operaciones administrativas sensibles. Protege consistencia y puede limitar el rendimiento de escritura: no se realizó ensayo de carga, 50.000 fichas ni throughput de producción. La búsqueda usa `LIKE` parametrizado y paginación; no es full text. Accesibilidad automática, teclado y tacto emulado no acreditan una revisión integral con lector de pantalla o dispositivos físicos.

## Rendimiento medido

Mismo protocolo de seis contextos fríos: tres escritorio 1440×1000 y tres móvil emulado 390×844, DPR 1, Chromium 159, Windows y Ryzen 7 5700G; sin throttling y con caché de navegador deshabilitada. Vite preview sirve en loopback. El recorrido compara inicio → catálogo → filtro «arquitectura» → ficha → apertura CSS.

| Métrica de laboratorio | 2.6, antes | 3.0 final |
|---|---:|---:|
| Mediana LCP escritorio | 340 ms | 196 ms |
| Mediana LCP móvil emulado | 272 ms | 184 ms |
| CLS máximo de carga, ambos perfiles | 0 | 0 |
| Mediana transferencia inicial total | 252.476 B | 277.792 B |
| Mediana transferencia inicial JS | 160.946 B | 185.301 B |
| Mediana tareas largas iniciales, escritorio/móvil | 1 / 1 | 1 / 1 |
| Mediana duración tareas largas iniciales, escritorio/móvil | 131 / 112 ms | 76 / 81 ms |
| Mediana tareas largas durante interacción, escritorio/móvil | 0 / 0 | 0 / 0 |
| Mediana JS durante recorrido, escritorio/móvil | 99,6 / 82,5 ms | 74,8 / 71,1 ms |
| Mediana layout durante recorrido, escritorio/móvil | 32,7 / 27,2 ms | 22,8 / 20,9 ms |

La transferencia total aumenta **25.316 B, aproximadamente 10 %**; JS aumenta 24.355 B. Se añadieron el estado de circulación y el soporte de layout de Motion que la experiencia de filtrado necesitaba. Las vistas de lector, circulación, finanzas, fichas administrativas y novedades siguen separadas en chunks; no se añadieron dependencias ni WebGL.

**El LCP menor no demuestra una mejora causada por el código.** La referencia tenía aproximadamente 840–1.133 MiB libres; la medición final, 5.632–5.732 MiB. La carga de otros procesos y condiciones de laboratorio varían. No son percentiles de campo, prueba de CDN/Vercel o un móvil físico. La observación no demuestra ausencia universal de regresiones de Core Web Vitals.

Datos antes (referencia histórica o evidencia local no publicada), estado intermedio antes de activar layout (referencia histórica o evidencia local no publicada) y datos finales (referencia histórica o evidencia local no publicada). Las muestras contienen tareas largas y duraciones CDP; estas incluyen automatización. **No se midieron FPS físicos ni se afirma 60 FPS verificados.** El muestreo de matrices con rAF solo comprueba que la tarjeta cambia de posición mediante transform y que lo omite con movimiento reducido.

## Instalación, recuperación y conservación

La copia independiente de demo instaló dependencias desde cero, sin dependencias PHP ni `modern/node_modules`; recompiló los mismos 24 archivos por SHA-256. Necesita los recursos compartidos de presentación y `modern/legal/`, pero no el backend ejecutándose. El primer fixture omitió ese aviso legal y falló correctamente; se corrigió la selección de archivos de la copia y el build final coincidió. No fue necesario cambiar la aplicación ni quitar avisos de licencia.

Laravel se instaló con `install.ps1 -Demo` en otro proyecto Compose, con nuevas credenciales, volúmenes y puertos locales. La muestra resultante tuvo 25 fichas, seis cuentas, cuatro socios, seis ejemplares, tres préstamos y seis incorporaciones. Repetir la instalación conservó el entorno y la firma de todas las filas. Se restauró un dump sintético en una segunda base; coincidieron cantidades y firma. El fixture se detuvo sin eliminar volúmenes. Se usó el mismo Windows/Docker: no se certifica una máquina nueva ni se restauró el respaldo real.

La actualización de la base conservada se había aplicado con respaldo privado y comparación de las cuatro tablas históricas, sin seeding: E (referencia histórica o evidencia local no publicada). El [procedimiento de migración](06_MIGRACION.md) distingue importación, cambio de esquema y recuperación; volver al código anterior no revierte automáticamente datos nuevos.

Conservación final (referencia histórica o evidencia local no publicada): el respaldo inicial privado sigue con 34 entradas recuperables; 32 archivos de código/recursos coinciden byte por byte. `.gitignore` y `README.md` ya eran diferencias documentales anteriores a 3.0; en esta misión solo se actualizó el contenido del README de portada respecto a 2.6. Su versión anterior permanece en la rama protegida. La comparación con blobs Git contempla LF/CRLF sin reescribir originales. No se publican ese ZIP original, respaldos SQL ni configuraciones privadas.

Licencia y referencias históricas permanecen intactas. La consulta remota final de `main` seguía en `372dbf3`; no se hizo push, merge, force push ni despliegue. Los scripts, reglas y dependencias se mantuvieron dentro del workspace; no se modificaron políticas o configuraciones globales de herramientas.

## Capturas y trazabilidad

Se generaron **72 capturas de demo** de escritorio/tablet/móvil y recorridos/temas en Chromium, Firefox y WebKit. El conjunto completo se conserva como evidencia local fuera de Git. Incluye préstamo renovado, devolución/historial, solicitud cancelada, circulación, tesorería, novedades y temas móviles. Se revisaron visualmente capturas representativas; esto no significa inspección manual individual de cada píxel de las 72. La [galería del README](screenshots/readme/) contiene una selección ligera actualizada, sin duplicar las capturas históricas.

Las pantallas reales de incorporaciones y paneles de E se conservan localmente; el [panel de Laravel con datos sintéticos](screenshots/readme/panel-laravel.webp) sigue disponible en la galería. Las etapas anteriores mantienen su evidencia local de inventario, políticas, socios, circulación y finanzas. Los artefactos de repetición nativa, trazas y datos privados se guardaron fuera de los entregables públicos.

Durante la validación se corrigieron el retorno de foco del menú móvil y la ausencia efectiva de animación de layout. El soporte básico de Motion no la registraba; ahora se comprueba el movimiento de la misma tarjeta y su supresión explícita con reduced-motion. Se ajustó el ensayo de contraste para usar el control real de tema y esperar transiciones finitas, conservando todos los criterios Axe. La suite final no usa retries ni exclusiones de accesibilidad.

Lista de commits locales desde 2.6 (referencia histórica o evidencia local no publicada). Las unidades de F separan motor, interfaz, QA MySQL, instalación, movimiento y auditoría de tema; el registro A–E está en [implementación](17_IMPLEMENTACION_3.md). El commit documental que contiene este informe añade las evidencias y guías sin alterar la lógica comprobada.

La publicación y el PR remoto quedan sujetos a la autorización del usuario: [borrador y procedimiento](24_PREPARACION_PUBLICACION_3.md). La conexión Vercel respondió a lecturas, pero no identificó este proyecto por los nombres consultados; no se creó ni enlazó uno ni se inició sesión de nuevo.
