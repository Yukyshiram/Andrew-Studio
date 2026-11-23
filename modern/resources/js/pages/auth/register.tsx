import { Link, useForm } from "@inertiajs/react";

import { AuthLayout } from "../../components/layout";
import {
    Field,
    Input,
    PasswordInput,
    SubmitButton,
    fieldA11y,
} from "../../components/ui";
export default function Register() {
    const form = useForm({
        name: "",
        email: "",
        password: "",
        password_confirmation: "",
    });
    return (
        <AuthLayout
            title="Crear una cuenta"
            description="Regístrate para consultar tu perfil y acceder a tu biblioteca."
        >
            <form
                className="form-stack"
                onSubmit={(e) => {
                    e.preventDefault();
                    form.post("/register", {
                        onFinish: () =>
                            form.reset("password", "password_confirmation"),
                    });
                }}
            >
                <Field label="Tu nombre" id="name" error={form.errors.name}>
                    <Input
                        id="name"
                        autoComplete="name"
                        value={form.data.name}
                        onChange={(e) => form.setData("name", e.target.value)}
                        required
                        maxLength={100}
                        autoFocus
                        {...fieldA11y("name", form.errors.name)}
                        placeholder="¿Cómo te llamas?"
                    />
                </Field>
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
                        maxLength={191}
                        {...fieldA11y("email", form.errors.email)}
                        placeholder="tu@correo.com"
                    />
                </Field>
                <Field
                    label="Elige una contraseña"
                    id="password"
                    error={form.errors.password}
                    hint="Mínimo 12 caracteres, con mayúscula, minúscula y número. Máximo 72 bytes."
                >
                    <PasswordInput
                        id="password"
                        autoComplete="new-password"
                        value={form.data.password}
                        onChange={(e) =>
                            form.setData("password", e.target.value)
                        }
                        required
                        minLength={12}
                        maxLength={72}
                        {...fieldA11y("password", form.errors.password, true)}
                    />
                </Field>
                <Field
                    label="Repite tu contraseña"
                    id="password_confirmation"
                    error={form.errors.password_confirmation}
                >
                    <PasswordInput
                        id="password_confirmation"
                        autoComplete="new-password"
                        value={form.data.password_confirmation}
                        onChange={(e) =>
                            form.setData(
                                "password_confirmation",
                                e.target.value,
                            )
                        }
                        required
                        minLength={12}
                        maxLength={72}
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
                    Crear mi cuenta
                </SubmitButton>
                <p className="form-fine-print">
                    Tu cuenta tendrá acceso de lector a la biblioteca.
                </p>
            </form>
            <p className="auth-switch">
                ¿Ya tienes un espacio aquí?{" "}
                <Link href="/login">Inicia sesión</Link>
            </p>
        </AuthLayout>
    );
}
