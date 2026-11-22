import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { BookCheck, CalendarDays } from "lucide-react";
import {
  Button,
  EmptyState,
  Field,
  Input,
  Select,
  Textarea,
} from "../../modern/resources/js/components/ui";
import { useCollection } from "./collection";
import { useDemoLibrary, ProfileInvitation } from "./library-context";
import {
  isOperator,
  OPEN_REQUESTS,
  copyFor,
  queuePosition,
  profileFor,
  type DemoLoan,
  type DemoRequest,
  type DemoCopy,
} from "./library-domain";
import {
  DemoActionButton,
  DemoStatus,
  libraryDate,
  statusLabels,
} from "./library-ui";
import { DemoLink } from "./navigation";
import { Heading } from "./heading";
import "./library.css";

function RequestActions({ request }: { request: DemoRequest }) {
  const [reason, setReason] = useState("");
  return (
    <div className="library-actions">
      {request.status === "pending" && (
        <DemoActionButton
          intent={{ type: "prepare", requestId: request.id }}
          title="Validar y preparar solicitud"
          description="Si hay un ejemplar elegible y se cumplen las reglas, se prepara la recogida. De lo contrario, queda en la lista de espera aprobada."
        >
          Validar y preparar
        </DemoActionButton>
      )}
      {request.status === "ready" && (
        <DemoActionButton
          intent={{ type: "issue", requestId: request.id }}
          title="Confirmar entrega"
          description="Simula la entrega física del ejemplar asignado. Solo ahora se crea el préstamo y empieza su plazo."
          variant="primary"
        >
          <BookCheck size={16} aria-hidden="true" />
          Confirmar entrega
        </DemoActionButton>
      )}
      {OPEN_REQUESTS.includes(request.status) && (
        <DemoActionButton
          intent={{ type: "reject", requestId: request.id, reason }}
          title="Rechazar solicitud"
          description="La solicitud se cierra y se conserva el motivo. Se libera cualquier ejemplar preparado."
          fields={
            <Field label="Motivo del rechazo" id={`reject-${request.id}`}>
              <Textarea
                id={`reject-${request.id}`}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                required
                maxLength={500}
              />
            </Field>
          }
        >
          Rechazar
        </DemoActionButton>
      )}
    </div>
  );
}
function LoanActions({ loan }: { loan: DemoLoan }) {
  const [condition, setCondition] = useState<DemoCopy["condition"]>("good");
  return (
    <div className="library-actions">
      <DemoActionButton
        intent={{ type: "return", loanId: loan.id, condition }}
        title="Recibir devolución"
        description="Simula la recepción o el cierre por pérdida. Actualiza inventario, lista de espera y cargos ficticios; siempre permite devolver, incluso con deuda."
        variant="primary"
        fields={
          <Field label="Condición al devolver" id={`condition-${loan.id}`}>
            <Select
              id={`condition-${loan.id}`}
              value={condition}
              onChange={(event) =>
                setCondition(event.target.value as DemoCopy["condition"])
              }
            >
              {["good", "worn", "damaged", "lost"].map((value) => (
                <option key={value} value={value}>
                  {statusLabels[value]}
                </option>
              ))}
            </Select>
          </Field>
        }
      >
        Recibir devolución
      </DemoActionButton>
      <DemoActionButton
        intent={{ type: "renew", loanId: loan.id }}
        title="Renovar préstamo"
        description="Revalida membresía, vencimientos, saldo, máximo de renovaciones y solicitudes ajenas."
        disabled={loan.renewalCount >= loan.terms.max_renewals}
      >
        Renovar
      </DemoActionButton>
    </div>
  );
}
export default function Circulation() {
  const { state } = useDemoLibrary();
  const { books } = useCollection();
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "",
    all = params.get("requests") === "all";
  const bookTitle = (id: number) =>
    books.find((book) => book.id === id)?.title ?? "Ficha no disponible";
  const memberName = (id: string) =>
    state.members.find((member) => member.id === id)!.name;
  const matches = (bookId: number, memberId: string) =>
    `${bookTitle(bookId)} ${memberName(memberId)}`
      .toLocaleLowerCase("es")
      .includes(q.toLocaleLowerCase("es"));
  const requests = state.requests.filter(
    (request) =>
      (all || OPEN_REQUESTS.includes(request.status)) &&
      matches(request.bookId, request.memberId),
  );
  const loans = state.loans.filter(
    (loan) =>
      loan.status === "active" &&
      matches(copyFor(state, loan.copyId).bookId, loan.memberId),
  );
  const filter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true, preventScrollReset: true });
  };
  return (
    <>
      <Heading
        eyebrow="EL OTRO LADO DEL MOSTRADOR · DEMOSTRACIÓN"
        title="Circulación"
      >
        Prepara un encuentro con los libros. Cada operación de esta muestra es
        ficticia.
      </Heading>
      {!isOperator(state) ? (
        <ProfileInvitation staff />
      ) : (
        <>
          <section
            className="panel library-account demo-clock"
            aria-label="Reloj de la demostración"
          >
            <div>
              <p className="eyebrow">FECHA FICTICIA</p>
              <h2>
                <CalendarDays size={21} aria-hidden="true" />{" "}
                <time dateTime={state.today}>{libraryDate(state.today)}</time>
              </h2>
              <p className="library-context">
                Sin esperas reales: avanza el reloj para explorar vencimientos,
                cargos y recogidas. Máximo 90 días; domingos cerrados.
              </p>
            </div>
            <div className="library-actions">
              {[1, 7].map((days) => (
                <DemoActionButton
                  key={days}
                  intent={{ type: "advance", days }}
                  title={`Avanzar ${days} ${days === 1 ? "día" : "días"}`}
                  description="Solo cambia el reloj ficticio de esta pestaña. Actualiza cargos y libera recogidas vencidas sin duplicar movimientos."
                >
                  +{days} {days === 1 ? "día" : "días"}
                </DemoActionButton>
              ))}
              <DemoActionButton
                intent={{ type: "refresh" }}
                title="Actualizar reservas y cargos"
                description="Revisa la muestra con su fecha actual, sin avanzar el reloj ni duplicar cargos."
              >
                Actualizar muestra
              </DemoActionButton>
            </div>
          </section>
          <nav className="library-metrics" aria-label="Resumen de circulación">
            <a href="#solicitudes-biblioteca">
              <strong>
                {
                  state.requests.filter(
                    (request) => request.status === "pending",
                  ).length
                }
              </strong>
              Por validar
            </a>
            <a href="#solicitudes-biblioteca">
              <strong>
                {
                  state.requests.filter((request) => request.status === "ready")
                    .length
                }
              </strong>
              Recogidas preparadas
            </a>
            <a href="#prestamos-biblioteca">
              <strong>
                {state.loans.filter((loan) => loan.status === "active").length}
              </strong>
              Préstamos activos
            </a>
            <a href="#inventario-biblioteca">
              <strong>
                {
                  state.copies.filter((copy) => copy.status === "available")
                    .length
                }
              </strong>
              Ejemplares disponibles
            </a>
          </nav>
          <div className="demo-library-filters">
            <Field label="Buscar título o socio" id="circulation-search">
              <Input
                id="circulation-search"
                type="search"
                value={q}
                onChange={(event) => filter("q", event.target.value)}
                maxLength={200}
              />
            </Field>
            <Field label="Mostrar solicitudes" id="request-filter">
              <Select
                id="request-filter"
                value={all ? "all" : "open"}
                onChange={(event) => filter("requests", event.target.value)}
              >
                <option value="open">Abiertas</option>
                <option value="all">Todo el historial</option>
              </Select>
            </Field>
          </div>
          <section
            className="demo-library-section"
            id="solicitudes-biblioteca"
            aria-label="Solicitudes en Biblioteca"
          >
            <h2>Solicitudes y recogidas</h2>
            <div className="library-records">
              {requests.map((request) => (
                <article
                  key={request.id}
                  className="panel library-record"
                  aria-label={`Solicitud de ${bookTitle(request.bookId)} para ${memberName(request.memberId)}`}
                >
                  <div className="library-record-heading">
                    <h3>
                      <DemoLink href={`/catalog/${request.bookId}`}>
                        {bookTitle(request.bookId)}
                      </DemoLink>
                    </h3>
                    <DemoStatus status={request.status} />
                  </div>
                  <p>
                    {memberName(request.memberId)} · Solicitud {request.id} ·{" "}
                    {libraryDate(request.requestedOn)}
                  </p>
                  {request.status === "waiting" && (
                    <p className="library-context">
                      Posición {queuePosition(state, request)} de la lista
                      aprobada. Se asigna el siguiente ejemplar elegible
                      automáticamente.
                    </p>
                  )}
                  {request.status === "ready" && (
                    <p>
                      Recogida hasta {libraryDate(request.readyUntil)},
                      inclusive · {copyFor(state, request.copyId!).barcode}
                    </p>
                  )}
                  {request.reason && <p>{request.reason}</p>}
                  <RequestActions request={request} />
                </article>
              ))}
              {!requests.length && (
                <EmptyState title="El mostrador está al día">
                  No hay solicitudes que coincidan con estos filtros.
                </EmptyState>
              )}
            </div>
          </section>
          <section
            className="demo-library-section"
            id="prestamos-biblioteca"
            aria-label="Préstamos en Biblioteca"
          >
            <h2>Entregas activas y devoluciones</h2>
            <div className="library-records">
              {loans.map((loan) => {
                const copy = copyFor(state, loan.copyId);
                return (
                  <article
                    key={loan.id}
                    className="panel library-record"
                    aria-label={`Préstamo de ${bookTitle(copy.bookId)} para ${memberName(loan.memberId)}`}
                  >
                    <div className="library-record-heading">
                      <h3>{bookTitle(copy.bookId)}</h3>
                      <DemoStatus
                        status={loan.dueOn < state.today ? "overdue" : "active"}
                      />
                    </div>
                    <p>
                      {memberName(loan.memberId)} · {copy.barcode}
                    </p>
                    <p>
                      Vence el{" "}
                      <time dateTime={loan.dueOn}>
                        {libraryDate(loan.dueOn)}
                      </time>{" "}
                      · Renovaciones: {loan.renewalCount} de{" "}
                      {loan.terms.max_renewals}
                    </p>
                    <LoanActions loan={loan} />
                  </article>
                );
              })}
              {!loans.length && (
                <EmptyState title="Sin préstamos activos en esta selección">
                  Confirma una entrega preparada para iniciar el recorrido.
                </EmptyState>
              )}
            </div>
          </section>
          <section
            className="demo-library-section"
            id="inventario-biblioteca"
            aria-label="Inventario de la muestra"
          >
            <h2>Seis ejemplares, historias distintas</h2>
            <p className="muted">
              Las fichas y los ejemplares son entidades distintas. Crear una
              ficha no añade existencias.
            </p>
            <div
              className="table-wrap"
              tabIndex={0}
              role="region"
              aria-label="Tabla de ejemplares ficticios"
            >
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Ejemplar</th>
                    <th scope="col">Título</th>
                    <th scope="col">Ubicación</th>
                    <th scope="col">Estado</th>
                    <th scope="col">Condición</th>
                  </tr>
                </thead>
                <tbody>
                  {state.copies.map((copy) => (
                    <tr key={copy.id}>
                      <td>{copy.barcode}</td>
                      <td>{bookTitle(copy.bookId)}</td>
                      <td>{copy.location}</td>
                      <td>
                        <DemoStatus status={copy.status} />
                      </td>
                      <td>{statusLabels[copy.condition]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section
            className="demo-library-section"
            aria-label="Historial de operaciones de la muestra"
          >
            <h2>Registro de la muestra</h2>
            {state.history.length ? (
              <ol className="demo-operation-list">
                {state.history.slice(0, 12).map((entry) => (
                  <li key={entry.id}>
                    <p>{entry.message}</p>
                    <small>
                      {libraryDate(entry.on)} ·{" "}
                      {profileFor({ ...state, profileId: entry.actor }).name}
                    </small>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="muted">
                Las operaciones que pruebes aparecerán aquí.
              </p>
            )}
          </section>
          <div className="library-actions">
            <Button asChild variant="secondary">
              <DemoLink href="/my-library">
                Volver al recorrido de lectura
              </DemoLink>
            </Button>
            <Button asChild variant="ghost">
              <DemoLink href="/demo/admin/finance">
                Explorar tesorería ficticia
              </DemoLink>
            </Button>
          </div>
        </>
      )}
    </>
  );
}
