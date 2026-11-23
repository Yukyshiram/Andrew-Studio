import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Field,
  Input,
  Select,
  EmptyState,
} from "../../modern/resources/js/components/ui";
import { useDemoLibrary, ProfileInvitation } from "./library-context";
import { accountFor, profileFor } from "./library-domain";
import { DemoActionButton, libraryDate, money } from "./library-ui";
import { Heading } from "./heading";
import "./library.css";

export default function Finance() {
  const { state } = useDemoLibrary();
  const [params, setParams] = useSearchParams();
  const [amount, setAmount] = useState("");
  const member =
    state.members.find((member) => member.id === params.get("member")) ??
    state.members[1];
  const account = accountFor(state, member.id);
  const normalized = amount.trim().replace(",", ".");
  const [whole = "", fraction = ""] = normalized.split(".");
  const cents = /^\d{1,9}(?:\.\d{1,2})?$/.test(normalized)
    ? Number(whole) * 100 + Number(fraction.padEnd(2, "0"))
    : 0;
  const entries = state.entries.filter((entry) => entry.memberId === member.id);
  return (
    <>
      <Heading
        eyebrow="MOVIMIENTOS QUE DEJAN HUELLA · DEMOSTRACIÓN"
        title="Tesorería ficticia"
      >
        Prueba un pago manual y su reversión. No hay pasarela, cobro ni
        transferencia de dinero.
      </Heading>
      {profileFor(state).role !== "admin" ? (
        <ProfileInvitation staff admin />
      ) : (
        <>
          <Field label="Cuenta ficticia" id="finance-member">
            <Select
              id="finance-member"
              value={member.id}
              onChange={(event) => {
                setParams(
                  { member: event.target.value },
                  { replace: true, preventScrollReset: true },
                );
                setAmount("");
              }}
            >
              {state.members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name} · {member.card}
                </option>
              ))}
            </Select>
          </Field>
          <section
            className="library-metrics finance-summary"
            aria-label="Resumen financiero ficticio"
          >
            <div className="panel">
              <span>Saldo registrado</span>
              <strong>{money(account.recorded_cents)}</strong>
            </div>
            <div className="panel">
              <span>Cargos por registrar</span>
              <strong>{money(account.pending_cents)}</strong>
            </div>
            <div className="panel">
              <span>Saldo total · MXN</span>
              <strong>{money(account.balance_cents)}</strong>
            </div>
          </section>
          <section
            className="panel library-record"
            aria-label="Registrar pago ficticio"
          >
            <h2>Explora un pago registrado</h2>
            <p className="library-context">
              Tarifa ficticia: $0.25 MXN por día abierto de retraso, un día de
              gracia y domingos cerrados. El saldo usa centavos enteros.
              Actualiza la muestra en Circulación para registrar cargos
              pendientes.
            </p>
            <div className="demo-payment-form">
              <Field label="Importe ficticio en MXN" id="demo-payment">
                <Input
                  id="demo-payment"
                  inputMode="decimal"
                  placeholder="0.25"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  maxLength={13}
                  aria-describedby="demo-payment-help"
                />
              </Field>
              <DemoActionButton
                intent={{
                  type: "payment",
                  memberId: member.id,
                  amountCents: cents,
                }}
                title="Registrar pago ficticio"
                description={`Registrar ${money(cents)} MXN para ${member.name}. No se realiza un cobro y no se permite superar el saldo.`}
                disabled={cents <= 0 || cents > account.balance_cents}
              >
                Registrar pago ficticio
              </DemoActionButton>
            </div>
            <p id="demo-payment-help" className="library-context">
              Usa hasta dos decimales; por ejemplo, 0.25. El importe no puede
              superar el saldo pendiente.
            </p>
          </section>
          <section
            className="demo-library-section"
            aria-label="Movimientos financieros ficticios"
          >
            <h2>Movimientos de {member.name}</h2>
            <div className="library-records">
              {entries
                .slice()
                .reverse()
                .map((entry) => {
                  const reversed = entries.some(
                    (row) => row.reversalOf === entry.id,
                  );
                  return (
                    <article className="panel library-record" key={entry.id}>
                      <div className="library-record-heading">
                        <h3>{entry.reason}</h3>
                        <strong>{money(entry.amountCents)} MXN</strong>
                      </div>
                      <p className="library-context">
                        Movimiento {entry.id} · {libraryDate(entry.on)}
                        {entry.reversalOf &&
                          ` · Revierte el movimiento ${entry.reversalOf}`}
                        {reversed && " · Revertido; el original se conserva"}
                      </p>
                      {entry.kind === "payment" && !reversed && (
                        <div className="library-actions">
                          <DemoActionButton
                            intent={{ type: "reverse", entryId: entry.id }}
                            title="Revertir pago ficticio"
                            description="Añade un movimiento inverso y conserva el pago original. Cada pago se puede revertir una sola vez."
                          >
                            Revertir pago
                          </DemoActionButton>
                        </div>
                      )}
                    </article>
                  );
                })}
              {!entries.length && (
                <EmptyState title="Una cuenta sin movimientos">
                  Los cargos y pagos ficticios que pruebes aparecerán aquí.
                </EmptyState>
              )}
            </div>
          </section>
        </>
      )}
    </>
  );
}
