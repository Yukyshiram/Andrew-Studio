import { Card, EmptyState, Button } from "./ui";
import { libraryDate } from "./library-ui";
import { PaginationLinks } from "./books";
import type { Pagination } from "../types";
import type { FinancialEntry, FinancialSummary } from "../library-types";

export const financialKinds: Record<string, string> = {
    overdue: "Cargo por retraso",
    lost: "Cargo por pérdida",
    damage: "Cargo por daño",
    payment: "Pago registrado",
    credit: "Abono autorizado",
    adjustment: "Ajuste",
    reversal: "Reversión",
};

export function money(cents: number, currency: string) {
    return new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency,
    }).format(cents / 100);
}

export function parseAmount(value: string): number | null {
    const clean = value.trim().replace(",", ".");
    if (!/^\d{1,8}(?:\.\d{1,2})?$/.test(clean)) return null;
    const [whole, fraction = ""] = clean.split(".");
    const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
    return cents > 0 && cents <= 1_000_000_000 ? cents : null;
}

export function AccountSummary({ account }: { account: FinancialSummary }) {
    return (
        <div
            className="library-metrics finance-summary"
            role="group"
            aria-label="Resumen de la cuenta financiera"
        >
            <Card>
                <strong>
                    {money(account.recorded_cents, account.currency)}
                </strong>
                Saldo registrado
            </Card>
            <Card>
                <strong>
                    {money(account.pending_cents, account.currency)}
                </strong>
                Cargos pendientes de registrar
            </Card>
            <Card>
                <strong>
                    {money(account.balance_cents, account.currency)}
                </strong>
                Saldo total calculado
            </Card>
        </div>
    );
}

export function FinancialLedger({
    entries,
    reverse,
    showMembers = true,
}: {
    entries: Pagination<FinancialEntry>;
    reverse?: (entry: FinancialEntry, trigger: HTMLButtonElement) => void;
    showMembers?: boolean;
}) {
    return (
        <>
            {entries.data.length ? (
                <div
                    className="table-wrap"
                    tabIndex={0}
                    role="region"
                    aria-label="Historial financiero desplazable"
                >
                    <table className="data-table">
                        <caption className="sr-only">
                            Historial de cargos, pagos, abonos y reversiones
                        </caption>
                        <thead>
                            <tr>
                                <th scope="col">Movimiento</th>
                                <th scope="col">Fecha</th>
                                <th scope="col">Importe</th>
                                <th scope="col">Detalle y responsable</th>
                                {reverse && <th scope="col">Acción</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {entries.data.map((entry) => (
                                <tr key={entry.id}>
                                    <th scope="row">
                                        #{entry.id} ·{" "}
                                        {financialKinds[entry.kind]}
                                        {showMembers && entry.member && (
                                            <p>
                                                {entry.member.user.name} ·{" "}
                                                {entry.member.card_number}
                                            </p>
                                        )}
                                    </th>
                                    <td>{libraryDate(entry.occurred_on)}</td>
                                    <td>
                                        {money(
                                            entry.amount_cents,
                                            entry.currency,
                                        )}
                                    </td>
                                    <td>
                                        <p>{entry.reason}</p>
                                        {entry.reference && (
                                            <p>Referencia: {entry.reference}</p>
                                        )}
                                        <p>
                                            {entry.actor?.name ??
                                                "Cálculo automático"}
                                        </p>
                                        {entry.reversal_of && (
                                            <p>
                                                Revierte el movimiento #
                                                {entry.reversal_of}
                                            </p>
                                        )}
                                        {entry.reversal && (
                                            <p>
                                                Revertido por el movimiento #
                                                {entry.reversal.id}
                                            </p>
                                        )}
                                    </td>
                                    {reverse && (
                                        <td>
                                            {entry.kind !== "reversal" &&
                                                !entry.reversal && (
                                                    <Button
                                                        variant="ghost"
                                                        onClick={(event) =>
                                                            reverse(
                                                                entry,
                                                                event.currentTarget,
                                                            )
                                                        }
                                                        aria-label={`Revertir movimiento ${entry.id}`}
                                                    >
                                                        Revertir
                                                    </Button>
                                                )}
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <EmptyState title="Sin movimientos en esta vista">
                    Los cargos, pagos y abonos registrados aparecerán aquí.
                    Ajusta el periodo o selecciona otra cuenta para
                    consultarlos.
                </EmptyState>
            )}
            <PaginationLinks pagination={entries} />
        </>
    );
}
