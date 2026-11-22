import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Archive,
  RotateCcw,
  Plus,
  Pencil,
  Search,
  BookOpen,
  Library,
} from "lucide-react";
import { useCollection, initialBooks, demoCategories } from "./collection";
import { Heading } from "./heading";
import { DemoLink } from "./navigation";
import { AdminBookForm, emptyBook, type BookDraft } from "./admin-book-form";
import {
  Button,
  Dialog,
  Input,
  Select,
  Notice,
  EmptyState,
} from "../../modern/resources/js/components/ui";
import { BookCover } from "../../modern/resources/js/components/book-cover";
import type { Book } from "../../modern/resources/js/types";

type Confirmation = { kind: "archive"; book: Book } | { kind: "reset" };
const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es");
export default function Studio({ view }: { view: "overview" | "books" }) {
  const { books, setBooks } = useCollection();
  const [params, setParams] = useSearchParams();
  const [editor, setEditor] = useState<{
    book: BookDraft;
    id: number | null;
  } | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [message, setMessage] = useState("");
  const resultRef = useRef<HTMLDivElement>(null);
  const active = books.filter((book) => !book.deleted_at);
  const archived = books.length - active.length;
  const query = params.get("q") ?? "";
  const category = params.get("category") ?? "";
  const status = params.get("status") === "archived" ? "archived" : "active";
  const filtered = books.filter(
    (book) =>
      !!book.deleted_at === (status === "archived") &&
      (!category || book.category === category) &&
      normalize(`${book.title} ${book.author} ${book.publisher}`).includes(
        normalize(query),
      ),
  );
  const lastPage = Math.max(1, Math.ceil(filtered.length / 8));
  const pageParam = Number(params.get("page"));
  const page = Math.min(
    lastPage,
    Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1,
  );
  const visible = filtered.slice((page - 1) * 8, page * 8);
  useEffect(() => {
    if (params.has("page") && String(page) !== params.get("page")) {
      const next = new URLSearchParams(params);
      next.set("page", String(page));
      setParams(next, { replace: true, preventScrollReset: true });
    }
  }, [page, params, setParams]);
  function filter(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    setParams(next, { replace: true, preventScrollReset: true });
  }
  function save(draft: BookDraft) {
    if (!editor) return;
    const now = new Date().toISOString();
    if (editor.id === null) {
      setBooks((items) => [
        ...items,
        {
          ...draft,
          id: Math.max(0, ...items.map((book) => book.id)) + 1,
          created_at: now,
          updated_at: now,
        },
      ]);
      setParams(
        { q: draft.title },
        { replace: true, preventScrollReset: true },
      );
      setMessage(`Ficha «${draft.title}» creada en la demo.`);
    } else {
      setBooks((items) =>
        items.map((book) =>
          book.id === editor.id ? { ...book, ...draft, updated_at: now } : book,
        ),
      );
      setMessage(`Ficha «${draft.title}» actualizada en la demo.`);
    }
    setEditor(null);
  }
  function confirm() {
    if (!confirmation) return;
    if (confirmation.kind === "reset") {
      setBooks(structuredClone(initialBooks));
      setParams({}, { replace: true, preventScrollReset: true });
      setMessage("Datos de demostración restablecidos.");
    } else {
      const target = confirmation.book;
      setBooks((items) =>
        items.map((book) =>
          book.id === target.id
            ? { ...book, deleted_at: new Date().toISOString() }
            : book,
        ),
      );
      setMessage(
        `Ficha «${target.title}» archivada. Puedes restaurarla desde el archivo.`,
      );
    }
    setConfirmation(null);
    requestAnimationFrame(() =>
      resultRef.current?.focus({ preventScroll: true }),
    );
  }
  const resetButton = (
    <Button variant="ghost" onClick={() => setConfirmation({ kind: "reset" })}>
      <RotateCcw size={16} aria-hidden="true" />
      Restablecer datos
    </Button>
  );
  return (
    <>
      <div className="admin-page-header">
        <Heading
          eyebrow="PANEL ADMINISTRADOR"
          title={
            view === "overview"
              ? "Resumen de la colección"
              : "Gestión de fichas"
          }
        >
          {view === "overview"
            ? "Consulta la colección y prueba su gestión."
            : "Busca una ficha para editarla, archivarla o restaurarla."}
        </Heading>
        <div className="admin-page-actions">
          {view === "books" && (
            <Button
              onClick={(event) => {
                event.currentTarget.focus({ preventScroll: true });
                setEditor({ book: { ...emptyBook }, id: null });
              }}
            >
              <Plus size={17} aria-hidden="true" />
              Nueva ficha
            </Button>
          )}
          {resetButton}
        </div>
      </div>
      <div ref={resultRef} tabIndex={-1} className="admin-feedback">
        <Notice>{message}</Notice>
      </div>
      {view === "overview" ? (
        <>
          <section
            className="admin-metrics"
            aria-label="Resumen de la colección"
          >
            {[
              {
                value: active.length,
                label: "Fichas activas",
                href: "/demo/admin/books",
              },
              {
                value: archived,
                label: "Fichas archivadas",
                href: "/demo/admin/books?status=archived",
              },
              {
                value: new Set(active.map((book) => book.author)).size,
                label: "Autores en catálogo",
                href: "/demo/admin/books",
              },
            ].map((item) => (
              <DemoLink
                key={item.label}
                href={item.href}
                className="admin-metric"
              >
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <small>Ver fichas</small>
              </DemoLink>
            ))}
          </section>
          <div className="admin-overview-grid">
            <section className="panel admin-collection-summary">
              <Library size={24} aria-hidden="true" />
              <h2>Gestiona la colección</h2>
              <p>
                Actualiza sus datos, prueba una nueva ficha o consulta el
                archivo.
              </p>
              <Button asChild>
                <DemoLink href="/demo/admin/books">Gestionar fichas</DemoLink>
              </Button>
            </section>
            <section className="panel admin-category-summary">
              <h2>Distribución por categoría</h2>
              <ul>
                {demoCategories
                  .map((name) => ({
                    name,
                    count: active.filter((book) => book.category === name)
                      .length,
                  }))
                  .filter((item) => item.count > 0)
                  .map((item) => (
                    <li key={item.name}>
                      <DemoLink
                        href={`/demo/admin/books?category=${encodeURIComponent(item.name)}`}
                      >
                        <span>{item.name}</span>
                        <strong>{item.count}</strong>
                      </DemoLink>
                      <span className="category-meter" aria-hidden="true">
                        <i
                          style={{
                            width: `${active.length ? (item.count / active.length) * 100 : 0}%`,
                          }}
                        />
                      </span>
                    </li>
                  ))}
              </ul>
              {!active.length && <p>La colección activa está vacía.</p>}
            </section>
          </div>
        </>
      ) : (
        <>
          <div className="admin-filters">
            <div className="demo-search">
              <Search size={18} aria-hidden="true" />
              <label htmlFor="admin-search" className="sr-only">
                Buscar fichas
              </label>
              <Input
                id="admin-search"
                type="search"
                value={query}
                maxLength={200}
                onChange={(event) => filter("q", event.target.value)}
                placeholder="Buscar por título, autor o editorial"
              />
            </div>
            <div>
              <label htmlFor="admin-category">Filtrar por categoría</label>
              <Select
                id="admin-category"
                value={category}
                onChange={(event) => filter("category", event.target.value)}
              >
                <option value="">Todas</option>
                {demoCategories.map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </Select>
            </div>
            <div>
              <label htmlFor="admin-status">Estado de las fichas</label>
              <Select
                id="admin-status"
                value={status}
                onChange={(event) => filter("status", event.target.value)}
              >
                <option value="active">Activas ({active.length})</option>
                <option value="archived">Archivadas ({archived})</option>
              </Select>
            </div>
          </div>
          <div className="admin-results-line">
            <p role="status" aria-live="polite">
              {filtered.length}{" "}
              {filtered.length === 1
                ? "ficha encontrada"
                : "fichas encontradas"}
            </p>
            {(query || category) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setParams(
                    status === "archived" ? { status: "archived" } : {},
                    { replace: true, preventScrollReset: true },
                  )
                }
              >
                Limpiar filtros
              </Button>
            )}
          </div>
          {filtered.length ? (
            <>
              <div className="admin-table-container">
                <table className="admin-books-table">
                  <caption className="sr-only">
                    Fichas {status === "archived" ? "archivadas" : "activas"} de
                    la colección de demostración
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Libro</th>
                      <th scope="col">Categoría</th>
                      <th scope="col">Año</th>
                      <th scope="col">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((book) => (
                      <tr key={book.id}>
                        <td>
                          <div className="admin-book-cell">
                            <div className="admin-mini-cover">
                              <BookCover book={book} />
                            </div>
                            <div>
                              <strong>{book.title}</strong>
                              <span>{book.author}</span>
                            </div>
                          </div>
                        </td>
                        <td data-label="Categoría">{book.category}</td>
                        <td data-label="Año">{book.publication_year}</td>
                        <td>
                          <div className="admin-row-actions">
                            {!book.deleted_at && (
                              <Button
                                variant="ghost"
                                size="sm"
                                aria-label={`Editar ${book.title}`}
                                onClick={(event) => {
                                  event.currentTarget.focus({
                                    preventScroll: true,
                                  });
                                  setEditor({ book: { ...book }, id: book.id });
                                }}
                              >
                                <Pencil size={15} aria-hidden="true" />
                                Editar
                              </Button>
                            )}
                            {book.deleted_at ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                aria-label={`Restaurar ${book.title}`}
                                onClick={() => {
                                  setBooks((items) =>
                                    items.map((item) =>
                                      item.id === book.id
                                        ? { ...item, deleted_at: null }
                                        : item,
                                    ),
                                  );
                                  setMessage(
                                    `Ficha «${book.title}» restaurada en la demo.`,
                                  );
                                  requestAnimationFrame(() =>
                                    resultRef.current?.focus({
                                      preventScroll: true,
                                    }),
                                  );
                                }}
                              >
                                <RotateCcw size={15} aria-hidden="true" />
                                Restaurar
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                aria-label={`Archivar ${book.title}`}
                                onClick={(event) => {
                                  event.currentTarget.focus({
                                    preventScroll: true,
                                  });
                                  setConfirmation({ kind: "archive", book });
                                }}
                              >
                                <Archive size={15} aria-hidden="true" />
                                Archivar
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="admin-pagination">
                <p>
                  {(page - 1) * 8 + 1}–{Math.min(page * 8, filtered.length)} de{" "}
                  {filtered.length} fichas
                </p>
                <nav aria-label="Paginación de fichas">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => filter("page", String(page - 1))}
                  >
                    Anterior
                  </Button>
                  <span>
                    Página {page} de {lastPage}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page === lastPage}
                    onClick={() => filter("page", String(page + 1))}
                  >
                    Siguiente
                  </Button>
                </nav>
              </div>
            </>
          ) : (
            <EmptyState
              title={
                query || category
                  ? "No hay fichas con estos filtros"
                  : status === "archived"
                    ? "El archivo está vacío"
                    : "La colección activa está vacía"
              }
              action={
                status === "archived" ? (
                  <Button asChild variant="secondary">
                    <DemoLink href="/demo/admin/books">
                      Ver fichas activas
                    </DemoLink>
                  </Button>
                ) : (
                  <Button
                    onClick={() =>
                      setEditor({ book: { ...emptyBook }, id: null })
                    }
                  >
                    Crear una ficha
                  </Button>
                )
              }
            >
              {query || category
                ? "Prueba otra búsqueda o cambia de categoría."
                : status === "archived"
                  ? "Las fichas que archives aparecerán aquí."
                  : "Añade una ficha o restaura una desde el archivo."}
            </EmptyState>
          )}
        </>
      )}
      <Dialog
        open={!!editor}
        onOpenChange={(open) => {
          if (!open) setEditor(null);
        }}
        title={editor?.id === null ? "Nueva ficha" : "Editar ficha"}
        description="Los cambios se aplican solo a esta demostración y se reinician al recargar."
      >
        {editor && (
          <AdminBookForm
            key={editor.id ?? "new"}
            book={editor.book}
            onSave={save}
            onCancel={() => setEditor(null)}
          />
        )}
      </Dialog>
      <Dialog
        open={!!confirmation}
        fallbackFocusRef={resultRef}
        onOpenChange={(open) => {
          if (!open) setConfirmation(null);
        }}
        title={
          confirmation?.kind === "reset"
            ? "¿Restablecer los datos de la demo?"
            : "¿Archivar esta ficha?"
        }
        description={
          confirmation?.kind === "reset"
            ? "Se descartarán las fichas creadas y los cambios de esta pestaña. Volverás a la colección inicial."
            : `«${confirmation?.kind === "archive" ? confirmation.book.title : ""}» dejará de aparecer en el catálogo. Podrás restaurarla desde el archivo.`
        }
      >
        <div className="dialog-actions">
          <Button variant="ghost" onClick={() => setConfirmation(null)}>
            Cancelar
          </Button>
          <Button
            variant={confirmation?.kind === "reset" ? "destructive" : "primary"}
            onClick={confirm}
          >
            {confirmation?.kind === "reset"
              ? "Restablecer datos"
              : "Archivar ficha"}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
