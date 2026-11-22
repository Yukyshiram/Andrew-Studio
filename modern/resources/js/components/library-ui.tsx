import { useForm } from "@inertiajs/react";
import { Badge, Field, Input, SubmitButton } from "./ui";

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
};
export function LibraryStatus({ value }: { value: string }) {
    return <Badge>{states[value] ?? value}</Badge>;
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
export function libraryDate(value: string | null) {
    if (!value) return "Sin fecha";
    const iso = value.slice(0, 10);
    return new Intl.DateTimeFormat("es-MX", {
        dateStyle: "medium",
        timeZone: "UTC",
    }).format(new Date(`${iso}T12:00:00Z`));
}
