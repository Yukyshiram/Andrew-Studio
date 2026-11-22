import React, { useEffect, useState, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import {
  createBrowserRouter,
  RouterProvider,
  useLocation,
  useParams,
  useSearchParams,
  useNavigate,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import {
  LazyMotion,
  domAnimation,
  MotionConfig,
  m as motion,
  useReducedMotion,
} from "motion/react";
import { ArrowLeft, Search, SlidersHorizontal, X } from "lucide-react";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/inter/latin-700.css";
import "../../modern/resources/css/app.css";
import "../../modern/resources/css/motion.css";
import "./style.css";
import HomeContent from "../../modern/resources/js/components/home-content";
import { PresentationNavigation } from "../../modern/resources/js/components/presentation-navigation";
import { InteractiveBook } from "../../modern/resources/js/components/interactive-book";
import {
  Button,
  Input,
  Select,
  Badge,
  EmptyState,
  Skeleton,
} from "../../modern/resources/js/components/ui";
import type { Book } from "../../modern/resources/js/types";
import { Collection, useCollection, initialBooks } from "./collection";
import { Heading } from "./heading";
import { DemoLink, NavigationRestoration } from "./navigation";
import { DemoBookCard, BookGrid } from "./books";
import { Shell } from "./shell";
import { DemoLibraryProvider, DemoFeedback } from "./library-context";
import { BorrowBook } from "./library-ui";

const Studio = lazy(() => import("./studio"));
const Reader = lazy(() => import("./reader"));
const Circulation = lazy(() => import("./circulation"));
const Finance = lazy(() => import("./finance"));
const News = lazy(() => import("./news"));
function Home() {
  const { books } = useCollection();
  const active = books.filter((b) => !b.deleted_at);
  const categories = [...new Set(active.map((b) => b.category))].map(
    (name) => ({
      name,
      count: active.filter((b) => b.category === name).length,
    }),
  );
  return (
    <>
      <h1 className="sr-only" tabIndex={-1}>
        Una biblioteca de ideas
      </h1>
      <HomeContent
        BookCard={DemoBookCard}
        featured={active.slice(0, 4)}
        stats={{
          books: active.length,
          authors: new Set(active.map((b) => b.author)).size,
          publishers: new Set(active.map((b) => b.publisher)).size,
          categories: categories.length,
        }}
        categories={categories}
      />
    </>
  );
}
const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es");
function Catalog() {
  const { books } = useCollection();
  const [params, setParams] = useSearchParams();
  const [pending, startTransition] = React.useTransition();
  const q = params.get("q") ?? "";
  const category = params.get("category") ?? "";
  const sort = params.get("sort") ?? "curated";
  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    startTransition(() =>
      setParams(next, { replace: true, preventScrollReset: true }),
    );
  }
  const active = books.filter((b) => !b.deleted_at);
  const categories = [...new Set(active.map((b) => b.category))];
  const matches = active
    .filter(
      (b) =>
        (!q ||
          normalize(`${b.title} ${b.author} ${b.publisher}`).includes(
            normalize(q),
          )) &&
        (!category || b.category === category),
    )
    .sort((a, b) =>
      sort === "title"
        ? a.title.localeCompare(b.title, "es")
        : sort === "year"
          ? (Number(b.publication_year) || 0) -
            (Number(a.publication_year) || 0)
          : a.id - b.id,
    );
  const lastPage = Math.max(1, Math.ceil(matches.length / 8));
  const requested = Number(params.get("page"));
  const page = Math.min(
    lastPage,
    Number.isInteger(requested) && requested > 0 ? requested : 1,
  );
  return (
    <>
      <Heading eyebrow="EXPLORAR LA BIBLIOTECA" title="Catálogo de libros">
        Busca por título, autor o editorial, o elige un tema.
      </Heading>
      <div className="demo-filter-panel">
        <div className="demo-search">
          <Search size={20} aria-hidden="true" />
          <label htmlFor="catalog-search" className="sr-only">
            Buscar por título, autor o editorial
          </label>
          <Input
            id="catalog-search"
            type="search"
            value={q}
            onChange={(e) => update("q", e.target.value)}
            placeholder="Un título, una voz, una idea…"
            autoComplete="off"
            maxLength={200}
          />
        </div>
        <div className="demo-sort">
          <SlidersHorizontal size={17} aria-hidden="true" />
          <label className="sr-only" htmlFor="sort">
            Ordenar libros
          </label>
          <Select
            id="sort"
            value={sort}
            onChange={(e) => update("sort", e.target.value)}
          >
            <option value="curated">Selección editorial</option>
            <option value="title">Título: A–Z</option>
            <option value="year">Más recientes</option>
          </Select>
        </div>
      </div>
      <div
        className="category-chips"
        role="group"
        aria-label="Filtrar por categoría"
      >
        <button
          className={!category ? "selected" : ""}
          onClick={() => update("category", "")}
          aria-pressed={!category}
        >
          Toda la colección <span>{active.length}</span>
        </button>
        {categories.map((name) => (
          <button
            key={name}
            className={category === name ? "selected" : ""}
            aria-pressed={category === name}
            onClick={() => update("category", name)}
          >
            {name}{" "}
            <span>{active.filter((b) => b.category === name).length}</span>
          </button>
        ))}
      </div>
      <div className="catalog-results-heading">
        <p role="status" aria-live="polite">
          {matches.length}{" "}
          {matches.length === 1 ? "libro encontrado" : "libros encontrados"}
        </p>
        {(q || category) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setParams({}, { replace: true })}
          >
            <X size={15} />
            Limpiar filtros
          </Button>
        )}
        <span aria-hidden="true">
          COLECCIÓN / {String(page).padStart(2, "0")}
        </span>
      </div>
      <section
        aria-label="Resultados del catálogo"
        aria-busy={pending}
        className="catalog-results"
      >
        {matches.length ? (
          <BookGrid books={matches.slice((page - 1) * 8, page * 8)} />
        ) : (
          <EmptyState
            title="Todavía quedan caminos por explorar"
            action={
              <Button
                variant="secondary"
                onClick={() => setParams({}, { replace: true })}
              >
                Ver toda la colección
              </Button>
            }
          >
            No encontramos fichas con esta búsqueda. Prueba otra palabra o
            cambia de tema.
          </EmptyState>
        )}
      </section>
      {lastPage > 1 && (
        <nav className="demo-pagination" aria-label="Paginación">
          <Button
            variant="ghost"
            disabled={page === 1}
            onClick={() => update("page", String(page - 1))}
          >
            Anterior
          </Button>
          {Array.from({ length: lastPage }, (_, i) => (
            <button
              className={`page-link ${page === i + 1 ? "active" : ""}`}
              key={i}
              onClick={() => update("page", String(i + 1))}
              aria-label={`Página ${i + 1}`}
              aria-current={page === i + 1 ? "page" : undefined}
            >
              {i + 1}
            </button>
          ))}
          <Button
            variant="ghost"
            disabled={page === lastPage}
            onClick={() => update("page", String(page + 1))}
          >
            Siguiente
          </Button>
        </nav>
      )}
      <p className="demo-data-note">
        Colección de demostración: títulos, autores y editoriales ficticios.
      </p>
    </>
  );
}
function BookDetail() {
  const { id } = useParams();
  const { books } = useCollection();
  const { state } = useLocation();
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const [tab, setTab] = useState<"description" | "details">("description");
  useEffect(() => setTab("description"), [id]);
  const book = books.find((b) => b.id === Number(id) && !b.deleted_at);
  if (!book) return <NotFound />;
  const catalog =
    typeof state?.catalog === "string" && state.catalog.startsWith("/catalog?")
      ? state.catalog
      : "/catalog";
  return (
    <>
      <button
        className="text-link back-link demo-back"
        onClick={() =>
          state?.returnKey
            ? navigate(-1)
            : navigate(catalog, { viewTransition: !reduced })
        }
      >
        <ArrowLeft size={16} />
        Volver a la colección
      </button>
      <article className="book-detail demo-book-detail">
        <div className="detail-cover-stage">
          <InteractiveBook
            key={book.id}
            book={book}
            transitionName={`cover-${book.id}`}
          />
        </div>
        <div className="detail-content">
          <Badge>{book.category}</Badge>
          <h1 tabIndex={-1}>{book.title}</h1>
          <p className="detail-author">
            Una obra de <strong>{book.author}</strong>
          </p>
          <p className="detail-edition">
            {book.publisher} · {book.publication_year}
          </p>
          <p className="fiction-label">Ficha ficticia de demostración</p>
          <BorrowBook bookId={book.id} />
          <div className="detail-divider" />
          <div
            className="editorial-tabs"
            role="tablist"
            aria-label="Secciones de la ficha"
          >
            {[
              { id: "description", label: "Descripción" },
              { id: "details", label: "Datos bibliográficos" },
            ].map((item, i) => (
              <button
                key={item.id}
                id={`tab-${item.id}`}
                role="tab"
                aria-selected={tab === item.id}
                aria-controls={`panel-${item.id}`}
                tabIndex={tab === item.id ? 0 : -1}
                onClick={() => setTab(item.id as typeof tab)}
                onKeyDown={(e) => {
                  if (
                    ["ArrowRight", "ArrowLeft", "Home", "End"].includes(e.key)
                  ) {
                    e.preventDefault();
                    const next =
                      e.key === "Home"
                        ? "description"
                        : e.key === "End"
                          ? "details"
                          : i === 0
                            ? "details"
                            : "description";
                    setTab(next);
                    document.getElementById(`tab-${next}`)?.focus();
                  }
                }}
              >
                {item.label}
                {tab === item.id && (
                  <motion.span
                    className="tab-underline"
                    layoutId="editorial-tab"
                  />
                )}
              </button>
            ))}
          </div>
          <motion.div
            key={`${book.id}-${tab}`}
            initial={{ opacity: 0, y: reduced ? 0 : 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            role="tabpanel"
            tabIndex={0}
            id={`panel-${tab}`}
            aria-labelledby={`tab-${tab}`}
            className="editorial-panel"
          >
            {tab === "description" ? (
              <>
                <p className="book-description">{book.description}</p>
              </>
            ) : (
              <dl className="book-facts">
                <div>
                  <dt>Autor</dt>
                  <dd>{book.author}</dd>
                </div>
                <div>
                  <dt>Casa editorial</dt>
                  <dd>{book.publisher}</dd>
                </div>
                <div>
                  <dt>Año de publicación</dt>
                  <dd>{book.publication_year}</dd>
                </div>
                <div>
                  <dt>Categoría</dt>
                  <dd>{book.category}</dd>
                </div>
              </dl>
            )}
          </motion.div>
        </div>
      </article>
      <section className="section-block related-books">
        <div className="section-heading">
          <div>
            <h2>Más libros de {book.category.toLocaleLowerCase("es")}</h2>
          </div>
          <DemoLink
            href={`/catalog?category=${encodeURIComponent(book.category)}`}
            className="text-link"
          >
            Ver categoría
          </DemoLink>
        </div>
        <BookGrid
          books={books
            .filter(
              (b) =>
                !b.deleted_at &&
                b.id !== book.id &&
                b.category === book.category,
            )
            .slice(0, 4)}
        />
      </section>
    </>
  );
}
function About() {
  return (
    <>
      <Heading eyebrow="ANDREW'S BIBLIOTECARY" title="Acerca del proyecto">
        Una biblioteca digital para explorar fichas y probar su circulación.
      </Heading>
      <div className="about-content">
        <section>
          <h2>Explora la biblioteca</h2>
          <p>
            Busca libros, filtra por tema y abre sus fichas. Esta colección
            contiene 24 títulos ficticios creados para la demostración; sus
            descripciones no son sinopsis de publicaciones reales y no incluye
            libros completos para leer o descargar.
          </p>
          <Button asChild>
            <DemoLink href="/catalog">Explorar catálogo</DemoLink>
          </Button>
        </section>
        <section>
          <h2>Prueba un recorrido de lectura</h2>
          <p>
            Elige un perfil ficticio desde la barra superior. Solicita un libro,
            cambia a Biblioteca para preparar y confirmar la entrega, y vuelve a
            Mi biblioteca para renovar. En Biblioteca también puedes simular la
            devolución y observar la disponibilidad.
          </p>
          <Button asChild>
            <DemoLink href="/my-library">Explorar Mi biblioteca</DemoLink>
          </Button>
        </section>
        <section>
          <h2>Prueba la administración</h2>
          <p>
            El panel permite crear, editar, archivar y restaurar fichas. Los
            cambios solo duran en esta pestaña: se reinician al recargar. Entrar
            al panel no crea una cuenta ni representa autenticación o control de
            acceso. El selector de perfiles solo cambia el recorrido de
            demostración. Las muestras de cargos y pagos no mueven dinero real.
          </p>
          <Button asChild variant="secondary">
            <DemoLink href="/demo/admin">Probar panel administrador</DemoLink>
          </Button>
        </section>
        <section className="about-project-details">
          <h2>Aplicación completa</h2>
          <p>
            El proyecto conserva una versión Laravel con cuentas, permisos y
            operaciones de servidor, separada de esta demostración. El código se
            distribuye bajo GPL-3.0.
          </p>
        </section>
      </div>
    </>
  );
}
function NotFound() {
  return (
    <>
      <Heading
        eyebrow="UN CAMINO POR DESCUBRIR"
        title="Esta página no está en la colección."
      />
      <EmptyState
        title="Volvamos a un buen comienzo"
        action={
          <Button asChild>
            <DemoLink href="/catalog">Explorar catálogo</DemoLink>
          </Button>
        }
      >
        La dirección no existe o la ficha está archivada en esta sesión de
        demostración.
      </EmptyState>
    </>
  );
}
function App() {
  const [books, setBooks] = useState<Book[]>(initialBooks);
  const location = useLocation();
  useEffect(() => {
    const title =
      location.pathname === "/"
        ? "Una biblioteca de ideas"
        : location.pathname === "/catalog"
          ? "La colección"
          : location.pathname.startsWith("/demo/admin")
            ? "Administración · Modo demostración"
            : location.pathname === "/my-library"
              ? "Mi biblioteca"
              : location.pathname === "/news"
                ? "Novedades"
                : (books.find((b) => `/catalog/${b.id}` === location.pathname)
                    ?.title ?? "Interactive Edition");
    document.title = `${title} · Andrew's Bibliotecary`;
  }, [location.pathname, books]);
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig
        reducedMotion="user"
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      >
        <Collection.Provider value={{ books, setBooks }}>
          <DemoLibraryProvider>
            <PresentationNavigation value={DemoLink}>
              <Shell>
                <DemoFeedback />
                <div key={location.pathname} className="demo-route-content">
                  <Suspense
                    fallback={
                      <div role="status" aria-label="Cargando la biblioteca">
                        <Skeleton className="workshop-skeleton" />
                      </div>
                    }
                  >
                    <Routes>
                      <Route path="/" element={<Home />} />
                      <Route path="/catalog" element={<Catalog />} />
                      <Route path="/catalog/:id" element={<BookDetail />} />
                      <Route path="/my-library" element={<Reader />} />
                      <Route path="/news" element={<News />} />
                      <Route
                        path="/demo/admin/circulation"
                        element={<Circulation />}
                      />
                      <Route path="/demo/admin/finance" element={<Finance />} />
                      <Route
                        path="/studio"
                        element={<Navigate to="/demo/admin" replace />}
                      />
                      <Route
                        path="/demo/admin"
                        element={<Studio view="overview" />}
                      />
                      <Route
                        path="/demo/admin/books"
                        element={<Studio view="books" />}
                      />
                      <Route path="/about" element={<About />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                </div>
                <NavigationRestoration />
              </Shell>
            </PresentationNavigation>
          </DemoLibraryProvider>
        </Collection.Provider>
      </MotionConfig>
    </LazyMotion>
  );
}
try {
  document.documentElement.dataset.theme =
    localStorage.getItem("bibliotecary-theme") === "light" ? "light" : "dark";
} catch {
  /* Opcional. */
}
document.documentElement.dataset.transitions =
  typeof document.startViewTransition === "function" ? "native" : "css";
const router = createBrowserRouter([{ path: "*", element: <App /> }]);
createRoot(document.getElementById("root")!).render(
  <RouterProvider router={router} />,
);
