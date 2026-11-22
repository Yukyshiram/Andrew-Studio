# Andrew's Bibliotecary 2.6

Una biblioteca digital con diseño editorial y dos recorridos claros: explorar la colección o probar su administración.

![Inicio de Andrew's Bibliotecary 2.6](docs/screenshots/v2.6/after/desktop-inicio.png)

## Ver el proyecto

Node.js 22.12+; se usa Node 24 en CI. La demo no necesita PHP, MySQL ni cuentas.

```sh
npm ci
npm run dev
```

Abre `http://127.0.0.1:4173`. El servidor de desarrollo refleja los cambios al guardar.

```sh
npm run build
npm run preview
```

El build genera exclusivamente `dist/`. Vercel debe utilizar la raíz del repositorio, instalación `npm ci`, build `npm run build` y salida `dist`. El fallback SPA de `vercel.json` permite recargar rutas profundas. Esta revisión no publica ni fusiona cambios.

## Recorridos

| Área | Rutas y comportamiento |
|---|---|
| Visitante | `/`, `/catalog`, `/catalog/:id`, `/about`. Buscar, filtrar, ordenar, paginar y consultar fichas |
| Acceso secundario | «Probar panel administrador», separado del menú público |
| Resumen de demostración | `/demo/admin`: métricas de la colección y acceso a la gestión |
| Gestión de demostración | `/demo/admin/books`: tabla de 8 fichas, búsqueda, categoría/estado, alta y edición validadas, archivo confirmado, restauración y reset confirmado |
| Ruta anterior | `/studio` redirige a `/demo/admin` |

El panel muestra **Modo demostración** y **Volver a la biblioteca**. Sus cambios viven únicamente en la memoria de la pestaña: recargar restablece la colección. Entrar al panel no autentica ni concede permisos reales. No existe login ficticio ni se guardan fichas en cookies o localStorage.

Las 24 obras, autorías y editoriales del JSON son ficticias. Sus descripciones son distintas y no se presentan como sinopsis auténticas. No hay archivos de lectura ni descargas. Se conserva la apertura CSS de las cubiertas; se retiraron Three.js, WebGL y los controles de escena 3D.

## Laravel se conserva

La aplicación completa permanece en `modern/`: autenticación, autorización, recuperación de cuentas, gestión de libros/personas, historial y migración reversible. Sus operaciones usan un servidor y MySQL; no se ejecutan en la demo ni se incluyen como PHP en `dist`. [Instalación y operación](modern/README.md).

La demo reutiliza inicio, portadas, libro animado, controles accesibles y estilos desde `modern/resources`. `PresentationNavigation` adapta los enlaces a React Router o Inertia. Los shells distinguen la navegación simulada del acceso real.

```text
demo/src/shell.tsx             Navegación de visitante y demostración
demo/src/main.tsx              Inicio, catálogo, fichas y acerca
demo/src/studio.tsx            Resumen y gestión de demostración
demo/src/admin-book-form.tsx   Formulario y validación local
demo/src/data/books.json       24 fichas ficticias diferenciadas
modern/                       Aplicación Laravel y presentación compartida
docs/                         Auditorías, decisiones, evidencia y capturas
```

## Calidad y pruebas

```sh
npm run typecheck
npm run build
npm run security:check
npm audit
npm run test:install
npm test
```

Playwright guarda sus navegadores dentro de `.local/browsers`. La suite usa el artefacto de producción en `127.0.0.1:4174`, separado del desarrollo en 4173. Verifica recorridos públicos/administrativos, formularios, confirmaciones, foco, móvil, reduced-motion, rutas profundas y Axe en los tres motores.

Con Laravel y Docker disponibles:

```powershell
./modern/scripts/test.ps1
```

[Auditoría y decisiones 2.6](docs/14_UX_2_6_CLARIDAD_Y_ROLES.md). [Resultados, límites y matriz de aceptación](docs/15_VALIDACION_UX_2_6.md). [Capturas antes](docs/screenshots/v2.6/before/) y [después](docs/screenshots/v2.6/after/).

## Historia y publicación

Trabajo 2.6 en `codex/ux-role-clarity-2.6`. La versión previa sigue en `feature/interactive-demo` y su release preparado en `release/bibliotecary-v2`. Recuperación 2.0: `codex/bibliotecary-2` (`6752641`). Legado: `archive/legacy-v1` y `v1-legacy-final` desde `372dbf3`. La revisión 2.6 no mueve esas referencias ni `main`.

Vercel y GitHub conservan su configuración previa; no se inicia sesión, crea un proyecto, publica un PR ni despliega en esta revisión. La URL pública se añadirá cuando exista un despliegue autorizado y verificado. [Preparación Vercel](docs/12_DEMO_ARQUITECTURA_Y_VERCEL.md).

## Licencia

[GPL-3.0-only](LICENSE). El build distribuye los avisos de 44 dependencias de ejecución en `/licenses/THIRD_PARTY_NOTICES.txt`. [Inventario](docs/evidence/demo-licenses.json).
