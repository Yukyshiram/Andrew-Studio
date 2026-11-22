import { Link, useForm } from "@inertiajs/react";
import { ArrowLeft, Mail } from "lucide-react";
import { AuthLayout } from "../../components/layout";
import {
    Field,
    Input,
    SubmitButton,
    Notice,
    fieldA11y,
} from "../../components/ui";
export default function ForgotPassword() {
    const form = useForm({ email: "" });
    return (
        <AuthLayout
            title="Recuperar contraseña"
            description="Escribe el correo de tu cuenta. Si está registrado, recibirás un enlace para elegir una nueva contraseña."
        >
            {form.wasSuccessful && (
                <Notice>
                    Solicitud recibida. Revisa tu correo para continuar.
                </Notice>
            )}
            <form
                className="form-stack"
                onSubmit={(e) => {
                    e.preventDefault();
                    form.post("/forgot-password");
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
                        maxLength={191}
                        autoFocus
                        {...fieldA11y("email", form.errors.email)}
                        placeholder="tu@correo.com"
                    />
                </Field>
                <SubmitButton
                    processing={form.processing}
                    className="full-width"
                >
                    <Mail size={18} />
                    Enviar enlace de recuperación
                </SubmitButton>
            </form>
            <Link href="/login" className="text-link auth-back">
                <ArrowLeft size={16} />
                Volver al inicio de sesión
            </Link>
        </AuthLayout>
    );
}
