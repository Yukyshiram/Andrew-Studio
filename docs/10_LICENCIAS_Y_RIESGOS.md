# Licencias, dependencias y riesgos pendientes

Inventario revisado el 20 de noviembre de 2026. Describe el árbol y lockfiles de esta entrega local; no constituye asesoramiento jurídico ni certificación de seguridad, accesibilidad o preparación para producción.

## Licencia de la aplicación

El [LICENSE original](../LICENSE) permanece en la raíz. [modern/LICENSE](../modern/LICENSE) conserva una copia exacta de su texto GNU GPL versión 3. Los manifiestos [Composer](../modern/composer.json) y [npm](../modern/package.json) declaran `GPL-3.0-only` para la aplicación. La licencia del framework o de un componente no reemplaza la del proyecto.

Antes de distribuir una versión, deben conservarse los avisos y textos aplicables, ofrecer el código fuente correspondiente en los términos de GPLv3 y revisar las obligaciones de cada dependencia y recurso realmente distribuidos. El inventario ayuda a esa revisión; no es una determinación legal definitiva. No se añadió licencia comercial ni excepción propia.

## Inventario de terceros

Fuentes locales: [composer-licenses.json](evidence/composer-licenses.json) y [npm-licenses.json](evidence/npm-licenses.json). El inventario npm regenerado incluye 140 registros y ninguna licencia desconocida, ya con Prettier. Incluye herramientas de desarrollo, variantes opcionales por plataforma y versiones repetidas. La clasificación procede de metadatos declarados: no sustituye leer los textos de licencia ni inspeccionar el contenido de cada paquete.

Los textos de licencia y avisos de las dependencias frontend de ejecución,
incluida la fuente Inter, se conservan sin cambios en
[THIRD_PARTY_NOTICES.txt](../modern/public/licenses/THIRD_PARTY_NOTICES.txt).
Una copia de GPL también está disponible en `public/licenses/`. El comando
`npm run audit:licenses` regenera ambos artefactos desde los paquetes instalados
y señala si no localiza un texto aplicable. Las licencias de Composer permanecen
además dentro de los paquetes instalados en su volumen.

Se detectó que `react-remove-scroll-bar` 2.3.8 declara MIT, pero omite el archivo
de licencia en el paquete npm y en su commit de publicación. Se conserva un
aviso MIT suplementario del repositorio oficial, fijado a un commit, con
[procedencia y SHA-256](../modern/legal/react-remove-scroll-bar-provenance.json).
No se presenta ese texto como un archivo que estuviera incluido por npm. Esta
distinción debe conservarse al revisar la distribución de terceros.

| Familia | Presencia observada | Tratamiento orientativo al distribuir |
| --- | --- | --- |
| MIT, ISC, BSD, 0BSD | Laravel, React, Inertia, Radix, Tailwind, Three.js y otras dependencias; el inventario determina cada caso | Licencias permisivas de uso habitual junto a GPLv3; mantener avisos y condiciones que exija cada texto |
| Apache-2.0 | Paquetes JS/herramientas y `phpoption/phpoption` | Revisar licencia, avisos y archivos NOTICE cuando existan; su combinación con GPLv3 suele ser viable según el contexto |
| OFL-1.1 | `@fontsource/inter`, fuente Inter local | Conservar texto y avisos de la fuente; revisar nombres reservados si se modifica y no relicenciar el archivo de fuente como código de la aplicación |
| MPL-2.0 | `@axe-core/playwright`, `axe-core` y `lightningcss` con variantes de plataforma; herramientas de desarrollo | Revisar obligaciones a nivel de archivo si se distribuyen o modifican archivos cubiertos; no implica por sí sola relicenciar toda la aplicación |
| BlueOak-1.0.0 | `graceful-fs`, desarrollo | Conservar el texto aplicable y revisar el recurso realmente entregado |
| Alternativas BSD-3-Clause / GPL-2.0-only / GPL-3.0-only | `nette/schema`, `nette/utils` | Documentar la opción aplicable al distribuir, sin interpretar el registro como tres obligaciones acumulativas |

La mayor parte de las entradas MPL del inventario npm corresponden a herramientas de desarrollo o sus binarios por plataforma. La marca `development` no prueba qué termina en un bundle: la revisión de distribución debe considerar los artefactos generados. Prettier 3.10.1 figura como dependencia de desarrollo con licencia MIT en el inventario regenerado.

En Composer se observan 85 MIT, 29 BSD-3-Clause, 1 Apache-2.0 y 2 registros con alternativas BSD/GPL. Los lockfiles fijan las versiones resueltas; los rangos de `package.json` o `composer.json` no son una lista exacta de versiones instaladas. Una actualización exige regenerar los inventarios y revisar cambios.

Las fichas de demostración, sus autorías y editoriales son ficticias. Las cubiertas modernas se generan con composición tipográfica y CSS, sin portadas descargadas. Los recursos gráficos y notas antiguos permanecen como legado: su conservación no acredita autorización adicional sobre eventuales contenidos de terceros. No se incorporaron claves de proveedores ni datos reales de usuarios a la demostración.

## Auditorías técnicas disponibles

| Instrumento / evidencia | Resultado registrado | Lo que no demuestra |
| --- | --- | --- |
| [npm-audit-initial.json](evidence/npm-audit-initial.json) | 0 vulnerabilidades informadas; 139 dependencias en su metadato | Ausencia de vulnerabilidades desconocidas o futuras; examen manual completo del código |
| [npm-audit-final.json](evidence/npm-audit-final.json) | 0 vulnerabilidades informadas; 140 dependencias en su metadato final | Escaneo de imágenes Docker o garantía de seguridad futura |
| [composer-audit.json](evidence/composer-audit.json) | Sin advisories ni paquetes abandonados informados | Escaneo del sistema operativo, PHP, MySQL o imágenes Docker |
| [Inventarios npm](evidence/npm-licenses.json) y [Composer](evidence/composer-licenses.json) | Licencias declaradas y versiones de paquetes | Auditoría legal exhaustiva, provenance o SBOM completo de imágenes |
| [security-phpunit.json](evidence/security-phpunit.json) | 48 casos backend distintos comprobados en ejecuciones documentadas | CSRF por HTTP real, escape en cada vista o entrega SMTP real |
| [phpunit-final.xml](evidence/phpunit-final.xml) | Suite completa: 96 pruebas, 639 aserciones; sin fallos, errores u omisiones | Comportamiento completo del navegador o concurrencia de MySQL |
| [accessibility-final.json](evidence/accessibility-final.json) | 5 pruebas axe aprobadas en 14,1 s, con vistas públicas, gestión, perfil y estados claros/oscuros | Revisión manual completa o conformidad WCAG integral |
| [playwright-final.json](evidence/playwright-final.json) | Suite de navegador completa: 16 aprobados, sin fallos, omisiones ni inestables | Todas las combinaciones de dispositivos, despliegue externo o ensayo concurrente MySQL |
| [browser-performance.json](evidence/browser-performance.json) | Medición local de carga, estabilidad y rAF; Three.js bajo demanda y WebGL activado al solicitarlo | Percentiles de campo, FPS de GPU o rendimiento universal |
| [backend-review.json](evidence/backend-review.json) | Corrección de Host/URLs canónicas comprobada; 3 pruebas, 5 aserciones aprobadas | Suite completa del proyecto o revisión E2E final |
| [security-operational-hardening.json](evidence/security-operational-hardening.json) | Portada antigua accesible; archivos concretos ocultos devuelven 404 | Corrección de los fallos restantes del PHP legado |
| [legacy-host-isolation.json](evidence/legacy-host-isolation.json) | Tres archivos privados devuelven 404 con el legado aislado por host | Corrección de la lógica vulnerable del PHP antiguo |
| [legacy-integrity-final.json](evidence/legacy-integrity-final.json) | 34 archivos originales con hashes conservados, sin cambios | Restauración ensayada de bases de datos o verificación de derechos sobre cada recurso heredado |

No se ejecutó un escaneo de CVEs de las imágenes Docker ni se fijaron por digest. `php:8.4-apache`, `mysql:8.4` y la etiqueta de Mailpit pueden resolverse a imágenes distintas en el futuro. Las auditorías de Composer/npm no sustituyen su revisión. Para repetir las auditorías de aplicación desde `modern/`, usa `docker compose exec -T app composer audit` y `npm audit`; `npm run audit:licenses` genera el inventario según el script del proyecto.

El [informe final de pruebas, rendimiento y accesibilidad](08_PRUEBAS_RENDIMIENTO_Y_ACCESIBILIDAD.md) reúne las duraciones y cifras de la última ejecución, su entorno y sus límites. La reejecución del instalador con `-Demo` aprobó en el runtime existente; no acredita una instalación limpia en otro equipo.

## Registro de riesgos y limitaciones

| Riesgo / límite | Estado y efecto | Siguiente control necesario |
| --- | --- | --- |
| Seguridad del legado | Conserva phpinfo público y debilidades de autorización/CSRF/XSS; host separado `127.0.0.1:8080`, redirección 302 y máscaras verificados | Mantenerlo en loopback y conservar override/aislamiento de host; retirar su exposición antes de cualquier publicación |
| Transporte y cookies | HTTP local, `SESSION_SECURE_COOKIE=false`; sin despliegue HTTPS validado | TLS, cookie Secure y proxy confiable en el entorno de publicación |
| Correo externo | Solo SMTP Mailpit local | Configurar proveedor, remitente y secretos de forma privada; ensayar entrega y recuperación completa en destino |
| Cuentas | Sin MFA ni verificación de correo implementados; sin restauración de cuentas en interfaz | Evaluar estos flujos según las necesidades reales antes de operación externa |
| Copias y recuperación | Volúmenes persistentes y procedimiento de dump; sin automatización ni restauración de producción demostrada | Definir retención, cifrado, copia externa, responsable y ensayo de restauración con evidencia |
| Observabilidad | Historial y logs locales; sin alertas o monitorización de producción | Definir retención, revisión de fallos, métricas, alertas y protección de datos de logs |
| Concurrencia | Regresiones aisladas SQLite; MySQL es la base principal | Ensayar operaciones administrativas concurrentes en MySQL de pruebas, en particular conservar un administrador activo |
| Rendimiento y búsqueda | Medición de laboratorio documentada; `LIKE` parametrizado y paginación, sin full text ni prueba de 50.000 registros | Ensayar volúmenes y dispositivos representativos antes de afirmar escalabilidad o cadencia universal |
| Accesibilidad | Cinco pruebas axe finales aprobadas; sin revisión manual integral acreditada | Revisar teclado, zoom, lector de pantalla, contraste y recorridos, sin equiparar axe a certificación |
| Reproducibilidad y QA | PHPUnit, análisis/build y suite de navegador aprobados; 13 capturas revisadas y medición local registrada | Ensayar instalación limpia y recuperación en un entorno nuevo; conservar resultados y repetir controles tras cambios |
| Dependencias e imágenes | Auditorías de aplicación puntuales sin hallazgos; sin escaneo Docker | Repetir auditorías y revisar imágenes, etiquetas/digests y parches durante mantenimiento |
| Migración | Lotes con validación y reversión conservadora; sin exportar una base real durante el trabajo | Acordar ventana de escritura, cuenta de lectura, respaldos y promoción de roles; revisar dry-run antes de aplicar |
| Alcance de datos y archivos | Catálogo de metadatos; sin OCR, uploads, ISBN o circulación | Tratar ampliaciones como nuevo alcance con modelo y amenazas propios |

La revisión ASVS es focalizada. No se declara cumplimiento completo de OWASP ASVS, certificación WCAG ni preparación automática para producción. El trabajo se entrega para revisión y uso local; no se ha autorizado ni realizado una publicación externa.
