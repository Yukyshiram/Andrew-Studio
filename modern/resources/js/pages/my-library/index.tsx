import { Link, useForm } from "@inertiajs/react";
import { useRef, useState } from "react";
import { AppShell } from "../../components/layout";
import { PaginationLinks } from "../../components/books";
import {
    LibraryErrors,
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
import type { CirculationRecord, Loan, Member } from "../../library-types";
import type { Pagination } from "../../types";

type Membership = Pick<
    Member,
    "id" | "card_number" | "status" | "expires_on" | "phone" | "loan_limit"
>;
export default function MyLibrary({
    member,
    requests,
    loans,
    stats,
    view,
    today,
    timezone,
}: {
    member: Membership | null;
    requests: Pagination<CirculationRecord> | null;
    loans: Pagination<Loan> | null;
    stats: { active: number; overdue: number; requests: number } | null;
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
                                                    <Link
                                                        href={`/catalog/${record.book_id}`}
                                                    >
                                                        {record.book.title}
                                                    </Link>
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
                                                    No hay un ejemplar asignado.
                                                    Esperas el siguiente
                                                    disponible después de las
                                                    reservas anteriores.
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
                                                    <Link
                                                        href={`/catalog/${loan.copy.book_id}`}
                                                    >
                                                        {loan.copy.book.title}
                                                    </Link>
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
