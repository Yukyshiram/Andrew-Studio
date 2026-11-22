import { Link, usePage } from "@inertiajs/react";
import { BookOpen, Feather, Library, Plus, Sparkles } from "lucide-react";
import { AppShell } from "../components/layout";
import { BookCard } from "../components/books";
import { Button, EmptyState } from "../components/ui";
import {
    actionLabel,
    dateLabel,
    type AuditEvent,
    type Book,
    type SharedProps,
    type Stats,
} from "../types";
export default function Dashboard({
    stats,
    recentBooks,
    activity,
}: {
    stats: Stats;
    recentBooks: Book[];
    activity: AuditEvent[];
}) {
    const { auth, can } = usePage<SharedProps>().props;
    const firstName = auth.user?.name.split(" ")[0] ?? "";
    const items = [
        { value: stats.books, label: "Libros en la colección", icon: BookOpen },
        { value: stats.authors, label: "Autores por descubrir", icon: Feather },
        {
            value: stats.categories,
            label: "Áreas de conocimiento",
            icon: Library,
        },
    ];
    return (
        <AppShell
            title={`Hola, ${firstName}.`}
            eyebrow="TU BIBLIOTECA, EN PERSPECTIVA"
            actions={
                <span className="dashboard-date">
                    {new Intl.DateTimeFormat("es-MX", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                    }).format(new Date())}
                </span>
            }
        >
            <p className="page-description">
                Un nuevo día para ampliar el horizonte. Aquí empieza tu próxima
                lectura.
            </p>
            <section className="dashboard-banner">
                <div>
                    <span className="eyebrow">
                        <Sparkles size={14} />
                        EL CONOCIMIENTO SIGUE CRECIENDO
                    </span>
                    <h2>
                        Una idea lleva <em>a otra.</em>
                    </h2>
                    <p>
                        Recorre la colección y encuentra tu siguiente punto de
                        partida.
                    </p>
                    <Button asChild>
                        <Link href="/catalog">Abrir el catálogo</Link>
                    </Button>
                </div>
                <div className="banner-decoration" aria-hidden="true">
                    <span>a◦</span>
                    <small>LEE. IMAGINA. DESCUBRE.</small>
                </div>
            </section>
            <section
                className="dashboard-stats"
                aria-label="Resumen de la biblioteca"
            >
                {items.map((item) => (
                    <div className="dashboard-stat panel" key={item.label}>
                        <div>
                            <span>{item.label}</span>
                            <item.icon size={21} aria-hidden="true" />
                        </div>
                        <strong>{item.value.toLocaleString("es-MX")}</strong>
                        <small>Una colección compartida</small>
                    </div>
                ))}
            </section>
            <section className="section-block">
                <div className="section-heading">
                    <div>
                        <p className="eyebrow">LA COLECCIÓN SE RENUEVA</p>
                        <h2>Recién incorporados.</h2>
                    </div>
                    <Link href="/catalog?sort=recent" className="text-link">
                        Ver la colección
                    </Link>
                </div>
                {recentBooks.length ? (
                    <div className="book-grid">
                        {recentBooks.slice(0, 4).map((book, index) => (
                            <BookCard key={book.id} book={book} index={index} />
                        ))}
                    </div>
                ) : (
                    <EmptyState
                        title="Toda colección tiene un comienzo."
                        action={
                            can.manageBooks ? (
                                <Button asChild>
                                    <Link href="/manage/books/create">
                                        <Plus size={16} />
                                        Incorporar un libro
                                    </Link>
                                </Button>
                            ) : undefined
                        }
                    >
                        Las nuevas incorporaciones aparecerán aquí.
                    </EmptyState>
                )}
            </section>
            {can.viewAudit && (
                <section className="activity-panel panel">
                    <div className="section-heading">
                        <div>
                            <p className="eyebrow">
                                AL CUIDADO DE LA BIBLIOTECA
                            </p>
                            <h2>Lo que está pasando.</h2>
                        </div>
                        <Link href="/manage/audit" className="text-link">
                            Ver historial
                        </Link>
                    </div>
                    {activity.length ? (
                        <ul className="activity-list">
                            {activity.slice(0, 6).map((event) => (
                                <li key={event.id}>
                                    <span className="activity-dot" />
                                    <div>
                                        <strong>
                                            {actionLabel(event.action)}
                                        </strong>
                                        <p>
                                            {event.actor?.name ?? "Sistema"}
                                            <span>
                                                {" "}
                                                · Registro #{event.subject_id}
                                            </span>
                                        </p>
                                    </div>
                                    <time dateTime={event.created_at}>
                                        {dateLabel(event.created_at)}
                                    </time>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="muted">
                            Los próximos cambios de la biblioteca quedarán
                            registrados aquí.
                        </p>
                    )}
                </section>
            )}
        </AppShell>
    );
}
