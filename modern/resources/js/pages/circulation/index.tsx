import { Link, router, useForm } from "@inertiajs/react";
import { useRef, useState } from "react";
import { AppShell } from "../../components/layout";
import { PaginationLinks } from "../../components/books";
import {
    LibraryErrors,
    LibraryBookTitle,
    LibrarySearch,
    LibraryStatus,
    LibraryTabs,
    libraryDate,
} from "../../components/library-ui";
import {
    Button,
    Card,
    Dialog,
    EmptyState,
    Field,
    Select,
    SubmitButton,
    Textarea,
    fieldA11y,
} from "../../components/ui";
import type { CirculationRecord, Loan } from "../../library-types";
import type { Pagination } from "../../types";

type Action =
    | { kind: "prepare" | "issue" | "reject"; record: CirculationRecord }
    | { kind: "receive"; record: Loan };
export default function Circulation({
    requests,
    loans,
    filters,
    today,
    stats,
}: {
    requests: Pagination<CirculationRecord> | null;
    loans: Pagination<Loan> | null;
    filters: { view: string; status: string; q: string };
    today: string;
    stats: {
        active: number;
        overdue: number;
        pending: number;
        ready: number;
        available: number;
    };
}) {
    const [action, setAction] = useState<Action | null>(null);
    const feedbackRef = useRef<HTMLParagraphElement>(null);
    const form = useForm({ reason: "", condition: "good" });
    function open(next: Action) {
        form.clearErrors();
        form.reset();
        setAction(next);
    }
    function submit() {
        if (!action) return;
        const path =
            action.kind === "receive"
                ? `/manage/circulation/loans/${action.record.id}/receive`
                : `/manage/circulation/requests/${action.record.id}/${action.kind}`;
        form.transform((data) =>
            action.kind === "receive"
                ? { condition: data.condition }
                : action.kind === "reject"
                  ? { reason: data.reason }
                  : {},
        );
        form.post(path, {
            preserveScroll: true,
            onSuccess: () => setAction(null),
            onError: () => {
                if (action.kind !== "reject" && action.kind !== "receive")
                    setAction(null);
            },
        });
    }
    const title =
        action?.kind === "receive"
            ? "Registrar devolución"
            : action?.kind === "issue"
              ? "Confirmar entrega física"
              : action?.kind === "reject"
                ? "Rechazar solicitud"
                : "Validar y preparar solicitud";
    return (
        <AppShell title="Circulación" eyebrow="ATENCIÓN BIBLIOTECARIA">
            <p ref={feedbackRef} tabIndex={-1}>
                Valida solicitudes, prepara recogidas y registra únicamente las
                entregas o devoluciones que se han realizado.
            </p>
            <div className="library-metrics">
                <Link href="/manage/circulation?view=loans">
                    <strong>{stats.active}</strong>Préstamos activos
                </Link>
                <Link href="/manage/circulation?view=loans">
                    <strong>{stats.overdue}</strong>Vencidos
                </Link>
                <Link href="/manage/circulation?status=pending">
                    <strong>{stats.pending}</strong>Por validar
                </Link>
                <Link href="/manage/circulation?status=ready">
                    <strong>{stats.ready}</strong>Recogidas preparadas
                </Link>
                <Link href="/manage/inventory">
                    <strong>{stats.available}</strong>Ejemplares disponibles
                </Link>
            </div>
            <LibraryTabs
                current={filters.view}
                items={[
                    {
                        key: "requests",
                        label: "Solicitudes y reservas",
                        href: "/manage/circulation",
                    },
                    {
                        key: "loans",
                        label: "Préstamos activos",
                        href: "/manage/circulation?view=loans",
                    },
                    {
                        key: "history",
                        label: "Devoluciones e historial",
                        href: "/manage/circulation?view=history",
                    },
                ]}
            />
            <LibraryErrors errors={form.errors} />
            <LibrarySearch
                q={filters.q}
                action={`/manage/circulation?view=${filters.view}&status=${filters.status}`}
                hint="Título, número de socio o nombre; en préstamos también puedes buscar el código del ejemplar."
            />
            {requests && (
                <>
                    <Field id="request-status" label="Estado de solicitudes">
                        <Select
                            id="request-status"
                            value={filters.status}
                            onChange={(event) =>
                                router.get(
                                    "/manage/circulation",
                                    {
                                        view: "requests",
                                        q: filters.q,
                                        status: event.target.value,
                                    },
                                    {
                                        preserveState: true,
                                        preserveScroll: true,
                                    },
                                )
                            }
                        >
                            <option value="">Por atender</option>
                            <option value="pending">
                                Pendientes de validación
                            </option>
                            <option value="waiting">En lista de espera</option>
                            <option value="ready">Listas para recoger</option>
                            <option value="fulfilled">Entregadas</option>
                            <option value="rejected">Rechazadas</option>
                            <option value="cancelled">Canceladas</option>
                            <option value="expired">Recogidas vencidas</option>
                        </Select>
                    </Field>
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
                                        <LibraryStatus value={record.status} />
                                    </div>
                                    <p>
                                        <strong>
                                            {record.member?.user.name}
                                        </strong>{" "}
                                        · {record.member?.card_number}
                                    </p>
                                    {record.allocation && (
                                        <p>
                                            Ejemplar{" "}
                                            {record.allocation.copy.barcode} ·{" "}
                                            {record.allocation.copy.location} ·
                                            Recogida hasta{" "}
                                            {libraryDate(record.ready_until)}
                                        </p>
                                    )}
                                    {record.status === "waiting" && (
                                        <p>
                                            Se asignará el siguiente ejemplar
                                            disponible respetando las reservas
                                            anteriores elegibles.
                                        </p>
                                    )}
                                    <div className="library-actions">
                                        {["pending", "waiting"].includes(
                                            record.status,
                                        ) && (
                                            <Button
                                                onClick={() =>
                                                    open({
                                                        kind: "prepare",
                                                        record,
                                                    })
                                                }
                                                aria-label={`Preparar solicitud de ${record.member?.user.name}`}
                                            >
                                                {record.status === "pending"
                                                    ? "Validar y preparar"
                                                    : "Comprobar disponibilidad"}
                                            </Button>
                                        )}
                                        {record.status === "ready" && (
                                            <Button
                                                onClick={() =>
                                                    open({
                                                        kind: "issue",
                                                        record,
                                                    })
                                                }
                                                aria-label={`Entregar ejemplar a ${record.member?.user.name}`}
                                            >
                                                Confirmar entrega
                                            </Button>
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
                                                onClick={() =>
                                                    open({
                                                        kind: "reject",
                                                        record,
                                                    })
                                                }
                                                aria-label={`Rechazar solicitud de ${record.member?.user.name}`}
                                            >
                                                Rechazar
                                            </Button>
                                        )}
                                    </div>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <EmptyState title="No hay solicitudes en esta vista">
                            Las solicitudes de lectores aparecerán aquí para su
                            validación.
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
                                <Card key={loan.id} className="library-record">
                                    <div className="library-record-heading">
                                        <h2>
                                            <LibraryBookTitle
                                                book={loan.copy.book}
                                            />
                                        </h2>
                                        <LibraryStatus
                                            value={
                                                loan.status === "active"
                                                    ? loan.due_on < today
                                                        ? "overdue"
                                                        : "loan_active"
                                                    : loan.status
                                            }
                                        />
                                    </div>
                                    <p>
                                        <strong>
                                            {loan.member?.user.name}
                                        </strong>{" "}
                                        · {loan.member?.card_number}
                                    </p>
                                    <p>
                                        Ejemplar {loan.copy.barcode} ·{" "}
                                        <strong>
                                            Vencimiento:{" "}
                                            {libraryDate(loan.due_on)}
                                        </strong>
                                    </p>
                                    <p>
                                        Renovaciones: {loan.renewal_count} de{" "}
                                        {loan.terms.max_renewals}.
                                    </p>
                                    {loan.returned_condition && (
                                        <p>
                                            Condición al cierre:{" "}
                                            <LibraryStatus
                                                value={loan.returned_condition}
                                            />
                                        </p>
                                    )}
                                    {loan.status === "active" && (
                                        <Button
                                            onClick={() =>
                                                open({
                                                    kind: "receive",
                                                    record: loan,
                                                })
                                            }
                                            aria-label={`Recibir devolución de ${loan.copy.barcode}`}
                                        >
                                            Registrar devolución
                                        </Button>
                                    )}
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <EmptyState
                            title={
                                filters.view === "history"
                                    ? "No hay devoluciones registradas"
                                    : "No hay préstamos activos"
                            }
                        >
                            Prepara una solicitud y confirma la entrega para
                            iniciar un préstamo.
                        </EmptyState>
                    )}
                    <PaginationLinks pagination={loans} />
                </>
            )}
            <Dialog
                fallbackFocusRef={feedbackRef}
                open={!!action}
                onOpenChange={(value) => {
                    if (!value) setAction(null);
                }}
                title={title}
                description={
                    action?.kind === "issue"
                        ? "Confirma solo después de comprobar la identidad del socio y entregar físicamente el ejemplar. El sistema calculará el vencimiento."
                        : action?.kind === "receive"
                          ? "Comprueba la condición física. Daño y pérdida dejarán el ejemplar fuera de circulación; los cargos dependerán de su política."
                          : action?.kind === "reject"
                            ? "El motivo se conservará y será visible para el solicitante."
                            : "Se comprobarán membresía y límites. Si hay existencias, se apartará un ejemplar; en caso contrario quedará en espera."
                }
            >
                <form
                    className="library-form"
                    onSubmit={(event) => {
                        event.preventDefault();
                        submit();
                    }}
                >
                    <LibraryErrors errors={form.errors} />
                    {action?.kind === "reject" && (
                        <Field
                            id="rejection-reason"
                            label="Motivo de rechazo"
                            error={form.errors.reason}
                        >
                            <Textarea
                                id="rejection-reason"
                                value={form.data.reason}
                                required
                                maxLength={500}
                                onChange={(event) =>
                                    form.setData("reason", event.target.value)
                                }
                                {...fieldA11y(
                                    "rejection-reason",
                                    form.errors.reason,
                                )}
                            />
                        </Field>
                    )}
                    {action?.kind === "receive" && (
                        <Field
                            id="return-condition"
                            label="Condición del ejemplar"
                            error={form.errors.condition}
                        >
                            <Select
                                id="return-condition"
                                value={form.data.condition}
                                onChange={(event) =>
                                    form.setData(
                                        "condition",
                                        event.target.value,
                                    )
                                }
                                {...fieldA11y(
                                    "return-condition",
                                    form.errors.condition,
                                )}
                            >
                                <option value="good">Buen estado</option>
                                <option value="worn">Desgaste de uso</option>
                                <option value="damaged">
                                    Dañado: enviar a reparación
                                </option>
                                <option value="lost">
                                    Extraviado: registrar pérdida
                                </option>
                            </Select>
                        </Field>
                    )}
                    <div className="dialog-actions">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setAction(null)}
                        >
                            Cancelar
                        </Button>
                        <SubmitButton
                            processing={form.processing}
                            variant={
                                action?.kind === "reject" ||
                                form.data.condition === "lost"
                                    ? "destructive"
                                    : "primary"
                            }
                        >
                            Confirmar operación
                        </SubmitButton>
                    </div>
                </form>
            </Dialog>
        </AppShell>
    );
}
