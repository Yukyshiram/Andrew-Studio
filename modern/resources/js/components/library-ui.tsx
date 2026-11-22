import { Link, useForm } from "@inertiajs/react";
import { Badge, Field, Input, Notice, SubmitButton } from "./ui";
import type { Book } from "../types";
export { libraryDate } from "../library-format";

export function LibraryBookTitle({
    book,
}: {
    book: Pick<Book, "id" | "title" | "deleted_at">;
}) {
    return book.deleted_at ? (
        <span>{book.title}</span>
    ) : (
        <Link href={`/catalog/${book.id}`}>{book.title}</Link>
    );
}

const states: Record<string, string> = {
    available: "Disponible",
    held: "Preparado para recogida",
    loaned: "Prestado",
    repair: "En reparación",
    lost: "Extraviado",
    withdrawn: "Retirado",
    good: "Buen estado",
    worn: "Desgaste de uso",
    damaged: "Dañado",
    active: "Activa",
    suspended: "Suspendida",
    pending: "Pendiente de validación",
    waiting: "En lista de espera",
    ready: "Listo para recoger",
    fulfilled: "Entregado",
    cancelled: "Cancelada",
    rejected: "Rechazada",
    expired: "Vencida",
    returned: "Devuelto",
    overdue: "Préstamo vencido",
    loan_active: "Préstamo activo",
};
export function LibraryStatus({ value }: { value: string }) {
    return (
        <Badge className={`library-status library-status-${value}`}>
            {states[value] ?? value}
        </Badge>
    );
}
export function LibrarySearch({
    q,
    action,
    hint,
}: {
    q: string;
    action: string;
    hint: string;
}) {
    const form = useForm({ q });
    return (
        <form
            className="library-search"
            onSubmit={(event) => {
                event.preventDefault();
                form.get(action, { preserveState: true, preserveScroll: true });
            }}
        >
            <Field id="library-search" label="Buscar" hint={hint}>
                <Input
                    id="library-search"
                    type="search"
                    maxLength={80}
                    value={form.data.q}
                    onChange={(event) => form.setData("q", event.target.value)}
                />
            </Field>
            <SubmitButton processing={form.processing} variant="secondary">
                Buscar
            </SubmitButton>
        </form>
    );
}
export function LibraryTabs({
    items,
    current,
}: {
    items: { key: string; label: string; href: string }[];
    current: string;
}) {
    return (
        <nav className="library-tabs" aria-label="Secciones de biblioteca">
            {items.map((item) => (
                <Link
                    key={item.key}
                    href={item.href}
                    aria-current={current === item.key ? "page" : undefined}
                >
                    {item.label}
                </Link>
            ))}
        </nav>
    );
}
export function LibraryErrors({
    errors,
}: {
    errors: Record<string, string | undefined>;
}) {
    const messages = [...new Set(Object.values(errors).filter(Boolean))];
    return messages.length ? (
        <Notice kind="error">
            {messages.map((message) => (
                <p key={message}>{message}</p>
            ))}
        </Notice>
    ) : null;
}
