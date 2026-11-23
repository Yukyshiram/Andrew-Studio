import { useForm } from "@inertiajs/react";
import { useState } from "react";
import { AppShell } from "../../components/layout";
import { PaginationLinks } from "../../components/books";
import { LibrarySearch, LibraryStatus } from "../../components/library-ui";
import {
    Button,
    Dialog,
    EmptyState,
    Field,
    Input,
    Select,
    SubmitButton,
    fieldA11y,
} from "../../components/ui";
import type { BookCopy } from "../../library-types";
import type { Book, Pagination } from "../../types";

export default function Inventory({
    copies,
    books,
    filters,
}: {
    copies: Pagination<BookCopy>;
    books: Pick<Book, "id" | "title">[];
    filters: { q: string };
}) {
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<BookCopy | null>(null);
    const form = useForm({
        book_id: books[0]?.id ?? 0,
        barcode: "",
        location: "",
        condition: "good",
        status: "available",
    });
    function edit(copy: BookCopy | null) {
        setEditing(copy);
        form.clearErrors();
        form.setData(
            copy
                ? {
                      book_id: copy.book_id,
                      barcode: copy.barcode,
                      location: copy.location,
                      condition: copy.condition,
                      status: copy.status,
                  }
                : {
                      book_id: books[0]?.id ?? 0,
                      barcode: "",
                      location: "",
                      condition: "good",
                      status: "available",
                  },
        );
        setOpen(true);
    }
    return (
        <AppShell title="Inventario de ejemplares" eyebrow="BIBLIOTECA">
            <div className="section-heading">
                <p>
                    Cada código identifica un ejemplar físico. Las fichas sin
                    ejemplares no tienen existencias disponibles.
                </p>
                <Button onClick={() => edit(null)} disabled={!books.length}>
                    Incorporar ejemplar
                </Button>
            </div>
            <LibrarySearch
                q={filters.q}
                action="/manage/inventory"
                hint="Busca un código o título. La búsqueda también filtra las fichas del formulario: hasta 200 coincidencias; precisa el título para localizar otras."
            />
            {copies.data.length ? (
                <div
                    className="table-wrap"
                    tabIndex={0}
                    role="region"
                    aria-label="Inventario, tabla desplazable"
                >
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Ejemplar</th>
                                <th>Ubicación</th>
                                <th>Condición</th>
                                <th>Circulación</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {copies.data.map((copy) => (
                                <tr key={copy.id}>
                                    <td>
                                        <strong>{copy.barcode}</strong>
                                        <p>{copy.book.title}</p>
                                    </td>
                                    <td>{copy.location}</td>
                                    <td>
                                        <LibraryStatus value={copy.condition} />
                                    </td>
                                    <td>
                                        <LibraryStatus value={copy.status} />
                                    </td>
                                    <td>
                                        {["held", "loaned"].includes(
                                            copy.status,
                                        ) ? (
                                            <span>
                                                Gestionar en circulación
                                            </span>
                                        ) : (
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                onClick={() => edit(copy)}
                                                aria-label={`Editar ${copy.barcode}`}
                                            >
                                                Editar
                                            </Button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <EmptyState title="Sin ejemplares">
                    Incorpora un ejemplar o ajusta la búsqueda.
                </EmptyState>
            )}
            <PaginationLinks pagination={copies} />
            <Dialog
                open={open}
                onOpenChange={setOpen}
                title={
                    editing
                        ? `Editar ${editing.barcode}`
                        : "Incorporar ejemplar"
                }
                description="Registra un código único, su ubicación y el estado físico comprobado."
            >
                <form
                    className="library-form"
                    onSubmit={(event) => {
                        event.preventDefault();
                        form.transform(({ book_id, ...rest }) =>
                            editing ? rest : { book_id, ...rest },
                        );
                        const options = {
                            onSuccess: () => setOpen(false),
                            preserveScroll: true,
                        };
                        if (editing)
                            form.put(
                                `/manage/inventory/${editing.id}`,
                                options,
                            );
                        else form.post("/manage/inventory", options);
                    }}
                >
                    {!editing && (
                        <Field
                            id="copy-book"
                            label="Ficha bibliográfica"
                            error={form.errors.book_id}
                        >
                            <Select
                                id="copy-book"
                                value={form.data.book_id}
                                onChange={(event) =>
                                    form.setData(
                                        "book_id",
                                        Number(event.target.value),
                                    )
                                }
                                {...fieldA11y("copy-book", form.errors.book_id)}
                            >
                                {books.map((book) => (
                                    <option key={book.id} value={book.id}>
                                        {book.title}
                                    </option>
                                ))}
                            </Select>
                        </Field>
                    )}
                    {(
                        [
                            ["barcode", "Código de barras", 80],
                            ["location", "Ubicación", 160],
                        ] as const
                    ).map(([key, label, max]) => (
                        <Field
                            key={key}
                            id={`copy-${key}`}
                            label={label}
                            error={form.errors[key]}
                        >
                            <Input
                                id={`copy-${key}`}
                                value={form.data[key]}
                                maxLength={max}
                                required
                                onChange={(event) =>
                                    form.setData(key, event.target.value)
                                }
                                {...fieldA11y(`copy-${key}`, form.errors[key])}
                            />
                        </Field>
                    ))}
                    <Field
                        id="copy-condition"
                        label="Condición física"
                        error={form.errors.condition}
                    >
                        <Select
                            id="copy-condition"
                            value={form.data.condition}
                            onChange={(event) =>
                                form.setData("condition", event.target.value)
                            }
                            {...fieldA11y(
                                "copy-condition",
                                form.errors.condition,
                            )}
                        >
                            <option value="good">Buen estado</option>
                            <option value="worn">Desgaste de uso</option>
                            <option value="damaged">Dañado</option>
                            <option value="lost">Extraviado</option>
                        </Select>
                    </Field>
                    <Field
                        id="copy-status"
                        label="Estado de inventario"
                        error={form.errors.status}
                    >
                        <Select
                            id="copy-status"
                            value={form.data.status}
                            onChange={(event) =>
                                form.setData("status", event.target.value)
                            }
                            {...fieldA11y("copy-status", form.errors.status)}
                        >
                            <option value="available">Disponible</option>
                            <option value="repair">En reparación</option>
                            <option value="lost">Extraviado</option>
                            <option value="withdrawn">Retirado</option>
                        </Select>
                    </Field>
                    <div className="dialog-actions">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setOpen(false)}
                        >
                            Cancelar
                        </Button>
                        <SubmitButton processing={form.processing}>
                            Guardar ejemplar
                        </SubmitButton>
                    </div>
                </form>
            </Dialog>
        </AppShell>
    );
}
