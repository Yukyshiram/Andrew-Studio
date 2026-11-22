import { Link, useForm } from "@inertiajs/react";
import { useRef, useState } from "react";
import { AppShell } from "../../components/layout";
import { RenewLoanButton } from "../../components/renew-loan";
import { PaginationLinks } from "../../components/books";
import {
    LibraryErrors,
    LibraryBookTitle,
    LibraryStatus,
    LibraryTabs,
    libraryDate,
} from "../../components/library-ui";
import {
    Button,
    Card,
    Dialog,
    EmptyState,
    Notice,
    SubmitButton,
} from "../../components/ui";
import type {
    CirculationRecord,
    LibraryNotice,
    Loan,
    Member,
} from "../../library-types";
import type { Pagination } from "../../types";

type Membership = Pick<
    Member,
    "id" | "card_number" | "status" | "expires_on" | "phone" | "loan_limit"
>;
export default function MyLibrary({
    member,
    requests,
    loans,
    notices,
    stats,
    view,
    today,
    timezone,
}: {
    member: Membership | null;
    requests: Pagination<CirculationRecord> | null;
    loans: Pagination<Loan> | null;
    notices: Pagination<LibraryNotice> | null;
    stats: {
        active: number;
        overdue: number;
        requests: number;
        unread: number;
    } | null;
    view: string;
    today: string;
    timezone: string;
}) {
    const [cancelling, setCancelling] = useState<CirculationRecord | null>(
        null,
    );
    const form = useForm<Record<string, string>>({});
    const feedbackRef = useRef<HTMLParagraphElement>(null);
    return (
        <AppShell title="Mi biblioteca" eyebrow="MI CUENTA">
            {member ? (
                <>
                    <Card className="library-account">
                        <div>
                            <span className="eyebrow">
                                {member.card_number}
                            </span>
                            <h2>Tu cuenta de lector</h2>
                            <p>
                                {member.expires_on
                                    ? `Vigente hasta ${libraryDate(member.expires_on)}`
                                    : "Membresía sin fecha de vencimiento"}
                            </p>
                        </div>
                        <LibraryStatus
                            value={
                                member.expires_on &&
                                member.expires_on.slice(0, 10) < today
                                    ? "expired"
                                    : member.status
                            }
                        />
                    </Card>
                    <div className="library-metrics">
                        <Link href="/my-library">
                            <strong>{stats?.active}</strong>Préstamos activos
                        </Link>
                        <Link href="/my-library">
                            <strong>{stats?.overdue}</strong>Vencidos
                        </Link>
                        <Link href="/my-library?view=requests">
                            <strong>{stats?.requests}</strong>Solicitudes por
                            atender
                        </Link>
                    </div>
                    <LibraryTabs
                        current={view}
                        items={[
                            {
                                key: "loans",
                                label: "Préstamos activos",
                                href: "/my-library",
                            },
                            {
                                key: "requests",
                                label: "Mis solicitudes",
                                href: "/my-library?view=requests",
                            },
                            {
                                key: "history",
                                label: "Historial",
                                href: "/my-library?view=history",
                            },
                            {
                                key: "notices",
                                label: `Avisos (${stats?.unread ?? 0})`,
                                href: "/my-library?view=notices",
                            },
                        ]}
                    />
                    <LibraryErrors errors={form.errors} />
                    <p
                        className="library-context"
                        ref={feedbackRef}
                        tabIndex={-1}
                    >
                        Las fechas corresponden al calendario de la biblioteca (
                        {timezone}). Solicitar o reservar no confirma una
                        entrega física.
                    </p>
                    {notices && (
                        <>
                            {notices.data.length ? (
                                <div className="library-records">
                                    {notices.data.map((notice) => (
                                        <Card
                                            key={notice.id}
                                            className="library-record"
                                        >
                                            <div className="library-record-heading">
                                                <h2>Aviso de la biblioteca</h2>
                                                <span>
                                                    {notice.read_at
                                                        ? "Leído"
                                                        : "Sin leer"}
                                                </span>
                                            </div>
                                            <p>{notice.message}</p>
                                            <p>
                                                {libraryDate(
                                                    notice.created_at,
                                                    timezone,
                                                )}
                                            </p>
                                            {!notice.read_at && (
                                                <SubmitButton
                                                    variant="ghost"
                                                    processing={form.processing}
                                                    aria-label={`Marcar aviso ${notice.id} como leído`}
                                                    onClick={() =>
                                                        form.post(
                                                            `/my-library/notices/${notice.id}/read`,
                                                            {
                                                                preserveScroll: true,
                                                                onSuccess: () =>
                                                                    feedbackRef.current?.focus(
                                                                        {
                                                                            preventScroll: true,
                                                                        },
                                                                    ),
                                                            },
                                                        )
                                                    }
                                                >
                                                    Marcar como leído
                                                </SubmitButton>
                                            )}
                                        </Card>
                                    ))}
                                </div>
                            ) : (
                                <EmptyState title="No hay avisos todavía">
                                    Aquí aparecerán las recogidas preparadas y
                                    los cambios de tus préstamos. Estos avisos
                                    son internos; no se envían por correo.
                                </EmptyState>
                            )}
                            <PaginationLinks pagination={notices} />
                        </>
                    )}
                    {requests && (
                        <>
                            {requests.data.length ? (
                                <div className="library-records">
                                    {requests.data.map((record) => (
                                        <Card
                                            key={record.id}
                                            className="library-record"
                                        >
                                            <div className="library-record-heading">
                                                <h2>
                                                    <LibraryBookTitle
                                                        book={record.book}
                                                    />
                                                </h2>
                                                <LibraryStatus
                                                    value={record.status}
                                                />
                                            </div>
                                            {record.status === "pending" && (
                                                <p>
                                                    El personal revisará tu
                                                    solicitud y comprobará tus
                                                    derechos de préstamo.
                                                </p>
                                            )}
                                            {record.status === "waiting" && (
                                                <p>
                                                    Posición{" "}
                                                    {record.queue_position}{" "}
                                                    entre las reservas
                                                    validadas. Se asignará el
                                                    siguiente ejemplar
                                                    disponible a la primera
                                                    persona elegible.
                                                </p>
                                            )}
                                            {record.status === "ready" && (
                                                <>
                                                    <p>
                                                        Recoge el ejemplar antes
                                                        del cierre del{" "}
                                                        {libraryDate(
                                                            record.ready_until,
                                                        )}
                                                        . El préstamo empezará
                                                        cuando el personal
                                                        confirme la entrega.
                                                    </p>
                                                    {record.allocation && (
                                                        <p>
                                                            Ejemplar{" "}
                                                            {
                                                                record
                                                                    .allocation
                                                                    .copy
                                                                    .barcode
                                                            }{" "}
                                                            ·{" "}
                                                            {
                                                                record
                                                                    .allocation
                                                                    .copy
                                                                    .location
                                                            }
                                                        </p>
                                                    )}
                                                </>
                                            )}
                                            {record.decision_reason && (
                                                <p>{record.decision_reason}</p>
                                            )}
                                            {[
                                                "pending",
                                                "waiting",
                                                "ready",
                                            ].includes(record.status) && (
                                                <Button
                                                    variant="ghost"
                                                    onClick={() => {
                                                        form.clearErrors();
                                                        setCancelling(record);
                                                    }}
                                                    aria-label={`Cancelar solicitud de ${record.book.title}`}
                                                >
                                                    Cancelar solicitud
                                                </Button>
                                            )}
                                        </Card>
                                    ))}
                                </div>
                            ) : (
                                <EmptyState
                                    title="Aún no hay solicitudes"
                                    action={
                                        <Button asChild>
                                            <Link href="/catalog">
                                                Explorar catálogo
                                            </Link>
                                        </Button>
                                    }
                                >
                                    Elige una ficha para solicitar un préstamo o
                                    reservar un título.
                                </EmptyState>
                            )}
                            <PaginationLinks pagination={requests} />
                        </>
                    )}
                    {loans && (
                        <>
                            {loans.data.length ? (
                                <div className="library-records">
                                    {loans.data.map((loan) => (
                                        <Card
                                            key={loan.id}
                                            className="library-record"
                                        >
                                            <div className="library-record-heading">
                                                <h2>
                                                    <LibraryBookTitle
                                                        book={loan.copy.book}
                                                    />
                                                </h2>
                                                <LibraryStatus
                                                    value={
                                                        loan.status === "active"
                                                            ? loan.due_on <
                                                              today
                                                                ? "overdue"
                                                                : "loan_active"
                                                            : loan.status
                                                    }
                                                />
                                            </div>
                                            <p>Ejemplar {loan.copy.barcode}</p>
                                            <p>
                                                <strong>
                                                    Vencimiento:{" "}
                                                    {libraryDate(loan.due_on)}
                                                </strong>
                                            </p>
                                            <p>
                                                Renovaciones registradas:{" "}
                                                {loan.renewal_count} de{" "}
                                                {loan.terms.max_renewals}.
                                            </p>
                                            {loan.status === "active" && (
                                                <RenewLoanButton loan={loan} />
                                            )}
                                            {loan.returned_at && (
                                                <p>
                                                    Cierre:{" "}
                                                    {libraryDate(
                                                        loan.returned_at,
                                                        timezone,
                                                    )}{" "}
                                                    · Condición:{" "}
                                                    <LibraryStatus
                                                        value={
                                                            loan.returned_condition ??
                                                            "good"
                                                        }
                                                    />
                                                </p>
                                            )}
                                        </Card>
                                    ))}
                                </div>
                            ) : (
                                <EmptyState
                                    title={
                                        view === "history"
                                            ? "Tu historial está vacío"
                                            : "No tienes préstamos activos"
                                    }
                                    action={
                                        <Button asChild>
                                            <Link href="/catalog">
                                                Explorar catálogo
                                            </Link>
                                        </Button>
                                    }
                                >
                                    Las solicitudes pendientes aparecen en Mis
                                    solicitudes; el préstamo comienza al
                                    confirmar la entrega.
                                </EmptyState>
                            )}
                            <PaginationLinks pagination={loans} />
                        </>
                    )}
                </>
            ) : (
                <Notice kind="info">
                    Tu cuenta todavía no tiene número de socio. Solicita al
                    personal el alta de membresía; puedes seguir explorando el{" "}
                    <Link href="/catalog" className="text-link">
                        catálogo
                    </Link>
                    .
                </Notice>
            )}
            <Dialog
                fallbackFocusRef={feedbackRef}
                open={!!cancelling}
                onOpenChange={(open) => {
                    if (!open) setCancelling(null);
                }}
                title="Cancelar solicitud"
                description={`¿Cancelar ${cancelling?.book.title ?? "esta solicitud"}? Si ya había un ejemplar preparado, se liberará para otra persona.`}
            >
                <div className="dialog-actions">
                    <Button variant="ghost" onClick={() => setCancelling(null)}>
                        Conservar solicitud
                    </Button>
                    <SubmitButton
                        processing={form.processing}
                        variant="destructive"
                        onClick={() => {
                            if (cancelling)
                                form.post(
                                    `/my-library/requests/${cancelling.id}/cancel`,
                                    {
                                        preserveScroll: true,
                                        onSuccess: () => setCancelling(null),
                                        onError: () => setCancelling(null),
                                    },
                                );
                        }}
                    >
                        Cancelar solicitud
                    </SubmitButton>
                </div>
            </Dialog>
        </AppShell>
    );
}
