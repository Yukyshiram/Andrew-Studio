# Sistema de diseño — establecido antes de las vistas

## Identidad: una biblioteca de ideas

Nombre: Andrew's Bibliotecary. Un espacio editorial oscuro, cálido en sus
acentos ámbar y preciso en su organización. Portadas tipográficas originales,
líneas finas y composición asimétrica con suficiente espacio en blanco. El
producto muestra fichas reales, no valoraciones, préstamos o disponibilidad
inventada. Todo el texto funcional se ofrece en español.

## Tokens

| Grupo | Valores base |
| --- | --- |
| Fondo oscuro | `#101110`; superficie `#181a18`; elevada `#20231f` |
| Texto oscuro | principal `#f3f2eb`; secundario `#b4baae` |
| Marca | ámbar `#e8bd72`; texto sobre marca `#19160f` |
| Borde | `#343a32`; foco `#f4cf8f` |
| Estados | éxito `#8fcea4`; error `#ffa8a1`; información `#a8c7ed` |
| Fondo claro | `#f6f7f3`; superficie `#ffffff`; texto `#20251e` |
| Tipografía | Inter local (UI), Georgia (titulares editoriales) |
| Tamaños | texto 16 px; etiquetas 14 px; metadata ≥12 px; titulares fluidos |
| Espaciado | 4, 8, 12, 16, 24, 32, 48, 64, 96 px |
| Radios | controles 10 px; tarjetas 16 px; paneles 24 px |
| Movimiento | 140–220 ms para hover/foco; transform/opacity |

El contraste efectivo se verifica con axe y revisión de estados. No se interpreta
la presencia de tokens como prueba de cumplimiento WCAG. Las transparencias se
restringen a la barra de navegación; el cuerpo no aplica blur de pantalla completa.

## Componentes primero

Button (principal/secundario/ghost/destructivo), Input, Label, Textarea, Select,
Dialog accesible, Badge, Card, Skeleton, EmptyState, FieldError, FlashNotice,
BookCover, BookCard y AppShell. Los formularios tienen etiquetas persistentes,
errores asociados por `aria-describedby`, estados de envío y foco visible. Los
diálogos conservan foco y permiten Escape. Los avisos usan regiones aria-live.

El layout tendrá barra lateral en escritorio y navegación compacta móvil sin
ocultar las acciones principales. Los listados permiten vista de tarjetas y tabla,
filtros y paginación; el estado de búsqueda se conserva en la URL. Las portadas
no dependen de imágenes externas. Las pantallas sin datos explican la siguiente
acción legítima. Carga: skeletons breves, progreso Inertia y botones bloqueados
durante envíos, sin esperas artificiales.

## Accesibilidad y rendimiento

Landmarks, enlace “Saltar al contenido”, encabezados ordenados, labels visibles,
targets de al menos 24×24 px (preferidos 44 px), foco de alto contraste y estados
sin depender solo de color. Pruebas a 390, 768 y 1440 px, teclado y zoom.

La escena de libros 3D es una mejora opcional de la portada: carga dinámica solo
al solicitarla, limita densidad de píxeles, dibuja bajo demanda y libera recursos
al desmontarse. Con movimiento reducido o WebGL no disponible se presenta la
composición CSS. No hay canvas 3D en administración. Se evita anunciar 60 FPS o
WCAG AA completos sin medición y revisión manual integral.
