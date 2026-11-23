import "../../css/dashboard.css";
import { Link, usePage } from "@inertiajs/react";
import { BookOpen, Feather, Library, Plus, Sparkles } from "lucide-react";
import { AppShell } from "../components/layout";
import { BookCard } from "../components/books";
import { Button, EmptyState } from "../components/ui";
import { libraryDate } from "../library-format";
import { money } from "../components/finance-ui";
import { LibraryBookTitle, LibraryStatus } from "../components/library-ui";
import { NewsCard } from "../components/news-ui";
import { PresentationNavigation } from "../components/presentation-navigation";
import type {
    Acquisition,
    FinancialSummary,
    Loan,
    Member,
} from "../library-types";
import {
    actionLabel,
    dateLabel,
    type AuditEvent,
    type Book,
    type SharedProps,
    type Stats,
} from "../types";
interface DashboardSummary {
    today: string;
    timezone: string;
    currency: string;
    reading: {
        member: Pick<Member, "card_number" | "status" | "expires_on">;
        active: number;
        overdue: number;
        requests: number;
        ready: number;
        unread: number;
        account: FinancialSummary;
        nextDue: Loan[];
    } | null;
    operations: {
        active: number;
        overdue: number;
        due_today: number;
        pending: number;
        waiting: number;
        ready: number;
        available: number;
        upcoming: number;
        urgentLoans: Loan[];
    } | null;
    treasury: {
        payments_cents: number;
        reversed_payments_cents: number;
        net_payments_cents: number;
        current_recorded_balance_cents: number;
    } | null;
    upcoming: Acquisition[];
}

export default function Dashboard({
    stats,
    recentBooks,
    activity,
    today,
    timezone,
    currency,
    reading,
    operations,
    treasury,
    upcoming,
}: {
    stats: Stats;
    recentBooks: Book[];
    activity: AuditEvent[];
} & DashboardSummary) {
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
                <time className="dashboard-date" dateTime={today}>
                    {libraryDate(today)} · {timezone}
                </time>
            }
        >
            <p className="page-description">
                {operations
                    ? "Solicitudes, recogidas y devoluciones: este es el estado actual de la biblioteca."
                    : "Tus solicitudes, próximos vencimientos y nuevas historias, en un solo lugar."}
            </p>
            <div className="library-actions dashboard-quick-actions">
                <Button asChild>
                    <Link
                        href={
                            operations ? "/manage/circulation" : "/my-library"
                        }
                    >
                        {operations
                            ? "Abrir circulación"
                            : "Ir a Mi biblioteca"}
                    </Link>
                </Button>
                <Button asChild variant="secondary">
                    <Link href="/catalog">Explorar catálogo</Link>
                </Button>
                <Button asChild variant="ghost">
                    <Link href="/news">Consultar novedades</Link>
                </Button>
            </div>
            {reading && (
                <section
                    className="section-block"
                    aria-label="Resumen privado de tu cuenta"
                >
                    <div className="section-heading">
                        <div>
                            <p className="eyebrow">
                                {reading.member.card_number}
                            </p>
                            <h2>Tu biblioteca al día.</h2>
                        </div>
                        <LibraryStatus value={reading.member.status} />
                    </div>
                    <div className="library-metrics dashboard-values">
                        {[
                            {
                                label: "Préstamos activos",
                                value: reading.active,
                                href: "/my-library",
                            },
                            {
                                label: "Préstamos vencidos",
                                value: reading.overdue,
                                href: "/my-library",
                            },
                            {
                                label: "Solicitudes abiertas",
                                value: reading.requests,
                                href: "/my-library?view=requests",
                            },
                            {
                                label: "Listos para recoger",
                                value: reading.ready,
                                href: "/my-library?view=requests",
                            },
                            {
                                label: "Avisos sin leer",
                                value: reading.unread,
                                href: "/my-library?view=notices",
                            },
                            {
                                label: "Saldo de tu cuenta",
                                value: money(
                                    reading.account.balance_cents,
                                    reading.account.currency,
                                ),
                                href: "/my-library?view=finance",
                            },
                        ].map((item) => (
                            <Link href={item.href} key={item.label}>
                                <strong>{item.value}</strong>
                                {item.label}
                            </Link>
                        ))}
                    </div>
                    <p className="library-context">
                        El saldo incluye cargos calculados aún sin registrar.
                        Las devoluciones siguen disponibles aunque exista deuda.
                    </p>
                    {reading.nextDue.length > 0 && (
                        <ul className="dashboard-due-list">
                            {reading.nextDue.map((loan) => (
                                <li key={loan.id}>
                                    <LibraryBookTitle book={loan.copy.book} />
                                    <span>
                                        {loan.due_on < today
                                            ? "Venció"
                                            : "Vence"}{" "}
                                        el {libraryDate(loan.due_on)}
                                    </span>
                                    <Link
                                        href="/my-library"
                                        className="text-link"
                                    >
                                        Ver préstamo
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            )}
            {operations && (
                <section
                    className="section-block dashboard-operations"
                    aria-label="Operación de la biblioteca"
                >
                    <div className="section-heading">
                        <div>
                            <p className="eyebrow">CIRCULACIÓN REAL</p>
                            <h2>El día en la biblioteca.</h2>
                        </div>
                        <Link href="/manage/circulation" className="text-link">
                            Atender circulación
                        </Link>
                    </div>
                    <div className="library-metrics dashboard-values">
                        {[
                            {
                                label: "Préstamos activos",
                                value: operations.active,
                                href: "/manage/circulation?view=loans",
                            },
                            {
                                label: "Préstamos vencidos",
                                value: operations.overdue,
                                href: "/manage/circulation?view=loans",
                            },
                            {
                                label: "Vencen hoy",
                                value: operations.due_today,
                                href: "/manage/circulation?view=loans",
                            },
                            {
                                label: "Por validar",
                                value: operations.pending,
                                href: "/manage/circulation?status=pending",
                            },
                            {
                                label: "Reservas en espera",
                                value: operations.waiting,
                                href: "/manage/circulation?status=waiting",
                            },
                            {
                                label: "Recogidas pendientes",
                                value: operations.ready,
                                href: "/manage/circulation?status=ready",
                            },
                            {
                                label: "Ejemplares disponibles",
                                value: operations.available,
                                href: "/manage/inventory",
                            },
                            {
                                label: "Incorporaciones pendientes",
                                value: operations.upcoming,
                                href: "/manage/acquisitions",
                            },
                        ].map((item) => (
                            <Link key={item.label} href={item.href}>
                                <strong>{item.value}</strong>
                                {item.label}
                            </Link>
                        ))}
                    </div>
                    {operations.urgentLoans.length ? (
                        <div className="panel library-record">
                            <h3>Devoluciones por atender</h3>
                            <ul className="dashboard-due-list">
                                {operations.urgentLoans.map((loan) => (
                                    <li key={loan.id}>
                                        <div>
                                            <LibraryBookTitle
                                                book={loan.copy.book}
                                            />
                                            <p className="muted">
                                                {loan.member?.user.name} ·{" "}
                                                {loan.copy.barcode}
                                            </p>
                                        </div>
                                        <span>
                                            {loan.due_on < today
                                                ? "Venció"
                                                : "Vence"}{" "}
                                            el {libraryDate(loan.due_on)}
                                        </span>
                                        <Link
                                            href={`/manage/circulation?view=loans&q=${encodeURIComponent(loan.copy.barcode)}`}
                                            className="text-link"
                                        >
                                            Atender préstamo
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : (
                        <p className="muted">
                            No hay préstamos vencidos ni devoluciones previstas
                            para hoy.
                        </p>
                    )}
                </section>
            )}
            {treasury && (
                <section
                    className="section-block"
                    aria-label="Resumen financiero administrativo"
                >
                    <div className="section-heading">
                        <div>
                            <p className="eyebrow">
                                REGISTROS, NO COBROS EN LÍNEA
                            </p>
                            <h2>Tesorería de este mes.</h2>
                        </div>
                        <Link href="/manage/finance" className="text-link">
                            Revisar tesorería
                        </Link>
                    </div>
                    <div className="library-metrics dashboard-values">
                        {[
                            ["Pagos registrados", treasury.payments_cents],
                            [
                                "Pagos revertidos",
                                treasury.reversed_payments_cents,
                            ],
                            ["Pagos netos", treasury.net_payments_cents],
                            [
                                "Saldo registrado pendiente (todos los periodos)",
                                treasury.current_recorded_balance_cents,
                            ],
                        ].map(([label, value]) => (
                            <div className="panel" key={label}>
                                <strong>
                                    {money(Number(value), currency)}
                                </strong>
                                {label}
                            </div>
                        ))}
                    </div>
                    <p className="library-context">
                        El saldo registrado no incluye mora calculada pendiente
                        de liquidar. El informe completo permite actualizar una
                        cuenta y revisar cargos y reversiones.
                    </p>
                </section>
            )}
            {!reading && !operations && (
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
                            Recorre la colección y encuentra tu siguiente punto
                            de partida.
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
            )}
            {upcoming.length > 0 && (
                <section
                    className="section-block"
                    aria-label="Próximas novedades"
                >
                    <div className="section-heading">
                        <div>
                            <p className="eyebrow">
                                LA COLECCIÓN SIGUE CRECIENDO
                            </p>
                            <h2>Historias en camino.</h2>
                        </div>
                        <Link href="/news" className="text-link">
                            Ver novedades
                        </Link>
                    </div>
                    <PresentationNavigation value={Link}>
                        <div className="news-grid">
                            {upcoming.map((record) => (
                                <NewsCard
                                    key={record.id}
                                    acquisition={record}
                                    today={today}
                                />
                            ))}
                        </div>
                    </PresentationNavigation>
                </section>
            )}
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
                        <h2>Últimas fichas catalogadas.</h2>
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
                        Las nuevas fichas bibliográficas aparecerán aquí. La
                        llegada de ejemplares se confirma en Novedades.
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
