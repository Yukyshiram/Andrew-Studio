import { Link, useForm } from "@inertiajs/react";
import { useRef, useState } from "react";
import { AppShell } from "../../components/layout";
import { PaginationLinks } from "../../components/books";
import {
    AccountSummary,
    FinancialLedger,
    financialKinds,
    money,
    parseAmount,
} from "../../components/finance-ui";
import { LibraryErrors, libraryDate } from "../../components/library-ui";
import {
    Button,
    Card,
    Dialog,
    Field,
    Input,
    Select,
    SubmitButton,
    Textarea,
    fieldA11y,
} from "../../components/ui";
import type {
    FinancialEntry,
    FinancialSummary,
    Member,
} from "../../library-types";
import type { Pagination } from "../../types";

type Filters = {
    q: string;
    from: string;
    to: string;
    member_id: number | null;
};
type Report = {
    net_cents: number;
    payments_cents: number;
    reversed_payments_cents: number;
    net_payments_cents: number;
    current_recorded_balance_cents: number;
    groups: { kind: string; count: number; amount_cents: number }[];
};
const emptyMovement = {
    kind: "payment",
    amount: "",
    direction: "charge",
    reason: "",
    reference: "",
};
export default function Finance({
    members,
    member,
    account,
    entries,
    filters,
    currency,
    report,
}: {
    members: Pagination<Member & { ledger_balance_cents: number | null }>;
    member: Member | null;
    account: FinancialSummary | null;
    entries: Pagination<FinancialEntry>;
    filters: Filters;
    currency: string;
    report: Report;
}) {
    const search = useForm({
        q: filters.q,
        from: filters.from,
        to: filters.to,
        member_id: filters.member_id ?? "",
    });
    const form = useForm(emptyMovement);
    const refresh = useForm({ member_id: member?.id ?? 0 });
    const token = useRef("");
    const feedback = useRef<HTMLParagraphElement>(null);
    const trigger = useRef<HTMLButtonElement | null>(null);
    const [action, setAction] = useState<"manual" | FinancialEntry | null>(
        null,
    );

    function open(next: "manual" | FinancialEntry, element: HTMLButtonElement) {
        trigger.current = element;
        form.setData({ ...emptyMovement });
        form.clearErrors();
        token.current = crypto.randomUUID();
        setAction(next);
    }
    function submit() {
        if (!action) return;
        if (action === "manual") {
            const cents = parseAmount(form.data.amount);
            if (cents === null) {
                form.setError(
                    "amount",
                    "Escribe un importe positivo con hasta dos decimales, sin separadores de miles.",
                );
                return;
            }
            form.transform((data) => ({
                member_id: member!.id,
                kind: data.kind,
                amount_cents:
                    data.kind === "adjustment" && data.direction === "credit"
                        ? -cents
                        : cents,
                reason: data.reason,
                reference: data.reference,
                operation_key: token.current,
                expected_currency: currency,
            }));
        } else
            form.transform((data) => ({
                reason: data.reason,
                operation_key: token.current,
            }));
        form.post(
            action === "manual"
                ? "/manage/finance/entries"
                : `/manage/finance/entries/${action.id}/reverse`,
            { preserveScroll: true, onSuccess: () => setAction(null) },
        );
    }
    function accountLink(id: number) {
        const params = new URLSearchParams({
            from: filters.from,
            to: filters.to,
            q: filters.q,
            member_id: String(id),
        });
        return `/manage/finance?${params}`;
    }

    return (
        <AppShell title="Tesorería" eyebrow="CUENTAS Y MOVIMIENTOS">
            <div className="library-form">
                <p ref={feedback} tabIndex={-1}>
                    Registra pagos recibidos por otros medios y conserva su
                    trazabilidad. Esta aplicación no procesa cobros ni emite
                    comprobantes fiscales.
                </p>
                <form
                    className="library-form"
                    onSubmit={(event) => {
                        event.preventDefault();
                        search.get("/manage/finance", {
                            preserveState: false,
                            preserveScroll: true,
                        });
                    }}
                >
                    <LibraryErrors errors={search.errors} />
                    <div className="finance-filter-grid">
                        <Field
                            id="finance-search"
                            label="Buscar socio"
                            error={search.errors.q}
                        >
                            <Input
                                id="finance-search"
                                type="search"
                                maxLength={80}
                                value={search.data.q}
                                onChange={(event) =>
                                    search.setData("q", event.target.value)
                                }
                                {...fieldA11y(
                                    "finance-search",
                                    search.errors.q,
                                )}
                            />
                        </Field>
                        <Field
                            id="finance-from"
                            label="Desde"
                            error={search.errors.from}
                        >
                            <Input
                                id="finance-from"
                                type="date"
                                required
                                value={search.data.from}
                                onChange={(event) =>
                                    search.setData("from", event.target.value)
                                }
                                {...fieldA11y(
                                    "finance-from",
                                    search.errors.from,
                                )}
                            />
                        </Field>
                        <Field
                            id="finance-to"
                            label="Hasta"
                            error={search.errors.to}
                        >
                            <Input
                                id="finance-to"
                                type="date"
                                required
                                value={search.data.to}
                                onChange={(event) =>
                                    search.setData("to", event.target.value)
                                }
                                {...fieldA11y("finance-to", search.errors.to)}
                            />
                        </Field>
                    </div>
                    <div className="library-actions">
                        <SubmitButton
                            processing={search.processing}
                            variant="secondary"
                        >
                            Consultar periodo
                        </SubmitButton>
                        <Button asChild variant="ghost">
                            <Link href="/manage/finance">
                                Restablecer filtros
                            </Link>
                        </Button>
                    </div>
                </form>
                <Card className="library-record">
                    <h2>Seleccionar cuenta</h2>
                    <div className="library-member-picker">
                        {members.data.map((item) => (
                            <Link
                                key={item.id}
                                href={accountLink(item.id)}
                                aria-current={
                                    member?.id === item.id ? "true" : undefined
                                }
                            >
                                <strong>{item.user.name}</strong>
                                <span>{item.card_number}</span>
                                <span>
                                    {money(
                                        item.ledger_balance_cents ?? 0,
                                        currency,
                                    )}{" "}
                                    registrados
                                </span>
                            </Link>
                        ))}
                    </div>
                    {!members.data.length && (
                        <p>No hay socios que coincidan con la búsqueda.</p>
                    )}
                    <PaginationLinks pagination={members} />
                </Card>
                {member && account && (
                    <section aria-label={`Cuenta de ${member.user.name}`}>
                        <h2
                            id="selected-account"
                            className="finance-account-name"
                        >
                            Cuenta de {member.user.name}
                        </h2>
                        <AccountSummary account={account} />
                        <p>
                            El saldo total incluye cargos calculados aún
                            pendientes de registrar. Los informes siguientes
                            usan movimientos registrados.
                        </p>
                        <div className="library-actions">
                            <Button
                                onClick={(event) =>
                                    open("manual", event.currentTarget)
                                }
                            >
                                Registrar movimiento
                            </Button>
                            <SubmitButton
                                processing={refresh.processing}
                                variant="secondary"
                                onClick={() => {
                                    refresh.transform(() => ({
                                        member_id: member.id,
                                    }));
                                    refresh.post("/manage/finance/refresh", {
                                        preserveScroll: true,
                                    });
                                }}
                            >
                                Actualizar cargos de esta cuenta
                            </SubmitButton>
                        </div>
                        <LibraryErrors errors={refresh.errors} />
                    </section>
                )}
                <section aria-label="Informe del periodo">
                    <h2 id="financial-report">Informe del periodo</h2>
                    <p>
                        {libraryDate(filters.from)} – {libraryDate(filters.to)}{" "}
                        · {currency}
                    </p>
                    <div className="library-metrics finance-summary">
                        <Card>
                            <strong>
                                {money(report.payments_cents, currency)}
                            </strong>
                            Pagos registrados
                        </Card>
                        <Card>
                            <strong>
                                {money(
                                    report.reversed_payments_cents,
                                    currency,
                                )}
                            </strong>
                            Reversiones de pagos
                        </Card>
                        <Card>
                            <strong>
                                {money(report.net_payments_cents, currency)}
                            </strong>
                            Pagos netos del periodo
                        </Card>
                    </div>
                    <p>
                        Movimiento neto del periodo:{" "}
                        {money(report.net_cents, currency)}. Saldo registrado
                        actual de las cuentas filtradas:{" "}
                        {money(report.current_recorded_balance_cents, currency)}
                        .
                    </p>
                    {report.groups.length > 0 && (
                        <dl className="finance-breakdown">
                            {report.groups.map((group) => (
                                <div key={group.kind}>
                                    <dt>
                                        {financialKinds[group.kind]} (
                                        {group.count})
                                    </dt>
                                    <dd>
                                        {money(group.amount_cents, currency)}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    )}
                </section>
                <FinancialLedger
                    entries={entries}
                    showMembers={!member}
                    reverse={(entry, element) => open(entry, element)}
                />
                <Dialog
                    open={action !== null}
                    onOpenChange={(value) => {
                        if (!value) setAction(null);
                    }}
                    fallbackFocusRef={feedback}
                    returnFocusRef={trigger}
                    title={
                        action === "manual"
                            ? "Registrar movimiento"
                            : "Revertir movimiento"
                    }
                    description={
                        action === "manual"
                            ? `Cuenta de ${member?.user.name ?? ""}. El motivo y la referencia serán visibles para el socio. Los pagos se registran después de recibirlos por otros medios.`
                            : `Se añadirá el importe opuesto al movimiento #${action?.id ?? ""}. El original y su responsable se conservarán.`
                    }
                >
                    <form
                        className="library-form"
                        onSubmit={(event) => {
                            event.preventDefault();
                            submit();
                        }}
                    >
                        <LibraryErrors
                            errors={Object.fromEntries(
                                Object.entries(form.errors).filter(
                                    ([field]) =>
                                        !["amount", "reason"].includes(field),
                                ),
                            )}
                        />
                        {action === "manual" && (
                            <>
                                <Field
                                    id="finance-kind"
                                    label="Tipo de movimiento"
                                >
                                    <Select
                                        id="finance-kind"
                                        value={form.data.kind}
                                        onChange={(event) =>
                                            form.setData(
                                                "kind",
                                                event.target.value,
                                            )
                                        }
                                    >
                                        <option value="payment">
                                            Pago registrado
                                        </option>
                                        <option value="credit">
                                            Abono autorizado
                                        </option>
                                        <option value="adjustment">
                                            Ajuste de saldo
                                        </option>
                                    </Select>
                                </Field>
                                {form.data.kind === "adjustment" && (
                                    <Field
                                        id="finance-direction"
                                        label="Efecto del ajuste"
                                    >
                                        <Select
                                            id="finance-direction"
                                            value={form.data.direction}
                                            onChange={(event) =>
                                                form.setData(
                                                    "direction",
                                                    event.target.value,
                                                )
                                            }
                                        >
                                            <option value="charge">
                                                Cargo: aumenta el saldo
                                            </option>
                                            <option value="credit">
                                                Abono: reduce el saldo
                                            </option>
                                        </Select>
                                    </Field>
                                )}
                                <Field
                                    id="finance-amount"
                                    label={`Importe (${currency})`}
                                    error={form.errors.amount}
                                    hint="Hasta dos decimales, sin separadores de miles."
                                >
                                    <Input
                                        id="finance-amount"
                                        inputMode="decimal"
                                        required
                                        value={form.data.amount}
                                        onChange={(event) => {
                                            form.setData(
                                                "amount",
                                                event.target.value,
                                            );
                                            form.clearErrors("amount");
                                        }}
                                        {...fieldA11y(
                                            "finance-amount",
                                            form.errors.amount,
                                        )}
                                    />
                                </Field>
                                <Field
                                    id="finance-reference"
                                    label="Referencia (opcional)"
                                >
                                    <Input
                                        id="finance-reference"
                                        maxLength={100}
                                        value={form.data.reference}
                                        onChange={(event) =>
                                            form.setData(
                                                "reference",
                                                event.target.value,
                                            )
                                        }
                                    />
                                </Field>
                            </>
                        )}
                        <Field
                            id="finance-reason"
                            label="Motivo"
                            error={form.errors.reason}
                        >
                            <Textarea
                                id="finance-reason"
                                required
                                maxLength={500}
                                value={form.data.reason}
                                onChange={(event) =>
                                    form.setData("reason", event.target.value)
                                }
                                {...fieldA11y(
                                    "finance-reason",
                                    form.errors.reason,
                                )}
                            />
                        </Field>
                        <div className="dialog-actions">
                            <Button
                                variant="ghost"
                                type="button"
                                onClick={() => setAction(null)}
                            >
                                Cancelar
                            </Button>
                            <SubmitButton processing={form.processing}>
                                Confirmar registro
                            </SubmitButton>
                        </div>
                    </form>
                </Dialog>
            </div>
        </AppShell>
    );
}
