# Auditoría de seguridad — Andrew's Bibliotecary legado

Fecha: **2026-11-20**, zona de referencia America/Mexico_City. Objetivo: línea base previa a la modernización. Estado del informe: **evaluación focalizada, no certificación ASVS**.

## Alcance, método y límites

Se inspeccionaron los scripts PHP, formularios HTML, SQL, configuración local Docker y diferencias respecto a `HEAD` (`372dbf39743656ae1f06971b1c6f11c07a655a2c`). El árbol de trabajo incluye la restauración realizada antes de esta misión: no se confunde ese estado con el commit histórico. Las ubicaciones siguientes se refieren al legado restaurado, salvo indicación explícita de `HEAD`.

Las pruebas dinámicas de esta auditoría fueron exclusivamente **GET anónimos contra `http://localhost:8080`**. No se enviaron operaciones de alta o borrado, no se alteraron bases de datos y no se ejecutaron cargas de ataque persistentes. No se imprimieron ni conservaron contraseñas, identificadores de sesión, cuerpos de `phpinfo()` o configuración. Se guardaron únicamente estados HTTP y presencia/ausencia de marcadores en security-baseline.json (referencia histórica o evidencia local no publicada).

Los controles se contrastan con la versión estable [OWASP ASVS 5.0.0](https://github.com/OWASP/ASVS/tree/v5.0.0/5.0). Los identificadores se verificaron en el [CSV oficial versionado](https://raw.githubusercontent.com/OWASP/ASVS/v5.0.0/5.0/docs_en/OWASP_Application_Security_Verification_Standard_5.0.0_en.csv). Se usa el formato recomendado `v5.0.0-capítulo.sección.requisito`. La relación con un requisito indica pertinencia, no una evaluación completa de todos los controles ni un nivel ASVS alcanzado.

No se realizaron análisis de imágenes de contenedor, pruebas de carga, fuerza bruta, revisión de infraestructura externa, revisión de secretos históricos completos ni auditoría criptográfica. No se declara ausencia de CVE por falta de esos análisis. La publicación en Internet está fuera de alcance y no está autorizada.

### Criterio de gravedad

- **Alta:** permite cambios administrativos no autorizados, ejecución de JavaScript almacenado o exposición de información sensible del servidor si un atacante alcanza la aplicación.
- **Media:** debilita autenticación, aislamiento, integridad o capacidad de detección y puede combinarse con otros hallazgos.
- **Baja/informativa:** mejora de defensa o ausencia funcional que requiere una decisión de producto.

La configuración actual publica el servidor en **loopback** (`compose.yaml:7`) y no publica MySQL en el host. Esto reduce exposición remota; no corrige vulnerabilidades de la aplicación. No se asignaron puntuaciones CVSS sin modelar un despliegue concreto.

## Resumen de hallazgos

| ID | Gravedad | Estado en el legado restaurado | Control pertinente |
| --- | --- | --- | --- |
| SEC-01 | Alta | Sin autenticación/autorización en administración y mutaciones | v5.0.0-8.2.1, 8.2.2, 8.3.1 |
| SEC-02 | Alta | Campos del catálogo emitidos como HTML sin escape | v5.0.0-1.2.1 |
| SEC-03 | Alta | Sin CSRF; cierre de sesión por GET | v5.0.0-3.5.1, 3.5.3 |
| SEC-04 | Alta | `phpinfo()` público con variables de entorno | v5.0.0-13.4.2, 13.4.6 |
| SEC-05 | Alta | Git y archivos de configuración accesibles por HTTP | v5.0.0-13.4.7 |
| SEC-06 | Media | Cookie de sesión sin atributos defensivos explícitos | v5.0.0-3.3.1, 3.3.2, 3.3.4; 7.3 |
| SEC-07 | Media | Política de contraseña y limitación de intentos ausentes | v5.0.0-6.1.1, 6.2.1 |
| SEC-08 | Media | No existe recuperación de cuenta | v5.0.0-6.4.3 |
| SEC-09 | Media | Validación de entradas insuficiente | v5.0.0-2.2.1, 2.2.2 |
| SEC-10 | Media | Valores de acceso de desarrollo y fallback privilegiado | v5.0.0-13.2.2, 13.3.1 |
| SEC-11 | Media | Excepciones fuera de un manejador central | v5.0.0-16.5.1, 16.5.4 |
| SEC-12 | Media | Sin CSP, anti-embedding ni `nosniff` | v5.0.0-3.4.3, 3.4.4, 3.4.6 |
| SEC-13 | Media | Inventario/auditoría de dependencias no reproducible | v5.0.0-15.1.1, 15.1.2 |
| SEC-14 | Media | Sin registro de eventos de autenticación/autorización | v5.0.0-16.3.1, 16.3.2 |
| SEC-15 | Alta histórica | SQL interpolado corregido en la restauración | v5.0.0-1.2.4 |

La nueva aplicación deberá corregir los hallazgos activos. **El legado se conserva para recuperación y comparación; su conservación no equivale a remediación.** El cierre de cada hallazgo en 2.0 debe respaldarse con resultados ejecutados en la documentación final de pruebas.

## Evidencia, impacto y remediación

### SEC-01 — Administración sin barrera de identidad ni permisos

**Evidencia:** `new.php:1` comienza directamente con HTML. `Administrador/tabladmin.php:1–3`, `Administrador/buscador.php:1–3`, `importante/mostrartabladmin.php:1–3` solo incluyen la conexión. `importante/upload.php:4–11`, `Administrador/eliminar.php:4–9` y `Administrador/eliminartodo.php:4–18` procesan los parámetros de una petición sin verificar sesión ni rol. La sesión solo afecta la bienvenida en `index.php:5–16`; ocultar enlaces no protege los destinos. Los GET anónimos a menú, borrado y formulario de alta devuelven **200**, comprobados en la evidencia JSON.

**Impacto:** cualquier consumidor con acceso al servidor puede invocar operaciones de alta o eliminación y elegir el ID de un libro. Es una ausencia de autorización funcional y a nivel de objeto; los IDs secuenciales no constituyen el problema por sí mismos. El esquema `users` no contiene ningún rol ni vínculo de propiedad con los libros.

**Solución 2.0:** rutas autenticadas, autorización por políticas del servidor y matriz explícita de lector/bibliotecario/administrador. Autoregistro siempre de lector; ninguna entrada de formulario puede otorgar privilegios. Denegar operaciones desconocidas por defecto y resolver los permisos en cada petición, no solo en la interfaz.

**Verificación requerida:** invitado no puede crear/eliminar; lector obtiene 403 en mutaciones aunque conozca un ID; bibliotecario puede operar el catálogo permitido; solo administrador gestiona privilegios y operaciones masivas; manipular `role`, `user_id` o el ID de ruta no altera permisos.

### SEC-02 — XSS almacenado en el catálogo

**Evidencia:** salida directa de `Nombre_book`, `Autor_book`, `Editorial_book`, `Año_Salida_book` y `Des_book` en `importante/mostrartabla.php:44–48,75–79`, `importante/mostrartabladmin.php:39–43`, `Administrador/tabladmin.php:42–46` y `Administrador/buscador.php:42–46`. El alta admite texto sin restricciones de contenido (`importante/upload.php:7–11`). La protección del correo en `index.php:30` es una mejora de la restauración, pero no se aplica a los libros.

**Impacto:** un campo de libro con contenido HTML se interpreta en las páginas del catálogo. Combinado con SEC-01, no es necesario contar con una identidad administrativa para alcanzar la entrada vulnerable. No se insertó un payload para demostrarlo; el flujo de datos sin escape se verifica estáticamente.

**Solución 2.0:** renderizado textual de React y escape de Blade en los contextos respectivos; prohibir `dangerouslySetInnerHTML` para campos bibliográficos. No eliminar apóstrofes o acentos como sustituto de escape contextual. Los datos antiguos deben importarse como texto, sin ejecutarlos ni descartarlos silenciosamente.

**Verificación requerida:** sembrar datos ficticios con etiquetas, comillas y un marcador de evento; el contenido se visualiza literalmente, no se crea un elemento ejecutable y el marcador no cambia. Repetir sobre tarjeta, detalle, tabla y búsqueda.

### SEC-03 — Mutaciones sin CSRF y logout mediante GET

**Evidencia:** formularios `signup.php:46–49`, `login.php:48–51`, `importante/inupload.html:13–21` y `Administrador/tabladmin.php:15–17,53–54` no incluyen ni validan tokens. Los handlers citados en SEC-01 tampoco realizan verificaciones de origen. `logout.php:2–8` destruye sesión sin comprobar método; `index.php:38` lo enlaza como navegación GET. Las páginas de formularios inspeccionadas no contienen entradas de token CSRF.

**Impacto:** peticiones inducidas desde otros orígenes pueden alterar estado o cerrar sesión. Al no existir barrera de identidad para las operaciones administrativas, SEC-01 es todavía más directo; agregar autenticación sin agregar CSRF dejaría el riesgo vigente.

**Solución 2.0:** middleware CSRF/origen de Laravel para todas las rutas web mutantes; sesión y token de Inertia; logout POST con invalidación y regeneración del token. SameSite es defensa complementaria, no reemplazo universal de la comprobación del servidor.

**Verificación requerida:** petición HTTP real con sesión y sin token obtiene rechazo (419 o control equivalente documentado), token incorrecto también; petición legítima funciona; GET a logout y borrado no cambia estado. No basarse exclusivamente en tests del framework que deshabilitan middleware CSRF en entorno de pruebas.

### SEC-04 — Información de servidor y entorno expuesta

**Evidencia:** `info.php:1` ejecuta `phpinfo()`; `new.php:17` enlaza el endpoint. GET anónimo devuelve **200**, contiene el marcador de versión de PHP y el nombre `DB_PASSWORD` del entorno. Se registraron solo booleanos: no se guardaron valores.

**Impacto:** revela versiones, rutas, módulos y potencialmente valores del entorno. La existencia de contraseñas exclusivamente de desarrollo no hace seguro el patrón para una instalación con secretos reales.

**Solución 2.0:** no exponer `phpinfo()`. Sustituir la intención útil de diagnóstico por estado restringido a administrador que devuelva únicamente aplicación/versión de producto y disponibilidad, sin entorno ni secretos. `APP_DEBUG=false` para el servidor de presentación y errores genéricos.

**Verificación requerida:** `/info.php` no existe en el nuevo docroot; endpoints de salud no devuelven configuración y la vista de sistema rechaza invitados/lectores/bibliotecarios según matriz.

### SEC-05 — Raíz del repositorio usada como document root

**Evidencia:** `Dockerfile:5–6` coloca el proyecto completo en `/var/www/html`; `compose.yaml:15` monta ahí la raíz completa. `.dockerignore:1–3` no protege el montaje de ejecución. GET a `/.git/HEAD`, `/compose.yaml` y `/database/schema.sql` devuelve **200** con marcadores de referencia Git, configuración y esquema respectivamente. `/database/` devuelve **403**, por lo que no se afirma listado de directorio. `/.env` devuelve **404** en esta línea base, por lo que no se afirma filtración de un `.env` existente.

**Impacto:** permite recuperar material del repositorio y configuración local. Un futuro archivo sensible agregado a la raíz puede hacerse accesible por el mismo error de aislamiento.

**Solución 2.0:** servidor con document root exclusivamente `modern/public/`, bloqueo de archivos ocultos/configuración y sin resolución de scripts PHP fuera del front controller. Legado fuera de ese docroot y en servicio separado de loopback.

**Verificación requerida:** `/.git/HEAD`, `/.env`, `/composer.json`, `/compose.yaml`, `/database/schema.sql` y rutas relativas de traversal no exponen contenido; test de regresión comprueba respuestas 403/404 y ausencia de marcadores. Verificar tanto contenido servido como código de estado.

### SEC-06 — Gestión incompleta de cookies y vida de sesión

**Evidencia:** `index.php:2` y `login.php:3` usan `session_start()` sin política explícita. El `Set-Cookie` observado tiene **HttpOnly=false, SameSite ausente y Secure ausente**. `login.php:16` ya regenera el identificador después de autenticar: ese control sí existe en la restauración y no debe reportarse como fallo activo. `logout.php:4–6` limpia estado de sesión, pero no configura caducidad de cookie ni una vida máxima documentada.

**Impacto:** una sesión expuesta a script o peticiones de contexto cruzado es más fácil de abusar; las expiraciones no están especificadas según el riesgo de la aplicación.

**Solución 2.0:** sesión del servidor con HttpOnly, SameSite=Lax, duración explícita y rotación al login; invalidar sesión y token al salir. En HTTPS desplegado, Secure y nombre/prefijo de cookie apropiados. La falta de Secure en HTTP loopback es una **excepción de desarrollo documentada**, no una promesa de conformidad para producción.

**Verificación requerida:** comprobar atributos de la cookie por HTTP real; el ID cambia al login; la sesión anterior deja de ser utilizable tras logout; expiración y acceso de cuenta deshabilitada producen el resultado documentado.

### SEC-07 — Contraseñas y resistencia a automatización

**Evidencia:** `signup.php:6` exige únicamente valores no vacíos; `signup.php:10` usa `password_hash(..., PASSWORD_BCRYPT)`, y `login.php:15` usa `password_verify`: **no hay almacenamiento en texto plano** en el código. `login.php:7–22` no limita intentos ni registra fallos. No se hizo fuerza bruta para comprobarlo.

**Impacto:** contraseñas triviales o intentos automatizados sin límite favorecen compromiso de cuentas. El bcrypt existente debe conservar compatibilidad en migración, sin rehash de un hash como si fuera contraseña.

**Solución 2.0:** validación de longitud y máximo documentados, soporte de frases, rate limiting con claves de usuario/IP, mensajes de login genéricos y rehash oportunista tras login cuando corresponda. Mantener una política local de contraseñas comunes; no exigir consulta a un servicio externo sin autorización.

**Verificación requerida:** contraseña corta rechazada; válida larga aceptada; hashes compatibles del legado permiten login; un conjunto acotado de intentos ficticios alcanza 429/bloqueo temporal; usuarios inexistentes no reciben un mensaje distinto en login.

### SEC-08 — Recuperación de cuenta inexistente

**Evidencia:** no hay rutas, tokens, tablas de recuperación ni correo en el inventario. `login.php:45–52` contiene únicamente el formulario de acceso. Es una ausencia funcional, no una recuperación insegura ya implementada.

**Impacto:** pérdida de acceso sin proceso seguro; los restablecimientos manuales futuros podrían introducir bypass si se improvisan.

**Solución 2.0:** broker del framework con token aleatorio, expiración y consumo de un solo uso, notificación local de correo para demostración, respuesta no enumeradora y limitación de solicitudes. No imprimir tokens en logs públicos ni simular un envío externo no configurado.

**Verificación requerida:** solicitud válida produce correo en el transporte local; respuesta pública no distingue cuenta inexistente; token expirado/inválido/reutilizado es rechazado; restablecimiento no permite elevar rol y la contraseña anterior deja de autenticar.

### SEC-09 — Validación de datos y tipos insuficiente

**Evidencia:** altas de libro leen `$_POST` directamente en `importante/upload.php:7–11`; borrado toma `ide` sin validar tipo/positividad en `Administrador/eliminar.php:6`; registro no valida formato de correo en `signup.php:6–11`. El HTML no impone longitudes ni obligatoriedad de forma consistente (`importante/inupload.html:16–20`). `Año_Salida_book` es texto en el esquema: no debe forzarse a entero durante migración porque puede contener `X` u otra semántica heredada.

**Impacto:** entradas incompletas, tipos inesperados y longitudes excesivas pueden romper flujos o degradar integridad. La parametrización SQL impide inyección por comillas, pero no establece reglas de negocio.

**Solución 2.0:** Form Requests con reglas explícitas, errores por campo y límites; ID de ruta resuelto por ORM; permitir el año legado como texto acotado y conservarlo literalmente. Rechazar campos de privilegio. No hay `input type=file`, uso de `$_FILES` ni `move_uploaded_file`: **no existe carga real de archivos** a pesar del nombre `upload.php` y de `multipart/form-data`. Mantener ese alcance o especificar y probar un nuevo subsistema si se añade después.

**Verificación requerida:** campos vacíos, arrays donde se espera string, correos inválidos y longitudes fuera de límite no alteran datos; apóstrofes, acentos y años heredados válidos se conservan; los endpoints no aceptan rutas arbitrarias ni archivos como una funcionalidad no declarada.

### SEC-10 — Valores de acceso de desarrollo y mínimo privilegio

**Evidencia:** `database.php:2–6` usa variables de entorno con fallback al usuario root y contraseña vacía. `compose.yaml:13,26–27` incluye valores predeterminados locales; no se reproducen en este informe. El servicio moderno deberá usar su propia configuración. La restauración ya usa un usuario MySQL de aplicación en Compose (`compose.yaml:12,25`) y mantiene MySQL sin puerto publicado: son controles positivos.

**Impacto:** copiar esta configuración a otra instalación puede reproducir accesos conocidos o privilegiados. La raíz completa públicamente servida amplifica SEC-05.

**Solución 2.0:** generar secretos de desarrollo por proyecto, excluir `.env` del control de versiones y del docroot; usuario de aplicación dedicado y base independiente; distinguir credenciales de migración cuando se despliegue. No tocar la base del legado durante instalación o pruebas de 2.0.

**Verificación requerida:** secretos ausentes de Git/build público; servidor no arranca con configuración de producción inválida; las pruebas usan base independiente y el usuario de aplicación no recibe privilegios globales.

### SEC-11 — Manejo de excepciones no centralizado

**Evidencia:** `database.php:14–17` ya captura fallos de conexión y devuelve un 503 genérico. Sin embargo, `signup.php:16–18` relanza errores no previstos; los handlers SQL de alta/borrado y las consultas de listado no tienen un manejador de aplicación común. `info.php` expone además la configuración del runtime. No se provocaron fallos destructivos ni se declara una traza observada nueva en esta auditoría.

**Impacto:** según la configuración PHP, una excepción puede revelar rutas/consultas o producir una página incompleta sin respuesta recuperable para la persona usuaria.

**Solución 2.0:** renderizado central de errores, debug desactivado para presentación, validaciones antes de persistir, transacciones en importación/borrado masivo y logs privados sin contraseñas ni tokens.

**Verificación requerida:** error forzado en entorno de test devuelve mensaje genérico/estado apropiado, nunca SQL, rutas internas o secretos; operación transaccional falla sin dejar modificaciones parciales.

### SEC-12 — Cabeceras defensivas ausentes

**Evidencia:** las respuestas inspeccionadas no contienen CSP, `X-Content-Type-Options` ni cabecera de anti-embedding. ASVS 5.0 usa `frame-ancestors` de CSP como referencia principal; no se considera `X-Frame-Options` un sustituto suficiente del requisito. El legado carga Google Fonts desde un tercero (`index.php:24`, `login.php:31`), dependencia que debe considerarse al configurar CSP/privacidad.

**Impacto:** aumenta la superficie para clickjacking, ejecución de recursos inesperados y confusión de tipos. Estas cabeceras son defensa adicional; no sustituyen SEC-01/02/03.

**Solución 2.0:** CSP compatible con Inertia/Vite y recursos locales, `object-src 'none'`, `base-uri` restrictivo, `frame-ancestors 'none'`, `nosniff` y política de referrer. HSTS/Secure se aplicarán en HTTPS, no se prometerán sobre HTTP local.

**Verificación requerida:** cabeceras verificadas por integración HTTP; E2E sin violaciones CSP que rompan recursos legítimos; cualquier excepción a inline style o script se documenta, limita y prueba.

### SEC-13 — Dependencias e imágenes sin evaluación de vulnerabilidades reproducible

**Evidencia:** no hay Composer/npm ni lockfiles en el legado; es PHP directo. `Dockerfile:1` y `compose.yaml:22` referencian imágenes oficiales por versión menor, con patch mutable. No hay informe SBOM, análisis de imagen ni política de actualización en el repositorio anterior a esta misión.

**Impacto:** no se puede reconstruir un inventario exacto del despliegue futuro ni afirmar que sus dependencias están libres de vulnerabilidades. Una etiqueta oficial y un runtime compatible no equivalen a auditoría.

**Solución 2.0:** lockfiles de Composer/npm, inventario/licencias, `composer audit`, `npm audit` y registro de versiones efectivas. Incorporar escaneo de imagen en un pipeline autorizado; no instalar herramientas globales sin necesidad.

**Verificación requerida:** ejecutar auditores y análisis estático; conservar fecha, comandos, códigos de salida, dependencias afectadas y remediación o excepción. Si un escáner no está disponible, anotarlo como pendiente y no informar “cero vulnerabilidades”.

### SEC-14 — Trazabilidad de eventos insuficiente

**Evidencia:** el único log explícito inspeccionado es `error_log()` de conexión (`database.php:15`); login/registro y administración no generan eventos estructurados. El esquema solo contiene cuentas y libros; no tiene tabla de auditoría.

**Impacto:** no hay atribución fiable de acciones ni señal de intentos no autorizados. El borrado total carece de registro de operador, conteo o mecanismo de recuperación de aplicación.

**Solución 2.0:** eventos de autenticación y cambios administrativos con actor, acción, recurso, fecha y metadatos mínimos; ningún hash de contraseña, token o cuerpo sensible en logs. Borrado lógico/archivo y recuperación explícita para libros, incluidas operaciones masivas.

**Verificación requerida:** operaciones permitidas y denegadas producen la evidencia documentada; filtros de logs no contienen credenciales; archivo/recuperación no pierde los campos bibliográficos.

### SEC-15 — Inyección SQL histórica mitigada en restauración

**Evidencia histórica:** en `git show HEAD:importante/upload.php:27` los campos se concatenan en INSERT; `git show HEAD:Administrador/eliminar.php:8` interpola `ide` en DELETE; búsquedas de `HEAD` en `Administrador/buscador.php:36` y `importante/mostrartabla.php:38` interpolan `busqueda`. Esa implementación permitía alterar el SQL y fallaba con apóstrofes legítimos.

**Estado actual:** `importante/upload.php:27–28`, `Administrador/eliminar.php:8–9`, `Administrador/buscador.php:36–37` e `importante/mostrartabla.php:38–39` ya usan consultas preparadas. `database.php:12` desactiva emulación. Login/registro también parametrizan. No se identificó SQL controlado por usuario interpolado en estas rutas restauradas; no se ejecutaron ataques de inyección contra el commit histórico.

**Solución 2.0:** conservar la garantía con Eloquent/query builder y valores parametrizados; columnas de ordenación seleccionadas de una allowlist, nunca desde texto de usuario sin validar.

**Verificación requerida:** entradas ficticias con apóstrofes y cadenas parecidas a SQL se tratan como datos; búsqueda/ordenación no amplían resultados ni ejecutan sentencias adicionales; el importador no interpola contenido de filas.

## Política de autorización acordada para 2.0

Esta matriz es una **decisión nueva**, no una funcionalidad histórica. Las cuentas importadas reciben privilegio mínimo, sin inferir que un usuario era administrador por haber accedido a `new.php`.

| Operación | Invitado | Lector | Bibliotecario | Administrador |
| --- | --- | --- | --- | --- |
| Portada, login, solicitar recuperación | Sí | Sí | Sí | Sí |
| Autoregistro | Solo como lector | — | — | — |
| Consultar/buscar catálogo público | Sí | Sí | Sí | Sí |
| Ver detalle y filtros/paginación | Sí | Sí | Sí | Sí |
| Alta/edición bibliográfica | No | No | Sí | Sí |
| Archivar y recuperar un libro | No | No | Sí | Sí |
| Archivo masivo reversible | No | No | No | Sí, con confirmación explícita |
| Crear cuentas desde administración/gestionar roles | No | No | No | Sí |
| Diagnóstico sanitizado del sistema/auditoría | No | No | No | Sí |
| Cambiar perfil/contraseña propios | No | Sí | Sí | Sí |

No existe multitenencia ni propiedad individual de libros en el legado. El dominio es un catálogo compartido: un lector no puede modificar ningún libro; un bibliotecario autorizado trabaja sobre el catálogo común. No se inventan controles de préstamos, multas, lectores prestatarios o devolución.

## Matriz de aceptación y regresión de 2.0

Los casos siguientes son requisitos a ejecutar, **no resultados ya aprobados**. El responsable de integración deberá enlazar los resultados reales desde la documentación de pruebas.

| Caso | Preparación/acción local ficticia | Resultado de aceptación | Hallazgos |
| --- | --- | --- | --- |
| AUTH-01 | Registro con `role=admin` o atributos extras | Cuenta solo lector; atributos sensibles ignorados/rechazados | 01,09 |
| AUTH-02 | Credencial válida/incorrecta/inexistente | Login correcto; errores públicos consistentes; sesión rotada | 06,07 |
| AUTH-03 | Intentos limitados repetidos en base de prueba | Limitador se activa sin bloquear otras cuentas de forma global | 07 |
| AUTH-04 | Solicitud/reset válido, expirado y reutilizado | Envío solo al transporte configurado; tokens de un uso; sin enumeración | 08 |
| AUTHZ-01 | Invitado/lector llama directamente rutas de escritura | Redirección/401 y 403 según contrato; base sin cambios | 01 |
| AUTHZ-02 | Bibliotecario intenta gestión de roles/archivo masivo | 403 del servidor; ocultación visual no es la prueba principal | 01 |
| AUTHZ-03 | Cambiar ID de recurso/fields de privilegio | No se elude política; 404 para ID inexistente | 01,09 |
| CSRF-01 | Petición HTTP real sin token o token inválido | Rechazo antes de persistir | 03 |
| CSRF-02 | GET a logout/archivo y POST legítimo | GET no cambia estado; POST autorizado sí | 03,06 |
| XSS-01 | Libro ficticio con HTML y marcador de evento | Renderizado como texto; marcador nunca ejecutado | 02 |
| SQL-01 | Apóstrofes, acentos y texto parecido a SQL en búsqueda/alta | Valores preservados; sin semántica SQL adicional | 09,15 |
| VAL-01 | Ausentes, arrays, demasiado largos, ID inválido | Errores por campo/404 sin escritura parcial ni traza pública | 09,11 |
| SESSION-01 | Login/logout y uso del ID anterior | Rotación e invalidación comprobables; cookie HttpOnly/SameSite | 06 |
| EXPOSE-01 | GET a phpinfo, Git, `.env`, SQL y configuración | Contenido protegido; nunca se devuelve el marcador sensible | 04,05 |
| HEADER-01 | GET a pantallas principales y error | CSP/anti-embedding/nosniff coherentes; aplicación usable | 12 |
| DATA-01 | Archivo/recuperación individual y masiva | Operación autorizada, reversible y trazada | 01,14 |
| MIG-01 | Importar fixture legado con bcrypt/año textual/HTML | Semántica conservada; hashes no rehasheados; rol mínimo; XSS no ejecutado | 02,07,09,15 |
| MIG-02 | Fixture inválido o conflicto | Fallo atómico con reporte; origen intacto; rollback solo de lote permitido | 09,11 |
| AUDIT-01 | Login, fallo, cambio de libro, acceso denegado | Eventos útiles sin passwords/tokens ni datos sensibles completos | 14 |
| DEP-01 | Auditores Composer/npm y análisis estático | Resultado real guardado; fallos/limitaciones explícitos | 13 |

## Riesgos pendientes y condiciones de presentación

El legado continuará con estos riesgos mientras se preserve intacto. Mantenerlo solo en loopback y fuera del document root de 2.0. No publicar su servicio como alternativa de producción.

**Actualización posterior a la línea base:** durante la modernización se añadió aislamiento operativo al servicio legado para ocultar el directorio moderno y material local sensible sin modificar sus scripts originales. La línea base anterior se conserva como evidencia temporal; el estado y alcance de esa mitigación se documentan en [07_SEGURIDAD_IMPLEMENTADA.md](07_SEGURIDAD_IMPLEMENTADA.md). No se debe interpretar la exposición HTTP observada antes de ese cambio como una prueba de que sigue presente después.

Para una presentación profesional local, la aplicación nueva debe superar los casos aplicables anteriores, usar datos ficticios y dejar claras sus credenciales de demostración. Para un despliegue futuro se requieren además HTTPS, política de correo real y recuperación de cuentas, secretos gestionados, backups y restauración ensayados, análisis de imágenes, controles operativos de logging y revisión completa de los requisitos ASVS seleccionados. Esos controles de infraestructura no se dan por ejecutados en esta auditoría local.
