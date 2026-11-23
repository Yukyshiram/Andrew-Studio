import { useForm } from "@inertiajs/react";

import { AuthLayout } from "../../components/layout";
import {
    Field,
    Input,
    PasswordInput,
    SubmitButton,
    fieldA11y,
} from "../../components/ui";
export default function ResetPassword({
    token,
    email,
}: {
    token: string;
    email: string;
}) {
    const form = useForm({
        token,
        email: email ?? "",
        password: "",
        password_confirmation: "",
    });
    return (
        <AuthLayout
            title="Restablecer contraseña"
            description="Elige una nueva contraseña para volver a tu biblioteca."
        >
            <form
                className="form-stack"
                onSubmit={(e) => {
                    e.preventDefault();
                    form.post("/reset-password", {
                        onFinish: () =>
                            form.reset("password", "password_confirmation"),
                    });
                }}
            >
                <Field
                    label="Correo electrónico"
                    id="email"
                    error={form.errors.email}
                >
                    <Input
                        id="email"
                        type="email"
                        autoComplete="email"
                        value={form.data.email}
                        onChange={(e) => form.setData("email", e.target.value)}
                        required
                        {...fieldA11y("email", form.errors.email)}
                    />
                </Field>
                <Field
                    label="Nueva contraseña"
                    id="password"
                    error={form.errors.password}
                    hint="Mínimo 12 caracteres, con mayúscula, minúscula y número. Máximo 72 bytes."
                >
                    <PasswordInput
                        id="password"
                        autoComplete="new-password"
                        autoFocus
                        required
                        minLength={12}
                        maxLength={72}
                        value={form.data.password}
                        onChange={(e) =>
                            form.setData("password", e.target.value)
                        }
                        {...fieldA11y("password", form.errors.password, true)}
                    />
                </Field>
                <Field
                    label="Repite la nueva contraseña"
                    id="password_confirmation"
                    error={form.errors.password_confirmation}
                >
                    <PasswordInput
                        id="password_confirmation"
                        autoComplete="new-password"
                        required
                        minLength={12}
                        maxLength={72}
                        value={form.data.password_confirmation}
                        onChange={(e) =>
                            form.setData(
                                "password_confirmation",
                                e.target.value,
                            )
                        }
                        {...fieldA11y(
                            "password_confirmation",
                            form.errors.password_confirmation,
                        )}
                    />
                </Field>
                <SubmitButton
                    processing={form.processing}
                    className="full-width"
                >
                    Guardar nueva contraseña
                </SubmitButton>
            </form>
        </AuthLayout>
    );
}
