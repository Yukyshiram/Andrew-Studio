import { Head, Link } from "@inertiajs/react";
import { BookOpen, RotateCcw } from "lucide-react";
import { Brand } from "../../components/layout";
import { Button } from "../../components/ui";

const errors = {
    403: {
        title: "Esta página tiene otro acceso.",
        description:
            "Tu cuenta no tiene permiso para entrar aquí. Puedes seguir explorando la colección.",
    },
    404: {
        title: "Esta página se salió del estante.",
        description:
            "El enlace puede haber cambiado o el contenido ya no está disponible. La colección sigue esperando.",
    },
    419: {
        title: "Tu sesión necesita un nuevo comienzo.",
        description:
            "La sesión expiró. Vuelve a entrar antes de continuar con los cambios.",
    },
    429: {
        title: "Hagamos una pequeña pausa.",
        description:
            "Recibimos demasiadas solicitudes. Espera unos momentos antes de intentarlo de nuevo.",
    },
    500: {
        title: "Esta página necesita una pausa.",
        description:
            "No pudimos completar la solicitud. Inténtalo de nuevo en unos momentos.",
    },
    503: {
        title: "Estamos preparando la siguiente página.",
        description:
            "La biblioteca no está disponible en este momento. Vuelve a intentarlo más tarde.",
    },
};

export default function ErrorPage({ status = 500 }: { status?: number }) {
    const code = Object.hasOwn(errors, status)
        ? (status as keyof typeof errors)
        : 500;
    const error = errors[code];

    return (
        <>
            <Head title={`${code} · ${error.title}`}>
                <meta name="robots" content="noindex" />
            </Head>
            <a className="skip-link" href="#contenido">
                Saltar al contenido
            </a>
            <div className="error-layout">
                <header className="error-header">
                    <Brand />
                    <span className="eyebrow">UNA BIBLIOTECA DE IDEAS</span>
                </header>
                <main className="error-main" id="contenido" tabIndex={-1}>
                    <div className="error-illustration" aria-hidden="true">
                        <BookOpen size={48} strokeWidth={1} />
                        <span>{code}</span>
                        <i />
                    </div>
                    <p className="eyebrow">HAGAMOS UNA PAUSA ENTRE PÁGINAS</p>
                    <h1>{error.title}</h1>
                    <p className="error-description">{error.description}</p>
                    <div className="error-actions">
                        <Button asChild>
                            <Link href={code === 419 ? "/login" : "/catalog"}>
                                {code === 419
                                    ? "Volver a iniciar sesión"
                                    : "Explorar la colección"}
                            </Link>
                        </Button>
                        {[429, 500, 503].includes(code) && (
                            <Button
                                variant="secondary"
                                onClick={() => window.location.reload()}
                            >
                                <RotateCcw size={16} aria-hidden="true" />
                                Reintentar
                            </Button>
                        )}
                        <Link className="text-link" href="/">
                            Volver al inicio
                        </Link>
                    </div>
                </main>
                <footer className="error-footer">
                    Andrew's Bibliotecary · Un espacio para la curiosidad.
                </footer>
            </div>
        </>
    );
}
