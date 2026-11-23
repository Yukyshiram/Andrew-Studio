import { useForm } from "@inertiajs/react";
import { LockKeyhole, Save, UserRound } from "lucide-react";
import { AppShell } from "../components/layout";
import {
    Badge,
    Card,
    Field,
    Input,
    PasswordInput,
    SubmitButton,
    Notice,
    fieldA11y,
} from "../components/ui";
import { roles, type User } from "../types";
export default function Profile({ user }: { user: User }) {
    const profile = useForm({
        name: user.name,
        email: user.email,
        current_password: "",
    });
    const password = useForm({
        current_password: "",
        password: "",
        password_confirmation: "",
    });
    return (
        <AppShell title="Tu espacio, a tu manera." eyebrow="MI PERFIL">
            <div className="profile-layout">
                <aside className="profile-card panel">
                    <span className="profile-avatar">
                        {user.name.slice(0, 1).toLocaleUpperCase("es")}
                    </span>
                    <h2>{user.name}</h2>
                    <p>{user.email}</p>
                    <Badge>{roles[user.role]}</Badge>
                </aside>
                <div className="profile-forms">
                    <Card>
                        <div className="form-section-heading">
                            <UserRound size={21} />
                            <div>
                                <h2>Así te conocemos</h2>
                                <p>Actualiza los datos de tu cuenta.</p>
                            </div>
                        </div>
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                profile.patch("/profile", {
                                    onSuccess: () =>
                                        profile.reset("current_password"),
                                });
                            }}
                            className="form-stack"
                        >
                            <Notice>
                                {profile.recentlySuccessful
                                    ? "Tus datos se han actualizado."
                                    : null}
                            </Notice>
                            <Field
                                label="Nombre"
                                id="profile-name"
                                error={profile.errors.name}
                            >
                                <Input
                                    id="profile-name"
                                    autoComplete="name"
                                    required
                                    maxLength={100}
                                    value={profile.data.name}
                                    onChange={(e) =>
                                        profile.setData("name", e.target.value)
                                    }
                                    {...fieldA11y(
                                        "profile-name",
                                        profile.errors.name,
                                    )}
                                />
                            </Field>
                            <Field
                                label="Correo electrónico"
                                id="profile-email"
                                error={profile.errors.email}
                            >
                                <Input
                                    id="profile-email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    maxLength={191}
                                    value={profile.data.email}
                                    onChange={(e) =>
                                        profile.setData("email", e.target.value)
                                    }
                                    {...fieldA11y(
                                        "profile-email",
                                        profile.errors.email,
                                    )}
                                />
                            </Field>
                            <Field
                                label="Contraseña actual para cambiar el correo"
                                id="profile-current-password"
                                error={profile.errors.current_password}
                                hint="Solo es necesaria si cambias tu correo electrónico."
                            >
                                <PasswordInput
                                    id="profile-current-password"
                                    autoComplete="current-password"
                                    value={profile.data.current_password}
                                    onChange={(e) =>
                                        profile.setData(
                                            "current_password",
                                            e.target.value,
                                        )
                                    }
                                    {...fieldA11y(
                                        "profile-current-password",
                                        profile.errors.current_password,
                                        true,
                                    )}
                                />
                            </Field>
                            <div className="form-submit-end">
                                <SubmitButton processing={profile.processing}>
                                    <Save size={16} />
                                    Guardar datos
                                </SubmitButton>
                            </div>
                        </form>
                    </Card>
                    <Card>
                        <div className="form-section-heading">
                            <LockKeyhole size={21} />
                            <div>
                                <h2>La llave de tu biblioteca</h2>
                                <p>Usa una contraseña que solo tú conozcas.</p>
                            </div>
                        </div>
                        <form
                            className="form-stack"
                            onSubmit={(e) => {
                                e.preventDefault();
                                password.put("/profile/password", {
                                    onSuccess: () => password.reset(),
                                });
                            }}
                        >
                            <Notice>
                                {password.recentlySuccessful
                                    ? "Tu contraseña se ha actualizado."
                                    : null}
                            </Notice>
                            <Field
                                label="Contraseña actual"
                                id="current-password"
                                error={password.errors.current_password}
                            >
                                <PasswordInput
                                    id="current-password"
                                    autoComplete="current-password"
                                    required
                                    value={password.data.current_password}
                                    onChange={(e) =>
                                        password.setData(
                                            "current_password",
                                            e.target.value,
                                        )
                                    }
                                    {...fieldA11y(
                                        "current-password",
                                        password.errors.current_password,
                                    )}
                                />
                            </Field>
                            <Field
                                label="Nueva contraseña"
                                id="new-password"
                                error={password.errors.password}
                                hint="Mínimo 12 caracteres, con mayúscula, minúscula y número. Máximo 72 bytes."
                            >
                                <PasswordInput
                                    id="new-password"
                                    autoComplete="new-password"
                                    required
                                    minLength={12}
                                    maxLength={72}
                                    value={password.data.password}
                                    onChange={(e) =>
                                        password.setData(
                                            "password",
                                            e.target.value,
                                        )
                                    }
                                    {...fieldA11y(
                                        "new-password",
                                        password.errors.password,
                                        true,
                                    )}
                                />
                            </Field>
                            <Field
                                label="Repite la nueva contraseña"
                                id="confirm-password"
                                error={password.errors.password_confirmation}
                            >
                                <PasswordInput
                                    id="confirm-password"
                                    autoComplete="new-password"
                                    required
                                    minLength={12}
                                    maxLength={72}
                                    value={password.data.password_confirmation}
                                    onChange={(e) =>
                                        password.setData(
                                            "password_confirmation",
                                            e.target.value,
                                        )
                                    }
                                    {...fieldA11y(
                                        "confirm-password",
                                        password.errors.password_confirmation,
                                    )}
                                />
                            </Field>
                            <div className="form-submit-end">
                                <SubmitButton processing={password.processing}>
                                    Actualizar contraseña
                                </SubmitButton>
                            </div>
                        </form>
                    </Card>
                </div>
            </div>
        </AppShell>
    );
}
