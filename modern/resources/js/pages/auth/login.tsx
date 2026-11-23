import { Link, useForm } from "@inertiajs/react";

import { AuthLayout } from "../../components/layout";
import {
    Field,
    Input,
    PasswordInput,
    SubmitButton,
    fieldA11y,
} from "../../components/ui";
export default function Login() {
    const form = useForm({ email: "", password: "", remember: false });
    return (
        <AuthLayout
            title="Iniciar sesión"
            description="Accede a tu cuenta de la biblioteca."
        >
            <form
                className="form-stack"
                onSubmit={(e) => {
                    e.preventDefault();
                    form.post("/login", {
                        onFinish: () => form.reset("password"),
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
                        autoFocus
                        maxLength={191}
                        {...fieldA11y("email", form.errors.email)}
                        placeholder="tu@correo.com"
                    />
                </Field>
                <Field
                    label="Contraseña"
                    id="password"
                    error={form.errors.password}
                >
                    <PasswordInput
                        id="password"
                        autoComplete="current-password"
                        value={form.data.password}
                        onChange={(e) =>
                            form.setData("password", e.target.value)
                        }
                        required
                        {...fieldA11y("password", form.errors.password)}
                    />
                </Field>
                <div className="auth-form-options">
                    <label className="checkbox-label">
                        <input
                            type="checkbox"
                            checked={form.data.remember}
                            onChange={(e) =>
                                form.setData("remember", e.target.checked)
                            }
                        />
                        Recordarme
                    </label>
                    <Link className="text-link" href="/forgot-password">
                        ¿Olvidaste tu contraseña?
                    </Link>
                </div>
                <SubmitButton
                    processing={form.processing}
                    className="full-width"
                >
                    Entrar a mi biblioteca
                </SubmitButton>
            </form>
            <p className="auth-switch">
                ¿Es tu primera visita?{" "}
                <Link href="/register">Crea tu cuenta</Link>
            </p>
        </AuthLayout>
    );
}
