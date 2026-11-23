# Limpieza y trazabilidad de publicación 3.0

Origen local: `c808d5fd1aa5ff41c19c1e6c46b142f26e57f2af`. Base remota comprobada: `372dbf39743656ae1f06971b1c6f11c07a655a2c`. Rama nueva: `codex/publicacion-bibliotecary-3`.

La rama de desarrollo y las referencias históricas permanecen intactas. Los ocho commits iniciales de modernización/demo todavía inéditos se sustituyen por una base selectiva de 2.6 sin WebGL; las unidades posteriores conservan sus asuntos, autores y fechas de autoría. El campo Origen-local permite contrastarlos en el workspace original. Los commits que solo cambiaban evidencia excluida no se reproducen vacíos.

Se excluyen todas las versiones inéditas de .local/, ZIPs, SQL/SQLite/dumps, secretos, dependencias instaladas, dist, cachés, trazas, resultados Playwright, inventarios generados y capturas salvo cuatro representativas. El PHP legado queda recuperable en la historia, fuera del árbol activo. Los recursos actuales de demo/ y modern/ se conservan; únicamente se omite modern/CLAUDE.md, duplicado de las reglas de modern/AGENTS.md.

No se reescribe ningún commit publicado ni se utiliza force push. Las referencias locales originales no forman parte del push de la rama limpia.

## Correspondencia de unidades locales

| Origen local | Commit reconstruido | Cambio |
|---|---|---|
| `827be7c` | `cebd4d4` | Conserva Laravel y la demo como base de la versión 3.0 |
| `e17e1ac` | `efee2fe` | Documenta el dominio y las etapas de circulación |
| `6357ef7` | `e1ccec8` | Separa fichas bibliográficas y ejemplares físicos |
| `095201b` | `b77f997` | Agrega la gestión de ejemplares |
| `1acf7f1` | `d696f35` | Agrega membresías y atención a socios |
| `376fd7e` | `5b40e94` | Configura políticas y calendario de la biblioteca |
| `80e5623` | `e946123` | Rechaza tipos inválidos en el ISBN |
| `d564a11` | `8700467` | Aísla las pruebas de integración con MySQL |
| `7490060` | `430f111` | Registra la validación del inventario y las políticas |
| `77026d3` | `6467905` | Implementa solicitudes y préstamos por ejemplar |
| `0962da3` | `a1c41be` | Conecta Mi biblioteca con la circulación real |
| `2512787` | `fe24797` | Protege fichas y permisos durante la circulación |
| `af6f6cc` | `b227dea` | Valida cambios de moneda y calendario |
| `f8e3758` | `1830009` | Conserva como desconocido el idioma no registrado |
| `28aab2c` | `5f0d525` | Respalda y actualiza la base local sin reemplazar datos |
| `b4627c8` | `0dc8d96` | Impide ejecutar pruebas sobre bases no aisladas |
| `3504ee5` | `bc65a68` | Conserva los lotes históricos al ampliar el esquema |
| `573f08b` | `f0934a0` | Mejora la consulta de circulación e inventario |
| `ef26d60` | `9869465` | Aclara el resultado de entregas repetidas |
| `639f96d` | `b1da834` | Separa los artefactos y archivos temporales de pruebas |
| `2553927` | `c4fdcdd` | Registra las pruebas y capturas de circulación |
| `feb267f` | `838550b` | Define avisos y registros de renovación |
| `0bee5d6` | `e2ae697` | Implementa reservas y renovaciones idempotentes |
| `b798ac8` | `1e676c0` | Conecta renovaciones y avisos con Mi biblioteca |
| `d773b18` | `fd71d87` | Agrega el programador local de reservas |
| `43eb46f` | `c8a93f3` | Cierra reservas de membresías inactivas con aviso |
| `986ae65` | `a41c647` | Documenta reservas y sus pruebas de regresión |
| `fb6d6f8` | `df2cc04` | Define el registro financiero en centavos |
| `d8b0e2d` | `38bbb77` | Calcula cargos y registra pagos reversibles |
| `def5433` | `8f80ddd` | Conecta tesorería y controles de saldo |
| `fd228d0` | `01042e5` | Agrega tesorería y saldo del lector |
| `8b1e490` | `f73b596` | Revalida la moneda al confirmar movimientos |
| `77b98de` | `499ac8b` | Unifica los tipos de React de la demo |
| `f70ada1` | `2c839a6` | Documenta tesorería y regresiones pendientes |
| `4590b24` | `ad01fbe` | Registra adquisiciones sin inventar existencias |
| `41d1876` | `00c4680` | Comprueba la llegada a cada ruta de la demo |
| `ce93958` | `4514197` | Conserva al responsable al revertir adquisiciones |
| `f3f15e4` | `c995e42` | Prepara una muestra bibliotecaria protegida |
| `f91fe4f` | `e862df0` | Conecta novedades e incorporaciones |
| `b77fc7e` | `28ba7ff` | Agrega paneles con datos de la biblioteca |
| `5feb262` | `a730493` | Documenta novedades y paneles verificados |
| `24c7908` | `3f34c4d` | Mide la demo antes de integrar circulación |
| `9b8f3e0` | `1a0b95a` | Define la circulación ficticia de la demo |
| `8213dfa` | `47738fe` | Conecta la demo con circulación y novedades |
| `ba9e683` | `22887d5` | Ejecuta MySQL aislado y protege las pruebas |
| `26f51ab` | `9b5f967` | Instala la muestra protegida de la biblioteca |
| `ea31dd5` | `8dc6077` | Activa el movimiento del catálogo y respeta preferencias |
| `5439879` | `4bf55d7` | Espera el tema visible antes de auditar contraste |
| `6790e62` | `30b0def` | Documenta la biblioteca y sus resultados finales |
| `c808d5f` | `e637f2f` | Retira la apertura de portadas |

## Verificación de publicación

Se verificó la rama limpia desde su propio checkout, con dependencias nuevas y sin reutilizar bases de datos de la instalación principal:

| Control previo al push | Resultado |
|---|---|
| Demo: `npm ci` desde la raíz y build con salida `dist/` | Aprobados; avisos legales y fuentes presentes |
| TypeScript de demo y sus pruebas | Aprobado |
| Motor de la demo | 13 pruebas aprobadas |
| Playwright demo, Chromium/Firefox/WebKit | 65 aprobadas, 4 omisiones diagnósticas previstas, 0 fallos y 0 reintentos |
| Instalación Laravel con dependencias y volúmenes propios | Aprobada; solo datos sintéticos |
| PHP / SQLite en memoria | 272 aprobadas, 4 exclusivas de MySQL omitidas; 1.869 aserciones |
| PHP / MySQL aislado | 276 aprobadas, 1.929 aserciones, sin omisiones |
| PHPStan nivel 5, TypeScript y build Laravel | Aprobados |
| Playwright Laravel en Chromium | 23 aprobadas, 0 omisiones, fallos y reintentos |
| Auditorías npm raíz/Laravel y Composer | Sin vulnerabilidades notificadas |
| Gitleaks 8.30.1, historial local original y reconstruido | Sin secretos detectados; escaneo heurístico, no certificación |

La primera ejecución de QA en una instalación nueva descubrió que el script creaba SQLite como root y provocaba respuestas 500 al guardar sesiones. Se conservó ese fixture privado, se corrigió la preparación para ejecutar como www-data y se repitió la suite con un archivo SQLite nuevo. La comprobación de accesibilidad ahora exige HTTP 200 y no confunde una página de error con una pantalla válida. Ningún cambio relaja permisos ni afecta datos de la instalación principal. El contenedor QA anterior se restauró al finalizar; los proyectos sintéticos nuevos se detuvieron sin borrar volúmenes.

El árbol de publicación contiene 310 archivos y solo cuatro capturas representativas. El runtime, migraciones, dependencias declaradas y recursos funcionales se mantienen iguales al origen c808d5f. Las diferencias de código posteriores se limitan a la preparación de QA, comprobaciones HTTP y destinos de sus artefactos; la documentación y reglas de exclusión se adaptan a esta entrega. Los informes/capturas masivos, ZIPs, dumps, claves, .env y resultados generados no forman parte del árbol ni de los objetos inéditos seleccionados. Se preservan GPL-3.0 y los avisos de terceros.

Este informe documenta la validación previa a la publicación. El PR registra el commit enviado, tamaño estimado de objetos y estado real de GitHub Actions; una ejecución local no equivale a CI remoto aprobado. Antes del merge quedan la revisión humana del diff y las comprobaciones de CI sobre el SHA exacto. No se hace merge automático, release, publicación de paquetes ni despliegue Vercel. Los pendientes de producción y publicación figuran en [preparación](24_PREPARACION_PUBLICACION_3.md).
