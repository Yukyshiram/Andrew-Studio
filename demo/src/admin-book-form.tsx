import { useState, type FormEvent } from "react";
import {
  Button,
  Field,
  Input,
  Select,
  Textarea,
  fieldA11y,
} from "../../modern/resources/js/components/ui";
import type { Book } from "../../modern/resources/js/types";
import { demoCategories, demoColors } from "./collection";

export type BookDraft = Pick<
  Book,
  | "title"
  | "author"
  | "publisher"
  | "publication_year"
  | "category"
  | "cover_color"
  | "description"
>;
export const emptyBook: BookDraft = {
  title: "",
  author: "",
  publisher: "",
  publication_year: "",
  category: "Literatura",
  cover_color: "olive",
  description: "",
};

export function AdminBookForm({
  book,
  onSave,
  onCancel,
}: {
  book: BookDraft;
  onSave: (book: BookDraft) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(book);
  const [errors, setErrors] = useState<Record<string, string>>({});
  function submit(event: FormEvent) {
    event.preventDefault();
    const clean = {
      ...draft,
      title: draft.title.trim(),
      author: draft.author.trim(),
      publisher: draft.publisher.trim(),
      publication_year: draft.publication_year.trim(),
      description: draft.description.trim(),
    };
    const next: Record<string, string> = {};
    for (const [key, label] of [
      ["title", "el título"],
      ["author", "el autor"],
      ["publisher", "la editorial"],
      ["publication_year", "el año de publicación"],
    ] as const) {
      if (!clean[key]) next[key] = `Escribe ${label}.`;
      else if (clean[key].length > (key === "publication_year" ? 50 : 255))
        next[key] = "El texto supera la longitud permitida.";
    }
    if (!demoCategories.includes(clean.category))
      next.category = "Selecciona una categoría de la lista.";
    if (!Object.hasOwn(demoColors, clean.cover_color))
      next.cover_color = "Selecciona un color de la lista.";
    if (clean.description.length > 10000)
      next.description = "La descripción admite hasta 10 000 caracteres.";
    setErrors(next);
    if (Object.keys(next).length) {
      requestAnimationFrame(() =>
        document
          .querySelector<HTMLElement>('[role="dialog"] [aria-invalid="true"]')
          ?.focus(),
      );
      return;
    }
    onSave(clean);
  }
  return (
    <form onSubmit={submit} noValidate className="admin-book-form">
      <div className="admin-form-grid">
        {[
          { key: "title", label: "Título", wide: true },
          { key: "author", label: "Autor", wide: true },
          { key: "publisher", label: "Editorial" },
          { key: "publication_year", label: "Año de publicación" },
        ].map(({ key, label, wide }) => (
          <Field
            key={key}
            id={`edit-${key}`}
            label={label}
            error={errors[key]}
            className={wide ? "field-wide" : undefined}
          >
            <Input
              id={`edit-${key}`}
              value={draft[key as keyof BookDraft]}
              required
              maxLength={key === "publication_year" ? 50 : 255}
              onChange={(event) =>
                setDraft({ ...draft, [key]: event.target.value })
              }
              {...fieldA11y(`edit-${key}`, errors[key])}
            />
          </Field>
        ))}
        <Field id="edit-category" label="Categoría" error={errors.category}>
          <Select
            id="edit-category"
            value={draft.category}
            onChange={(event) =>
              setDraft({ ...draft, category: event.target.value })
            }
            {...fieldA11y("edit-category", errors.category)}
          >
            {demoCategories.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </Select>
        </Field>
        <Field
          id="edit-cover"
          label="Color de portada"
          error={errors.cover_color}
        >
          <Select
            id="edit-cover"
            value={draft.cover_color}
            onChange={(event) =>
              setDraft({ ...draft, cover_color: event.target.value })
            }
            {...fieldA11y("edit-cover", errors.cover_color)}
          >
            {Object.entries(demoColors).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          id="edit-description"
          label="Descripción"
          error={errors.description}
          className="field-wide"
        >
          <Textarea
            id="edit-description"
            value={draft.description}
            maxLength={10000}
            rows={3}
            onChange={(event) =>
              setDraft({ ...draft, description: event.target.value })
            }
            {...fieldA11y("edit-description", errors.description)}
          />
        </Field>
      </div>
      <div className="dialog-actions">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">Guardar en la demo</Button>
      </div>
    </form>
  );
}
