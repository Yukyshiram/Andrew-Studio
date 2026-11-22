import { Link, useForm } from "@inertiajs/react";
import { ArrowLeft, BookOpen, Check, Save } from "lucide-react";
import { AppShell } from "../../components/layout";
import { BookCover, coverColor } from "../../components/books";
import {
    Button,
    Card,
    Field,
    Input,
    Select,
    Textarea,
    SubmitButton,
    fieldA11y,
} from "../../components/ui";
import type { Book } from "../../types";
const colors = [
    { value: "olive", label: "Oliva" },
    { value: "terracotta", label: "Terracota" },
    { value: "blue", label: "Azul tinta" },
    { value: "amber", label: "Ocre" },
    { value: "purple", label: "Ciruela" },
    { value: "rose", label: "Rosa" },
];
export default function BookForm({
    book,
    categories,
}: {
    book: Book | null;
    categories: string[];
}) {
    const form = useForm({
        title: book?.title ?? "",
        author: book?.author ?? "",
        publisher: book?.publisher ?? "",
        publication_year: book?.publication_year ?? "",
        description: book?.description ?? "",
        category: book?.category ?? "General",
        cover_color: book?.cover_color ?? "olive",
    });
    function submit(e: React.FormEvent) {
        e.preventDefault();
        if (book) form.put(`/manage/books/${book.id}`);
        else form.post("/manage/books");
    }
    return (
        <AppShell
            title={book ? "Editar ficha" : "Nueva ficha"}
            eyebrow={book ? "EDITAR FICHA" : "INCORPORAR LIBRO"}
        >
            <Link href="/manage/books" className="text-link back-link">
                <ArrowLeft size={16} />
                Volver a gestión
            </Link>
            <form onSubmit={submit} className="book-form-layout">
                <div className="form-main">
                    <Card>
                        <div className="form-section-heading">
                            <BookOpen size={21} aria-hidden="true" />
                            <div>
                                <h2>Los datos de la obra</h2>
                                <p>
                                    Los campos con asterisco son obligatorios.
                                </p>
                            </div>
                        </div>
                        <div className="form-grid">
                            <Field
                                label="Título de la obra *"
                                id="title"
                                error={form.errors.title}
                                className="span-2"
                            >
                                <Input
                                    id="title"
                                    value={form.data.title}
                                    onChange={(e) =>
                                        form.setData("title", e.target.value)
                                    }
                                    required
                                    maxLength={255}
                                    autoFocus
                                    {...fieldA11y("title", form.errors.title)}
                                    placeholder="El comienzo de una gran idea"
                                />
                            </Field>
                            <Field
                                label="Autor *"
                                id="author"
                                error={form.errors.author}
                            >
                                <Input
                                    id="author"
                                    value={form.data.author}
                                    onChange={(e) =>
                                        form.setData("author", e.target.value)
                                    }
                                    required
                                    maxLength={255}
                                    {...fieldA11y("author", form.errors.author)}
                                />
                            </Field>
                            <Field
                                label="Editorial *"
                                id="publisher"
                                error={form.errors.publisher}
                            >
                                <Input
                                    id="publisher"
                                    required
                                    value={form.data.publisher}
                                    onChange={(e) =>
                                        form.setData(
                                            "publisher",
                                            e.target.value,
                                        )
                                    }
                                    maxLength={255}
                                    {...fieldA11y(
                                        "publisher",
                                        form.errors.publisher,
                                    )}
                                />
                            </Field>
                            <Field
                                label="Año de publicación *"
                                id="publication_year"
                                error={form.errors.publication_year}
                                hint="También puedes conservar rangos o fechas históricas."
                            >
                                <Input
                                    id="publication_year"
                                    required
                                    value={form.data.publication_year}
                                    onChange={(e) =>
                                        form.setData(
                                            "publication_year",
                                            e.target.value,
                                        )
                                    }
                                    maxLength={50}
                                    {...fieldA11y(
                                        "publication_year",
                                        form.errors.publication_year,
                                        true,
                                    )}
                                    placeholder="2024, 1990–1995…"
                                />
                            </Field>
                            <Field
                                label="Categoría *"
                                id="category"
                                error={form.errors.category}
                            >
                                <Select
                                    id="category"
                                    value={form.data.category}
                                    onChange={(e) =>
                                        form.setData("category", e.target.value)
                                    }
                                    required
                                    {...fieldA11y(
                                        "category",
                                        form.errors.category,
                                    )}
                                >
                                    {categories.map((category) => (
                                        <option value={category} key={category}>
                                            {category}
                                        </option>
                                    ))}
                                </Select>
                            </Field>
                            <Field
                                label="Descripción"
                                id="description"
                                error={form.errors.description}
                                className="span-2"
                            >
                                <Textarea
                                    id="description"
                                    value={form.data.description}
                                    onChange={(e) =>
                                        form.setData(
                                            "description",
                                            e.target.value,
                                        )
                                    }
                                    maxLength={10000}
                                    rows={7}
                                    {...fieldA11y(
                                        "description",
                                        form.errors.description,
                                    )}
                                    placeholder="¿Qué encontrará el lector entre estas páginas?"
                                />
                            </Field>
                        </div>
                    </Card>
                    <Card>
                        <div className="form-section-heading">
                            <BookOpen size={21} aria-hidden="true" />
                            <div>
                                <h2>Una identidad para su portada</h2>
                                <p>Elige el tono que acompañará al título.</p>
                            </div>
                        </div>
                        <fieldset className="color-picker">
                            <legend className="sr-only">
                                Color de portada
                            </legend>
                            {colors.map((color) => (
                                <label
                                    key={color.value}
                                    className="color-option"
                                >
                                    <input
                                        type="radio"
                                        name="cover-color"
                                        value={color.value}
                                        checked={
                                            form.data.cover_color ===
                                            color.value
                                        }
                                        onChange={() =>
                                            form.setData(
                                                "cover_color",
                                                color.value,
                                            )
                                        }
                                    />
                                    <span
                                        className="color-swatch"
                                        style={{
                                            backgroundColor: coverColor(
                                                color.value,
                                            ),
                                        }}
                                    >
                                        {form.data.cover_color ===
                                            color.value && (
                                            <Check
                                                size={21}
                                                aria-hidden="true"
                                            />
                                        )}
                                    </span>
                                    <span>{color.label}</span>
                                </label>
                            ))}
                        </fieldset>
                        {form.errors.cover_color && (
                            <p className="field-error" role="alert">
                                {form.errors.cover_color}
                            </p>
                        )}
                    </Card>
                    <div className="form-bottom">
                        <p>
                            Una buena ficha hace más fácil el próximo
                            descubrimiento.
                        </p>
                        <div>
                            <Button asChild variant="secondary">
                                <Link href="/manage/books">Cancelar</Link>
                            </Button>
                            <SubmitButton processing={form.processing}>
                                <Save size={17} />
                                {book ? "Guardar cambios" : "Incorporar libro"}
                            </SubmitButton>
                        </div>
                    </div>
                </div>
                <aside className="form-preview">
                    <p className="eyebrow">ASÍ SE VERÁ EN LA COLECCIÓN</p>
                    <div className="preview-stage">
                        <BookCover
                            book={{
                                title:
                                    form.data.title ||
                                    "Tu próxima gran historia",
                                author: form.data.author || "Nombre del autor",
                                cover_color: form.data.cover_color,
                            }}
                        />
                    </div>
                    <BadgePreview category={form.data.category} />
                    <p className="preview-note">
                        La portada se compone con los datos de tu ficha. Sin
                        imágenes externas.
                    </p>
                </aside>
            </form>
        </AppShell>
    );
}
function BadgePreview({ category }: { category: string }) {
    return <span className="badge">{category || "General"}</span>;
}
