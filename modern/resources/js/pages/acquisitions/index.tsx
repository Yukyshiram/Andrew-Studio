import { Link, useForm } from "@inertiajs/react";
import { useRef, useState } from "react";
import { AppShell } from "../../components/layout";
import { PaginationLinks } from "../../components/books";
import {
    AcquisitionDates,
    AcquisitionStatusBadge,
    acquisitionStatuses,
} from "../../components/news-ui";
import { LibraryBookTitle, LibraryErrors } from "../../components/library-ui";
import {
    Badge,
    Button,
    Dialog,
    EmptyState,
    Field,
    Input,
    Select,
    SubmitButton,
    Textarea,
    fieldA11y,
} from "../../components/ui";
import type { Acquisition, AcquisitionStatus } from "../../library-types";
import type { Book, Pagination } from "../../types";

const empty = {
    book_id: 0,
    status: "announced" as AcquisitionStatus,
    publication_on: "",
    expected_on: "",
    incorporated_on: "",
    is_fictional: false,
    public_note: "",
    source_url: "",
    version: 1,
    operation_key: "",
};
export default function Acquisitions({
    acquisitions,
    books,
    filters,
}: {
    acquisitions: Pagination<Acquisition>;
    books: Pick<Book, "id" | "title">[];
    filters: { q: string; status: string };
}) {
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Acquisition | null>(null);
    const closed =
        editing?.status === "incorporated" || editing?.status === "cancelled";
    const trigger = useRef<HTMLButtonElement | null>(null);
    const feedback = useRef<HTMLParagraphElement>(null);
    const form = useForm(empty);
    const search = useForm(filters);
    function edit(record: Acquisition | null, element: HTMLButtonElement) {
        trigger.current = element;
        setEditing(record);
        form.clearErrors();
        form.setData(
            record
                ? {
                      book_id: record.book_id,
                      status: record.status,
                      publication_on: record.publication_on ?? "",
                      expected_on: record.expected_on ?? "",
                      incorporated_on: record.incorporated_on ?? "",
                      is_fictional: record.is_fictional,
                      public_note: record.public_note ?? "",
                      source_url: record.source_url ?? "",
                      version: record.version ?? 1,
                      operation_key: "",
                  }
                : {
                      ...empty,
                      book_id: books[0]?.id ?? 0,
                      operation_key: crypto.randomUUID(),
                  },
        );
        setOpen(true);
    }
    return (
        <AppShell
            title="Incorporaciones y adquisiciones"
            eyebrow="PLANIFICAR LA COLECCIÓN"
            actions={
                <Button
                    onClick={(e) => edit(null, e.currentTarget)}
                    disabled={!books.length}
                >
                    Registrar incorporación
                </Button>
            }
        >
            <p className="page-description">
                Registra anuncios, pedidos y llegadas. La incorporación real
                exige un ejemplar ya registrado en{" "}
                <Link href="/manage/inventory" className="text-link">
                    Inventario
                </Link>
                ; las previsiones no crean existencias.
            </p>
            <form
                className="library-search"
                onSubmit={(e) => {
                    e.preventDefault();
                    search.get("/manage/acquisitions", {
                        preserveState: true,
                        preserveScroll: true,
                    });
                }}
            >
                <Field
                    id="acquisitions-q"
                    label="Buscar título"
                    hint="La búsqueda también filtra las fichas del formulario, hasta 200 coincidencias. Precisa el título para localizar otras."
                >
                    <Input
                        id="acquisitions-q"
                        type="search"
                        maxLength={80}
                        value={search.data.q}
                        onChange={(e) => search.setData("q", e.target.value)}
                    />
                </Field>
                <Field id="acquisitions-status" label="Estado">
                    <Select
                        id="acquisitions-status"
                        value={search.data.status}
                        onChange={(e) =>
                            search.setData("status", e.target.value)
                        }
                    >
                        <option value="all">Todos</option>
                        {Object.entries(acquisitionStatuses).map(
                            ([value, label]) => (
                                <option value={value} key={value}>
                                    {label}
                                </option>
                            ),
                        )}
                    </Select>
                </Field>
                <Button
                    type="submit"
                    variant="secondary"
                    disabled={search.processing}
                >
                    Buscar
                </Button>
            </form>
            <p ref={feedback} tabIndex={-1} className="library-context">
                {acquisitions.total} incorporaciones registradas.{" "}
                <Link href="/news" className="text-link">
                    Ver novedades públicas
                </Link>
            </p>
            {acquisitions.data.length ? (
                <div className="library-records">
                    {acquisitions.data.map((record) => (
                        <article
                            className="panel library-record"
                            key={record.id}
                        >
                            <div className="library-record-heading">
                                <h2>
                                    <LibraryBookTitle book={record.book} />
                                </h2>
                                <AcquisitionStatusBadge
                                    status={record.status}
                                />
                            </div>
                            {record.is_fictional && (
                                <Badge>Datos ficticios</Badge>
                            )}
                            <AcquisitionDates acquisition={record} />
                            {record.public_note && (
                                <p className="news-public-note">
                                    {record.public_note}
                                </p>
                            )}
                            <Button
                                variant="secondary"
                                onClick={(e) => edit(record, e.currentTarget)}
                                aria-label={`Editar incorporación de ${record.book.title}`}
                            >
                                Editar incorporación
                            </Button>
                        </article>
                    ))}
                </div>
            ) : (
                <EmptyState title="Todavía no hay incorporaciones registradas">
                    Busca otra ficha o registra un anuncio, pedido o llegada.
                    Las fichas antiguas conservan sus datos y no se convierten
                    automáticamente en novedades.
                </EmptyState>
            )}
            <PaginationLinks pagination={acquisitions} />
            <Dialog
                open={open}
                onOpenChange={(value) => {
                    if (!form.processing) setOpen(value);
                }}
                returnFocusRef={trigger}
                fallbackFocusRef={feedback}
                title={
                    editing ? "Editar incorporación" : "Registrar incorporación"
                }
                description={
                    editing
                        ? editing.book.title
                        : "Selecciona una ficha existente. La publicación editorial, la llegada estimada y la incorporación real son fechas distintas."
                }
            >
                <form
                    className="form-stack"
                    noValidate
                    onSubmit={(e) => {
                        e.preventDefault();
                        form.transform(
                            ({ book_id, version, operation_key, ...fields }) =>
                                editing
                                    ? { ...fields, version }
                                    : { ...fields, book_id, operation_key },
                        );
                        const options = {
                            preserveScroll: true,
                            onSuccess: () => setOpen(false),
                            onError: () =>
                                requestAnimationFrame(() =>
                                    document
                                        .querySelector<HTMLElement>(
                                            '[role="dialog"] [aria-invalid="true"]',
                                        )
                                        ?.focus(),
                                ),
                        };
                        if (editing)
                            form.put(
                                `/manage/acquisitions/${editing.id}`,
                                options,
                            );
                        else form.post("/manage/acquisitions", options);
                    }}
                >
                    <LibraryErrors errors={form.errors} />
                    {!editing && (
                        <Field
                            id="acquisition-book"
                            label="Ficha bibliográfica"
                            error={form.errors.book_id}
                        >
                            <Select
                                id="acquisition-book"
                                value={form.data.book_id}
                                onChange={(e) =>
                                    form.setData(
                                        "book_id",
                                        Number(e.target.value),
                                    )
                                }
                                {...fieldA11y(
                                    "acquisition-book",
                                    form.errors.book_id,
                                )}
                            >
                                {books.map((book) => (
                                    <option key={book.id} value={book.id}>
                                        {book.title}
                                    </option>
                                ))}
                            </Select>
                        </Field>
                    )}
                    <Field
                        id="acquisition-state"
                        label="Estado de incorporación"
                        error={form.errors.status}
                        hint={
                            closed
                                ? "Este lote está cerrado. Puedes corregir sus metadatos; para otra adquisición, registra un lote nuevo."
                                : undefined
                        }
                    >
                        <Select
                            id="acquisition-state"
                            disabled={closed}
                            value={form.data.status}
                            onChange={(e) =>
                                form.setData(
                                    "status",
                                    e.target.value as AcquisitionStatus,
                                )
                            }
                            {...fieldA11y(
                                "acquisition-state",
                                form.errors.status,
                                closed,
                            )}
                        >
                            {Object.entries(acquisitionStatuses).map(
                                ([value, label]) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                ),
                            )}
                        </Select>
                    </Field>
                    {(
                        [
                            [
                                "publication_on",
                                "Fecha de publicación editorial",
                            ],
                            ["expected_on", "Fecha de llegada estimada"],
                            ["incorporated_on", "Fecha de incorporación real"],
                        ] as const
                    ).map(([key, label]) => (
                        <Field
                            key={key}
                            id={`acquisition-${key}`}
                            label={label}
                            error={form.errors[key]}
                        >
                            <Input
                                id={`acquisition-${key}`}
                                type="date"
                                value={form.data[key]}
                                onChange={(e) =>
                                    form.setData(key, e.target.value)
                                }
                                {...fieldA11y(
                                    `acquisition-${key}`,
                                    form.errors[key],
                                )}
                            />
                        </Field>
                    ))}
                    <label className="checkbox-row">
                        <input
                            type="checkbox"
                            checked={form.data.is_fictional}
                            onChange={(e) =>
                                form.setData("is_fictional", e.target.checked)
                            }
                        />
                        Datos ficticios de demostración
                    </label>
                    <Field
                        id="acquisition-source"
                        label="Fuente pública (HTTPS, opcional)"
                        error={form.errors.source_url}
                    >
                        <Input
                            id="acquisition-source"
                            type="url"
                            value={form.data.source_url}
                            maxLength={500}
                            onChange={(e) =>
                                form.setData("source_url", e.target.value)
                            }
                            {...fieldA11y(
                                "acquisition-source",
                                form.errors.source_url,
                            )}
                        />
                    </Field>
                    <Field
                        id="acquisition-note"
                        label="Nota pública"
                        error={form.errors.public_note}
                        hint="Se mostrará en Novedades. No incluyas información privada."
                    >
                        <Textarea
                            id="acquisition-note"
                            rows={3}
                            maxLength={1000}
                            value={form.data.public_note}
                            onChange={(e) =>
                                form.setData("public_note", e.target.value)
                            }
                            {...fieldA11y(
                                "acquisition-note",
                                form.errors.public_note,
                                true,
                            )}
                        />
                    </Field>
                    <div className="dialog-actions">
                        <Button
                            type="button"
                            variant="ghost"
                            disabled={form.processing}
                            onClick={() => setOpen(false)}
                        >
                            Cancelar
                        </Button>
                        <SubmitButton
                            type="submit"
                            processing={form.processing}
                        >
                            Guardar incorporación
                        </SubmitButton>
                    </div>
                </form>
            </Dialog>
        </AppShell>
    );
}
