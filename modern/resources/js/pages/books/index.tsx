import { Link, useForm, usePage } from "@inertiajs/react";
import { useState } from "react";
import {
    Archive,
    BookOpen,
    Grid2X2,
    List,
    Pencil,
    Plus,
    RotateCcw,
    Search,
    SlidersHorizontal,
    Trash2,
    X,
} from "lucide-react";
import { AppShell } from "../../components/layout";
import { BookCard, BookCover, PaginationLinks } from "../../components/books";
import {
    Badge,
    Button,
    Dialog,
    EmptyState,
    Field,
    Input,
    Notice,
    Select,
    SubmitButton,
    fieldA11y,
    cn,
} from "../../components/ui";
import type { Book, Pagination, SharedProps, Stats } from "../../types";
import { useFilters } from "../../hooks/use-filters";
type Filters = {
    q: string;
    category: string;
    author: string;
    sort: string;
    view: string;
    status: string;
};
export default function BookIndex({
    books,
    filters: serverFilters,
    categories,
    authors,
    stats,
    management = false,
}: {
    books: Pagination<Book>;
    filters: Partial<Filters>;
    categories: string[];
    authors: string[];
    stats: Stats;
    management: boolean;
}) {
    const { can, auth, errors: sharedErrors } = usePage<SharedProps>().props;
    const path = management ? "/manage/books" : "/catalog";
    const { filters, change, setFilters } = useFilters<Filters>(path, {
        q: "",
        category: "",
        author: "",
        sort: "recent",
        view: "grid",
        status: "active",
        ...serverFilters,
    });
    const [selected, setSelected] = useState<Book | null>(null);
    const [bulkOpen, setBulkOpen] = useState(false);
    const [extraFilters, setExtraFilters] = useState(false);
    const archive = useForm({});
    const bulk = useForm({ password: "", confirmation: "" });
    const trash = filters.status === "trash";
    const hasFilters = !!(filters.q || filters.category || filters.author);
    const count = books.total;
    function archiveBook() {
        if (!selected) return;
        if (selected.deleted_at)
            archive.post(`/manage/books/${selected.id}/restore`, {
                preserveScroll: true,
                onSuccess: () => setSelected(null),
            });
        else
            archive.delete(`/manage/books/${selected.id}`, {
                preserveScroll: true,
                onSuccess: () => setSelected(null),
            });
    }
    return (
        <AppShell
            title={management ? "Gestión de libros" : "Catálogo de libros"}
            eyebrow={management ? "GESTIÓN DEL CATÁLOGO" : "LA COLECCIÓN"}
            actions={
                management && can.manageBooks ? (
                    <Button asChild>
                        <Link href="/manage/books/create">
                            <Plus size={18} />
                            Incorporar libro
                        </Link>
                    </Button>
                ) : (
                    <span className="heading-count">
                        <BookOpen size={16} />
                        {stats.books.toLocaleString("es-MX")} libros, muchas
                        perspectivas
                    </span>
                )
            }
        >
            <div className="catalog-intro">
                <p>
                    {management
                        ? "Cada ficha cuenta una historia. Mantén los detalles al día y organiza lo que viene."
                        : "Busca un título, sigue a un autor o déjate llevar por un tema. La siguiente página la eliges tú."}
                </p>
                {management && (
                    <div className="tabs" aria-label="Estado de los libros">
                        <button
                            className={cn(!trash && "active")}
                            onClick={() => change("status", "active")}
                        >
                            Catálogo activo
                        </button>
                        <button
                            className={cn(trash && "active")}
                            onClick={() => change("status", "trash")}
                        >
                            <Archive size={15} />
                            Archivados
                            {stats.archived !== undefined && (
                                <span>{stats.archived}</span>
                            )}
                        </button>
                    </div>
                )}
            </div>
            <section
                className="catalog-toolbar"
                aria-label="Buscar y filtrar libros"
            >
                <div className="search-field">
                    <Search size={19} aria-hidden="true" />
                    <label className="sr-only" htmlFor="catalog-search">
                        Buscar por título, autor o editorial
                    </label>
                    <Input
                        id="catalog-search"
                        type="search"
                        value={filters.q}
                        onChange={(e) => change("q", e.target.value)}
                        placeholder="Busca un título, autor o editorial…"
                    />
                    {filters.q && (
                        <button
                            onClick={() => change("q", "")}
                            aria-label="Borrar búsqueda"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>
                <div className="toolbar-category">
                    <label className="sr-only" htmlFor="category-filter">
                        Categoría
                    </label>
                    <Select
                        id="category-filter"
                        value={filters.category}
                        onChange={(e) => change("category", e.target.value)}
                    >
                        <option value="">Todos los temas</option>
                        {categories.map((category) => (
                            <option key={category}>{category}</option>
                        ))}
                    </Select>
                </div>
                <Button
                    variant={extraFilters ? "secondary" : "ghost"}
                    onClick={() => setExtraFilters(!extraFilters)}
                    aria-expanded={extraFilters}
                    aria-controls="extra-filters"
                >
                    <SlidersHorizontal size={17} />
                    <span>Filtros</span>
                </Button>
                <div
                    className="view-toggle"
                    aria-label="Presentación del catálogo"
                >
                    <button
                        aria-label="Vista de tarjetas"
                        aria-pressed={filters.view !== "list"}
                        onClick={() => change("view", "grid")}
                        className={cn(filters.view !== "list" && "active")}
                    >
                        <Grid2X2 size={18} />
                    </button>
                    <button
                        aria-label="Vista de tabla"
                        aria-pressed={filters.view === "list"}
                        onClick={() => change("view", "list")}
                        className={cn(filters.view === "list" && "active")}
                    >
                        <List size={19} />
                    </button>
                </div>
            </section>
            {extraFilters && (
                <div className="extra-filters" id="extra-filters">
                    <Field label="Autor" id="author-filter">
                        <Select
                            id="author-filter"
                            value={filters.author}
                            onChange={(e) => change("author", e.target.value)}
                        >
                            <option value="">Todas las voces</option>
                            {authors.map((author) => (
                                <option key={author}>{author}</option>
                            ))}
                        </Select>
                    </Field>
                    <Field label="Ordenar por" id="sort-filter">
                        <Select
                            id="sort-filter"
                            value={filters.sort}
                            onChange={(e) => change("sort", e.target.value)}
                        >
                            <option value="recent">
                                Últimas incorporaciones
                            </option>
                            <option value="title">Título, de A a Z</option>
                            <option value="author">Autor, de A a Z</option>
                            <option value="oldest">
                                Primeras incorporaciones
                            </option>
                        </Select>
                    </Field>
                </div>
            )}
            <div className="results-heading">
                <p>
                    <strong>{count.toLocaleString("es-MX")}</strong>{" "}
                    {count === 1 ? "libro" : "libros"}
                    {trash
                        ? " en el archivo"
                        : hasFilters
                          ? " para tu búsqueda"
                          : " para explorar"}
                </p>
                {hasFilters && (
                    <button
                        className="text-link"
                        onClick={() =>
                            setFilters({
                                ...filters,
                                q: "",
                                category: "",
                                author: "",
                            })
                        }
                    >
                        Limpiar filtros
                        <X size={14} />
                    </button>
                )}
                {management && auth.user?.role === "admin" && !trash && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="danger-text"
                        onClick={() => {
                            bulk.clearErrors();
                            setBulkOpen(true);
                        }}
                    >
                        <Archive size={15} />
                        Archivar catálogo
                    </Button>
                )}
            </div>
            {sharedErrors.book && (
                <Notice kind="error">{sharedErrors.book}</Notice>
            )}
            {books.data.length ? (
                filters.view === "list" || management ? (
                    <div
                        className="table-wrap"
                        tabIndex={0}
                        role="region"
                        aria-label="Libros del catálogo, tabla desplazable"
                    >
                        <table className="data-table book-table">
                            <caption className="sr-only">
                                {trash
                                    ? "Libros archivados"
                                    : "Libros del catálogo"}
                            </caption>
                            <thead>
                                <tr>
                                    <th>Libro / Autor</th>
                                    <th>Categoría</th>
                                    <th>Editorial</th>
                                    <th>Año</th>
                                    <th>
                                        <span className="sr-only">
                                            Acciones
                                        </span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {books.data.map((book) => (
                                    <tr key={book.id}>
                                        <td>
                                            <div className="table-book">
                                                <BookCover
                                                    book={book}
                                                    className="cover-mini"
                                                />
                                                <span>
                                                    <strong>
                                                        {book.deleted_at ? (
                                                            book.title
                                                        ) : (
                                                            <Link
                                                                href={`/catalog/${book.id}`}
                                                            >
                                                                {book.title}
                                                            </Link>
                                                        )}
                                                    </strong>
                                                    <small>{book.author}</small>
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            <Badge>{book.category}</Badge>
                                        </td>
                                        <td className="muted">
                                            {book.publisher || "Sin editorial"}
                                        </td>
                                        <td className="muted">
                                            {book.publication_year || "—"}
                                        </td>
                                        <td>
                                            <div className="row-actions">
                                                {management &&
                                                can.manageBooks ? (
                                                    trash ? (
                                                        <Button
                                                            size="sm"
                                                            variant="secondary"
                                                            onClick={() =>
                                                                setSelected(
                                                                    book,
                                                                )
                                                            }
                                                        >
                                                            <RotateCcw
                                                                size={15}
                                                            />
                                                            Restaurar
                                                        </Button>
                                                    ) : (
                                                        <>
                                                            <Button
                                                                asChild
                                                                variant="ghost"
                                                                size="icon"
                                                            >
                                                                <Link
                                                                    href={`/manage/books/${book.id}/edit`}
                                                                    aria-label={`Editar ${book.title}`}
                                                                >
                                                                    <Pencil
                                                                        size={
                                                                            16
                                                                        }
                                                                    />
                                                                </Link>
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() =>
                                                                    setSelected(
                                                                        book,
                                                                    )
                                                                }
                                                                aria-label={`Archivar ${book.title}`}
                                                            >
                                                                <Archive
                                                                    size={17}
                                                                />
                                                            </Button>
                                                        </>
                                                    )
                                                ) : (
                                                    <Button
                                                        asChild
                                                        variant="ghost"
                                                        size="icon"
                                                    >
                                                        <Link
                                                            href={`/catalog/${book.id}`}
                                                            aria-label={`Ver ${book.title}`}
                                                        >
                                                            <BookOpen
                                                                size={19}
                                                                aria-hidden="true"
                                                            />
                                                        </Link>
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="book-grid catalog-grid">
                        {books.data.map((book, index) => (
                            <BookCard
                                key={book.id}
                                book={book}
                                index={(books.from ?? 1) + index - 1}
                            />
                        ))}
                    </div>
                )
            ) : (
                <EmptyState
                    title={
                        hasFilters
                            ? "Aquí empieza otra búsqueda."
                            : trash
                              ? "El archivo está en calma."
                              : "Una colección por comenzar."
                    }
                >
                    {hasFilters
                        ? "Prueba con otro título o elimina algún filtro para abrir más posibilidades."
                        : trash
                          ? "Los libros que archives aparecerán aquí. Podrás recuperarlos cuando lo necesites."
                          : "Todavía no hay libros en el catálogo."}
                    {hasFilters
                        ? null
                        : management && can.manageBooks && !trash
                          ? " Incorpora la primera ficha para empezar."
                          : " Vuelve pronto para descubrir las novedades."}
                </EmptyState>
            )}
            <PaginationLinks pagination={books} />
            <Dialog
                open={!!selected}
                onOpenChange={(open) => {
                    if (!open && !archive.processing) {
                        setSelected(null);
                        archive.clearErrors();
                    }
                }}
                title={
                    selected?.deleted_at
                        ? "Una nueva página para este libro."
                        : "Archivar este libro"
                }
                description={
                    selected?.deleted_at
                        ? "La ficha volverá a ser visible en el catálogo público."
                        : "La ficha dejará de aparecer en el catálogo. Podrás recuperarla desde Archivados."
                }
            >
                <div className="confirmation-book">
                    <BookOpen size={22} />
                    <span>
                        <strong>{selected?.title}</strong>
                        <small>{selected?.author}</small>
                    </span>
                </div>
                <Notice kind="error">
                    {Object.values(archive.errors).length
                        ? String(Object.values(archive.errors)[0])
                        : null}
                </Notice>
                <div className="dialog-actions">
                    <Button
                        variant="secondary"
                        disabled={archive.processing}
                        onClick={() => setSelected(null)}
                    >
                        Cancelar
                    </Button>
                    <SubmitButton
                        processing={archive.processing}
                        variant={
                            selected?.deleted_at ? "primary" : "destructive"
                        }
                        onClick={archiveBook}
                    >
                        {selected?.deleted_at
                            ? "Restaurar libro"
                            : "Archivar libro"}
                    </SubmitButton>
                </div>
            </Dialog>
            <Dialog
                open={bulkOpen}
                onOpenChange={(open) => {
                    if (!bulk.processing) {
                        setBulkOpen(open);
                        if (!open) bulk.reset();
                    }
                }}
                title="Archivar el catálogo completo"
                description="Todos los libros activos dejarán de ser visibles. Esta operación queda registrada y los libros podrán restaurarse individualmente."
            >
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        bulk.post("/manage/books/archive-all", {
                            preserveScroll: true,
                            onSuccess: () => {
                                setBulkOpen(false);
                                bulk.reset();
                            },
                        });
                    }}
                    className="form-stack"
                >
                    <Field
                        label="Escribe ARCHIVAR CATÁLOGO"
                        id="archive-confirmation"
                        error={bulk.errors.confirmation}
                    >
                        <Input
                            id="archive-confirmation"
                            value={bulk.data.confirmation}
                            onChange={(e) =>
                                bulk.setData("confirmation", e.target.value)
                            }
                            autoComplete="off"
                            required
                            {...fieldA11y(
                                "archive-confirmation",
                                bulk.errors.confirmation,
                            )}
                        />
                    </Field>
                    <Field
                        label="Tu contraseña actual"
                        id="archive-password"
                        error={bulk.errors.password}
                    >
                        <Input
                            id="archive-password"
                            type="password"
                            autoComplete="current-password"
                            value={bulk.data.password}
                            onChange={(e) =>
                                bulk.setData("password", e.target.value)
                            }
                            required
                            {...fieldA11y(
                                "archive-password",
                                bulk.errors.password,
                            )}
                        />
                    </Field>
                    <div className="dialog-actions">
                        <Button
                            type="button"
                            variant="secondary"
                            disabled={bulk.processing}
                            onClick={() => {
                                setBulkOpen(false);
                                bulk.reset();
                            }}
                        >
                            Cancelar
                        </Button>
                        <SubmitButton
                            processing={bulk.processing}
                            disabled={
                                bulk.data.confirmation !== "ARCHIVAR CATÁLOGO"
                            }
                            variant="destructive"
                        >
                            <Trash2 size={16} />
                            Archivar todo
                        </SubmitButton>
                    </div>
                </form>
            </Dialog>
        </AppShell>
    );
}
