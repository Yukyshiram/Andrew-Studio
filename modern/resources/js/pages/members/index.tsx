import { useForm } from "@inertiajs/react";
import { useState } from "react";
import { AppShell } from "../../components/layout";
import { PaginationLinks } from "../../components/books";
import {
    LibrarySearch,
    LibraryStatus,
    libraryDate,
} from "../../components/library-ui";
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
import type { Member } from "../../library-types";
import type { Pagination, User } from "../../types";

export default function Members({
    members,
    accounts,
    filters,
}: {
    members: Pagination<Member>;
    accounts: Pick<User, "id" | "name" | "email">[];
    filters: { q: string };
}) {
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Member | null>(null);
    const form = useForm({
        user_id: accounts[0]?.id ?? 0,
        status: "active",
        phone: "",
        expires_on: "",
        loan_limit: "",
    });
    function edit(member: Member | null) {
        setEditing(member);
        form.clearErrors();
        form.setData({
            user_id: member?.user_id ?? accounts[0]?.id ?? 0,
            status: member?.status ?? "active",
            phone: member?.phone ?? "",
            expires_on: member?.expires_on?.slice(0, 10) ?? "",
            loan_limit: member?.loan_limit?.toString() ?? "",
        });
        setOpen(true);
    }
    return (
        <AppShell title="Socios de la biblioteca" eyebrow="ATENCIÓN A LECTORES">
            <div className="section-heading">
                <p>
                    El estado y la vigencia regulan los derechos de préstamo;
                    cambiar una membresía no modifica el rol de la cuenta.
                </p>
                <Button onClick={() => edit(null)} disabled={!accounts.length}>
                    Registrar socio
                </Button>
            </div>
            <LibrarySearch
                q={filters.q}
                action="/manage/members"
                hint="Número de socio, nombre o correo. La búsqueda también localiza cuentas para dar de alta."
            />
            {members.data.length ? (
                <div
                    className="table-wrap"
                    tabIndex={0}
                    role="region"
                    aria-label="Socios, tabla desplazable"
                >
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Socio</th>
                                <th>Contacto</th>
                                <th>Membresía</th>
                                <th>Vigencia</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {members.data.map((member) => (
                                <tr key={member.id}>
                                    <td>
                                        <strong>{member.user.name}</strong>
                                        <p>{member.card_number}</p>
                                    </td>
                                    <td>
                                        {member.user.email}
                                        <p>{member.phone}</p>
                                    </td>
                                    <td>
                                        <LibraryStatus value={member.status} />
                                        {member.user.deleted_at && (
                                            <p>Cuenta desactivada</p>
                                        )}
                                    </td>
                                    <td>
                                        {member.expires_on
                                            ? libraryDate(member.expires_on)
                                            : "Sin vencimiento"}
                                    </td>
                                    <td>
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={() => edit(member)}
                                            aria-label={`Editar membresía de ${member.user.name}`}
                                        >
                                            Editar membresía
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <EmptyState title="Sin socios para esta búsqueda">
                    Registra una cuenta existente o ajusta el término de
                    búsqueda.
                </EmptyState>
            )}
            <PaginationLinks pagination={members} />
            <Dialog
                open={open}
                onOpenChange={setOpen}
                title={editing ? "Editar membresía" : "Registrar socio"}
                description="No se requieren documentos oficiales. El contacto solo es visible para personal autorizado."
            >
                <form
                    className="library-form"
                    onSubmit={(event) => {
                        event.preventDefault();
                        form.transform(({ user_id, ...rest }) =>
                            editing ? rest : { user_id, ...rest },
                        );
                        const options = {
                            onSuccess: () => setOpen(false),
                            preserveScroll: true,
                        };
                        if (editing)
                            form.put(`/manage/members/${editing.id}`, options);
                        else form.post("/manage/members", options);
                    }}
                >
                    {!editing && (
                        <Field
                            id="member-account"
                            label="Cuenta registrada"
                            error={form.errors.user_id}
                            hint="Hasta 50 coincidencias. Usa la búsqueda por nombre o correo para localizar otras cuentas."
                        >
                            <Select
                                id="member-account"
                                value={form.data.user_id}
                                onChange={(event) =>
                                    form.setData(
                                        "user_id",
                                        Number(event.target.value),
                                    )
                                }
                                {...fieldA11y(
                                    "member-account",
                                    form.errors.user_id,
                                )}
                            >
                                {accounts.map((user) => (
                                    <option key={user.id} value={user.id}>
                                        {user.name} · {user.email}
                                    </option>
                                ))}
                            </Select>
                        </Field>
                    )}
                    <Field
                        id="member-status"
                        label="Estado de membresía"
                        error={form.errors.status}
                    >
                        <Select
                            id="member-status"
                            value={form.data.status}
                            onChange={(event) =>
                                form.setData("status", event.target.value)
                            }
                            {...fieldA11y("member-status", form.errors.status)}
                        >
                            <option value="active">Activa</option>
                            <option value="suspended">Suspendida</option>
                        </Select>
                    </Field>
                    {(
                        [
                            ["phone", "Teléfono (opcional)", "tel"],
                            ["expires_on", "Vigente hasta (opcional)", "date"],
                            [
                                "loan_limit",
                                "Límite individual (vacío: política general)",
                                "number",
                            ],
                        ] as const
                    ).map(([key, label, type]) => (
                        <Field
                            key={key}
                            id={`member-${key}`}
                            label={label}
                            error={form.errors[key]}
                        >
                            <Input
                                id={`member-${key}`}
                                type={type}
                                min={type === "number" ? 0 : undefined}
                                max={type === "number" ? 100 : undefined}
                                maxLength={key === "phone" ? 40 : undefined}
                                value={form.data[key]}
                                onChange={(event) =>
                                    form.setData(key, event.target.value)
                                }
                                {...fieldA11y(
                                    `member-${key}`,
                                    form.errors[key],
                                )}
                            />
                        </Field>
                    ))}
                    <div className="dialog-actions">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setOpen(false)}
                        >
                            Cancelar
                        </Button>
                        <SubmitButton processing={form.processing}>
                            Guardar membresía
                        </SubmitButton>
                    </div>
                </form>
            </Dialog>
        </AppShell>
    );
}
