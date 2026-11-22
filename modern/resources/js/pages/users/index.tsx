import { useForm, usePage } from "@inertiajs/react";
import { useState } from "react";
import { Plus, Search, Shield, UserRound, UserRoundMinus } from "lucide-react";
import { AppShell } from "../../components/layout";
import { PaginationLinks } from "../../components/books";
import {
    Badge,
    Button,
    Dialog,
    EmptyState,
    Field,
    Input,
    Notice,
    PasswordInput,
    Select,
    SubmitButton,
    fieldA11y,
} from "../../components/ui";
import {
    roles,
    dateLabel,
    type Pagination,
    type Role,
    type SharedProps,
    type User,
} from "../../types";
import { useFilters } from "../../hooks/use-filters";
export default function UsersIndex({
    users,
    filters: serverFilters,
}: {
    users: Pagination<User>;
    filters: { q?: string };
}) {
    const { auth, errors: sharedErrors } = usePage<SharedProps>().props;
    const { filters, change } = useFilters("/manage/users", {
        q: serverFilters.q ?? "",
    });
    const [creating, setCreating] = useState(false);
    const [editing, setEditing] = useState<User | null>(null);
    const [deactivating, setDeactivating] = useState<User | null>(null);
    const create = useForm({
        name: "",
        email: "",
        password: "",
        password_confirmation: "",
        role: "reader" as Role,
    });
    const edit = useForm({ role: "reader" as Role });
    const deactivate = useForm({});
    return (
        <AppShell
            title="Personas y roles"
            eyebrow="PERSONAS Y ROLES"
            actions={
                <Button onClick={() => setCreating(true)}>
                    <Plus size={18} />
                    Crear cuenta
                </Button>
            }
        >
            <p className="page-description">
                Da a cada persona el espacio que necesita para participar y
                cuidar la colección.
            </p>
            <div className="roles-explainer">
                <div>
                    <BookRole icon="reader" />
                    <span>
                        <strong>Lector</strong>
                        <small>Descubre y consulta la colección.</small>
                    </span>
                </div>
                <div>
                    <BookRole icon="librarian" />
                    <span>
                        <strong>Bibliotecario</strong>
                        <small>Organiza y mantiene las fichas.</small>
                    </span>
                </div>
                <div>
                    <BookRole icon="admin" />
                    <span>
                        <strong>Administrador</strong>
                        <small>Gestiona cuentas y supervisa cambios.</small>
                    </span>
                </div>
            </div>
            <div className="catalog-toolbar">
                <div className="search-field">
                    <Search size={19} aria-hidden="true" />
                    <label htmlFor="user-search" className="sr-only">
                        Buscar personas por nombre o correo
                    </label>
                    <Input
                        id="user-search"
                        type="search"
                        value={filters.q}
                        onChange={(e) => change("q", e.target.value)}
                        placeholder="Buscar por nombre o correo…"
                    />
                </div>
                <span className="toolbar-total">
                    {users.total} {users.total === 1 ? "persona" : "personas"}
                </span>
            </div>
            <Notice kind="error">{sharedErrors.user}</Notice>
            {users.data.length ? (
                <div
                    className="table-wrap"
                    tabIndex={0}
                    role="region"
                    aria-label="Personas y roles, tabla desplazable"
                >
                    <table className="data-table">
                        <caption className="sr-only">
                            Personas y permisos de la biblioteca
                        </caption>
                        <thead>
                            <tr>
                                <th>Persona</th>
                                <th>Rol</th>
                                <th>Estado</th>
                                <th>Fecha de alta</th>
                                <th>
                                    <span className="sr-only">Acciones</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.data.map((user) => (
                                <tr key={user.id}>
                                    <td>
                                        <div className="table-person">
                                            <span className="avatar">
                                                {user.name
                                                    .slice(0, 1)
                                                    .toLocaleUpperCase("es")}
                                            </span>
                                            <span>
                                                <strong>
                                                    {user.name}
                                                    {user.id ===
                                                        auth.user?.id && (
                                                        <small className="you-tag">
                                                            Tú
                                                        </small>
                                                    )}
                                                </strong>
                                                <small>{user.email}</small>
                                            </span>
                                        </div>
                                    </td>
                                    <td>
                                        <Badge className={`role-${user.role}`}>
                                            {roles[user.role]}
                                        </Badge>
                                    </td>
                                    <td>
                                        <span
                                            className={
                                                user.deleted_at
                                                    ? "muted"
                                                    : "status-active"
                                            }
                                        >
                                            {user.deleted_at
                                                ? "Desactivada"
                                                : "Activa"}
                                        </span>
                                    </td>
                                    <td className="muted">
                                        {user.created_at
                                            ? dateLabel(user.created_at)
                                            : "—"}
                                    </td>
                                    <td>
                                        <div className="row-actions">
                                            {user.id !== auth.user?.id &&
                                                !user.deleted_at && (
                                                    <>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => {
                                                                edit.setData(
                                                                    "role",
                                                                    user.role,
                                                                );
                                                                edit.clearErrors();
                                                                setEditing(
                                                                    user,
                                                                );
                                                            }}
                                                        >
                                                            Cambiar rol
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            aria-label={`Desactivar cuenta de ${user.name}`}
                                                            onClick={() => {
                                                                deactivate.clearErrors();
                                                                setDeactivating(
                                                                    user,
                                                                );
                                                            }}
                                                        >
                                                            <UserRoundMinus
                                                                size={17}
                                                            />
                                                        </Button>
                                                    </>
                                                )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <EmptyState title="No encontramos a esa persona.">
                    Prueba con otro nombre o correo para continuar la búsqueda.
                </EmptyState>
            )}
            <PaginationLinks pagination={users} />
            <Dialog
                open={creating}
                onOpenChange={(open) => {
                    if (!create.processing) {
                        setCreating(open);
                        if (!open) {
                            create.reset();
                            create.clearErrors();
                        }
                    }
                }}
                title="Un nuevo lugar en la biblioteca"
                description="Crea una cuenta y asigna el acceso adecuado. Comparte las credenciales de forma privada."
            >
                <form
                    className="form-stack"
                    onSubmit={(e) => {
                        e.preventDefault();
                        create.post("/manage/users", {
                            onSuccess: () => {
                                setCreating(false);
                                create.reset();
                            },
                        });
                    }}
                >
                    <Field
                        id="new-user-name"
                        label="Nombre"
                        error={create.errors.name}
                    >
                        <Input
                            id="new-user-name"
                            autoComplete="off"
                            required
                            maxLength={100}
                            value={create.data.name}
                            onChange={(e) =>
                                create.setData("name", e.target.value)
                            }
                            {...fieldA11y("new-user-name", create.errors.name)}
                        />
                    </Field>
                    <Field
                        id="new-user-email"
                        label="Correo electrónico"
                        error={create.errors.email}
                    >
                        <Input
                            id="new-user-email"
                            type="email"
                            autoComplete="off"
                            required
                            maxLength={191}
                            value={create.data.email}
                            onChange={(e) =>
                                create.setData("email", e.target.value)
                            }
                            {...fieldA11y(
                                "new-user-email",
                                create.errors.email,
                            )}
                        />
                    </Field>
                    <Field
                        id="new-user-role"
                        label="Rol"
                        error={create.errors.role}
                    >
                        <Select
                            id="new-user-role"
                            value={create.data.role}
                            onChange={(e) =>
                                create.setData("role", e.target.value as Role)
                            }
                            {...fieldA11y("new-user-role", create.errors.role)}
                        >
                            {Object.entries(roles).map(([role, label]) => (
                                <option key={role} value={role}>
                                    {label}
                                </option>
                            ))}
                        </Select>
                    </Field>
                    <Field
                        id="new-user-password"
                        label="Contraseña inicial"
                        error={create.errors.password}
                        hint="Mínimo 12 caracteres, con mayúscula, minúscula y número. Máximo 72 bytes."
                    >
                        <PasswordInput
                            id="new-user-password"
                            autoComplete="new-password"
                            required
                            minLength={12}
                            maxLength={72}
                            value={create.data.password}
                            onChange={(e) =>
                                create.setData("password", e.target.value)
                            }
                            {...fieldA11y(
                                "new-user-password",
                                create.errors.password,
                                true,
                            )}
                        />
                    </Field>
                    <Field
                        id="new-user-confirm"
                        label="Repite la contraseña"
                        error={create.errors.password_confirmation}
                    >
                        <PasswordInput
                            id="new-user-confirm"
                            autoComplete="new-password"
                            required
                            minLength={12}
                            maxLength={72}
                            value={create.data.password_confirmation}
                            onChange={(e) =>
                                create.setData(
                                    "password_confirmation",
                                    e.target.value,
                                )
                            }
                            {...fieldA11y(
                                "new-user-confirm",
                                create.errors.password_confirmation,
                            )}
                        />
                    </Field>
                    <div className="dialog-actions">
                        <Button
                            type="button"
                            variant="secondary"
                            disabled={create.processing}
                            onClick={() => setCreating(false)}
                        >
                            Cancelar
                        </Button>
                        <SubmitButton processing={create.processing}>
                            Crear cuenta
                        </SubmitButton>
                    </div>
                </form>
            </Dialog>
            <Dialog
                open={!!editing}
                onOpenChange={(open) => {
                    if (!open && !edit.processing) setEditing(null);
                }}
                title="Un rol para cada contribución"
                description={`Actualiza los permisos de ${editing?.name ?? "esta persona"}. Los cambios se aplican al guardar.`}
            >
                <form
                    className="form-stack"
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (editing)
                            edit.patch(`/manage/users/${editing.id}`, {
                                preserveScroll: true,
                                onSuccess: () => setEditing(null),
                            });
                    }}
                >
                    <Field
                        id="edit-role"
                        label="Rol de la cuenta"
                        error={edit.errors.role}
                    >
                        <Select
                            id="edit-role"
                            value={edit.data.role}
                            onChange={(e) =>
                                edit.setData("role", e.target.value as Role)
                            }
                            {...fieldA11y("edit-role", edit.errors.role)}
                        >
                            {Object.entries(roles).map(([role, label]) => (
                                <option key={role} value={role}>
                                    {label}
                                </option>
                            ))}
                        </Select>
                    </Field>
                    <div className="dialog-actions">
                        <Button
                            type="button"
                            variant="secondary"
                            disabled={edit.processing}
                            onClick={() => setEditing(null)}
                        >
                            Cancelar
                        </Button>
                        <SubmitButton processing={edit.processing}>
                            Guardar rol
                        </SubmitButton>
                    </div>
                </form>
            </Dialog>
            <Dialog
                open={!!deactivating}
                onOpenChange={(open) => {
                    if (!open && !deactivate.processing) setDeactivating(null);
                }}
                title="Desactivar esta cuenta"
                description={`${deactivating?.name ?? "Esta persona"} ya no podrá iniciar sesión. Sus acciones anteriores seguirán en el historial.`}
            >
                <Notice kind="error">
                    {Object.values(deactivate.errors).length
                        ? String(Object.values(deactivate.errors)[0])
                        : null}
                </Notice>
                <div className="dialog-actions">
                    <Button
                        variant="secondary"
                        disabled={deactivate.processing}
                        onClick={() => setDeactivating(null)}
                    >
                        Cancelar
                    </Button>
                    <SubmitButton
                        variant="destructive"
                        processing={deactivate.processing}
                        onClick={() => {
                            if (deactivating)
                                deactivate.delete(
                                    `/manage/users/${deactivating.id}`,
                                    {
                                        preserveScroll: true,
                                        onSuccess: () => setDeactivating(null),
                                    },
                                );
                        }}
                    >
                        Desactivar cuenta
                    </SubmitButton>
                </div>
            </Dialog>
        </AppShell>
    );
}
function BookRole({ icon }: { icon: Role }) {
    return (
        <span className="role-icon">
            {icon === "admin" ? <Shield size={20} /> : <UserRound size={20} />}
        </span>
    );
}
