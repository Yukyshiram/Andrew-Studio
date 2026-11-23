import { BookOpen, CalendarDays, ArrowUpRight, Bell } from "lucide-react";
import {
  Badge,
  Button,
  EmptyState,
} from "../../modern/resources/js/components/ui";
import { BookCover } from "../../modern/resources/js/components/book-cover";
import { useCollection } from "./collection";
import { useDemoLibrary, ProfileInvitation } from "./library-context";
import {
  memberFor,
  accountFor,
  copyFor,
  OPEN_REQUESTS,
  queuePosition,
} from "./library-domain";
import { DemoActionButton, DemoStatus, libraryDate, money } from "./library-ui";
import { DemoLink } from "./navigation";
import { Heading } from "./heading";
import "./library.css";

export default function Reader() {
  const { state, run } = useDemoLibrary();
  const { books } = useCollection();
  const member = memberFor(state);
  if (!member)
    return (
      <>
        <Heading eyebrow="UNA CUENTA PARA EXPLORAR" title="Mi biblioteca" />
        <ProfileInvitation />
      </>
    );
  const loans = state.loans.filter((loan) => loan.memberId === member.id);
  const active = loans.filter((loan) => loan.status === "active");
  const requests = state.requests.filter(
    (request) => request.memberId === member.id,
  );
  const open = requests.filter((request) =>
    OPEN_REQUESTS.includes(request.status),
  );
  const account = accountFor(state, member.id);
  const notices = state.notices.filter(
    (notice) => notice.memberId === member.id,
  );
  return (
    <>
      <Heading
        eyebrow="TU ESPACIO DE LECTURA · DEMOSTRACIÓN"
        title="Mi biblioteca"
      >
        Hola, {member.name}. Tus próximos encuentros con los libros, en un solo
        lugar.
      </Heading>
      <section className="panel library-account" aria-label="Cuenta ficticia">
        <div>
          <p className="eyebrow">{member.card}</p>
          <h2>{member.name}</h2>
          <Badge>Membresía ficticia activa</Badge>
        </div>
        <p className="library-context">
          <CalendarDays size={16} aria-hidden="true" /> Reloj de la muestra:{" "}
          <time dateTime={state.today}>{libraryDate(state.today)}</time>
        </p>
      </section>
      <nav className="library-metrics" aria-label="Resumen de mi biblioteca">
        <a href="#mis-prestamos">
          <strong>{active.length}</strong>Préstamos activos
        </a>
        <a href="#mis-solicitudes">
          <strong>{open.length}</strong>Solicitudes abiertas
        </a>
        <a href="#mi-cuenta">
          <strong>{money(account.balance_cents)}</strong>Saldo ficticio MXN
        </a>
      </nav>
      <div className="library-actions">
        <Button asChild>
          <DemoLink href="/catalog">
            <BookOpen size={17} aria-hidden="true" />
            Buscar mi próximo libro
          </DemoLink>
        </Button>
        <Button asChild variant="secondary">
          <DemoLink href="/news">Consultar novedades</DemoLink>
        </Button>
      </div>
      <section
        className="demo-library-section"
        id="mis-prestamos"
        aria-label="Mis préstamos activos"
      >
        <h2>Préstamos activos</h2>
        <p className="muted">
          La fecha cambia al renovar. Biblioteca confirma la devolución física.
        </p>
        <div className="library-records">
          {active.map((loan) => {
            const copy = copyFor(state, loan.copyId),
              book = books.find((book) => book.id === copy.bookId)!;
            return (
              <article
                key={loan.id}
                className="panel library-record demo-loan-card"
                aria-label={`Préstamo de ${book.title}`}
              >
                <DemoLink
                  href={`/catalog/${book.id}`}
                  className="demo-loan-cover"
                  aria-label={`Ver ficha de ${book.title}`}
                >
                  <BookCover book={book} />
                </DemoLink>
                <div>
                  <div className="library-record-heading">
                    <h3>
                      <DemoLink href={`/catalog/${book.id}`}>
                        {book.title}
                      </DemoLink>
                    </h3>
                    <DemoStatus
                      status={loan.dueOn < state.today ? "overdue" : "active"}
                    />
                  </div>
                  <p>
                    Vence el{" "}
                    <time dateTime={loan.dueOn}>{libraryDate(loan.dueOn)}</time>{" "}
                    · {copy.barcode}
                  </p>
                  <p className="library-context">
                    Entregado el {libraryDate(loan.checkedOutOn)} ·
                    Renovaciones: {loan.renewalCount} de{" "}
                    {loan.terms.max_renewals}
                  </p>
                  <div className="library-actions">
                    <DemoActionButton
                      intent={{ type: "renew", loanId: loan.id }}
                      title="Renovar préstamo"
                      description={`Añade ${loan.terms.loan_days} días según las condiciones guardadas, si no hay bloqueos ni solicitudes ajenas.`}
                      disabled={loan.renewalCount >= loan.terms.max_renewals}
                    >
                      Renovar préstamo
                    </DemoActionButton>
                    <DemoLink
                      href="/demo/admin/circulation"
                      className="text-link"
                    >
                      Simular devolución en Biblioteca{" "}
                      <ArrowUpRight size={15} aria-hidden="true" />
                    </DemoLink>
                  </div>
                </div>
              </article>
            );
          })}
          {!active.length && (
            <EmptyState title="Tu próxima lectura te espera">
              Solicita un libro y cambia al perfil de Biblioteca para confirmar
              la entrega ficticia.
            </EmptyState>
          )}
        </div>
      </section>
      <section
        className="demo-library-section"
        id="mis-solicitudes"
        aria-label="Mis solicitudes"
      >
        <h2>Mis solicitudes</h2>
        <div className="library-records">
          {requests
            .filter((request) => request.status !== "fulfilled")
            .slice()
            .reverse()
            .map((request) => {
              const book = books.find((book) => book.id === request.bookId)!;
              return (
                <article
                  key={request.id}
                  className="panel library-record"
                  aria-label={`Solicitud de ${book.title}`}
                >
                  <div className="library-record-heading">
                    <h3>
                      <DemoLink href={`/catalog/${book.id}`}>
                        {book.title}
                      </DemoLink>
                    </h3>
                    <DemoStatus status={request.status} />
                  </div>
                  <p>
                    Solicitada el {libraryDate(request.requestedOn)}
                    {request.readyUntil && request.status === "ready" && (
                      <>
                        {" "}
                        · Recoge hasta el{" "}
                        <time dateTime={request.readyUntil}>
                          {libraryDate(request.readyUntil)}
                        </time>
                        , inclusive.
                      </>
                    )}
                    {request.status === "waiting" && (
                      <>
                        {" "}
                        · Posición {queuePosition(state, request)} de la lista
                        aprobada.
                      </>
                    )}
                  </p>
                  {request.reason && <p>{request.reason}</p>}
                  {request.status === "pending" && (
                    <p className="library-context">
                      Biblioteca debe validarla. Todavía no hay un préstamo ni
                      un ejemplar asignado.
                    </p>
                  )}
                  {OPEN_REQUESTS.includes(request.status) && (
                    <div className="library-actions">
                      <DemoActionButton
                        intent={{ type: "cancel", requestId: request.id }}
                        title="Cancelar solicitud"
                        description="Se libera cualquier ejemplar preparado y se atiende la siguiente reserva elegible."
                      >
                        Cancelar solicitud
                      </DemoActionButton>
                    </div>
                  )}
                </article>
              );
            })}
          {!requests.some((request) => request.status !== "fulfilled") && (
            <EmptyState title="Sin solicitudes por ahora">
              Desde una ficha puedes solicitar un libro o reservar un título.
            </EmptyState>
          )}
        </div>
      </section>
      <section
        className="demo-library-section"
        id="mi-cuenta"
        aria-label="Mis cargos y saldo"
      >
        <h2>Cargos y saldo</h2>
        <p>
          Saldo ficticio: <strong>{money(account.balance_cents)} MXN</strong>.
          No se realiza ningún cobro.
        </p>
        {account.pending_cents > 0 && (
          <p className="library-context">
            Incluye {money(account.pending_cents)} por registrar según el reloj
            de la muestra.
          </p>
        )}
        <div className="demo-ledger-list">
          {state.entries
            .filter((entry) => entry.memberId === member.id)
            .slice()
            .reverse()
            .map((entry) => (
              <div key={entry.id}>
                <span>
                  {entry.reason}
                  <small>{libraryDate(entry.on)}</small>
                </span>
                <strong>{money(entry.amountCents)}</strong>
              </div>
            ))}
        </div>
        {!state.entries.some((entry) => entry.memberId === member.id) && (
          <p className="muted">Tu muestra no tiene movimientos registrados.</p>
        )}
      </section>
      <section
        className="demo-library-section"
        aria-label="Mi historial de préstamos"
      >
        <h2>Historial de préstamos</h2>
        <div className="library-records">
          {loans
            .filter((loan) => loan.status !== "active")
            .slice()
            .reverse()
            .map((loan) => {
              const book = books.find(
                (book) => book.id === copyFor(state, loan.copyId).bookId,
              )!;
              return (
                <article key={loan.id} className="panel library-record">
                  <div className="library-record-heading">
                    <h3>{book.title}</h3>
                    <DemoStatus status={loan.status} />
                  </div>
                  <p>
                    Entrega: {libraryDate(loan.checkedOutOn)} · Cierre:{" "}
                    {libraryDate(loan.returnedOn)}
                  </p>
                </article>
              );
            })}
          {!loans.some((loan) => loan.status !== "active") && (
            <p className="muted">Las devoluciones aparecerán aquí.</p>
          )}
        </div>
      </section>
      <section className="demo-library-section" aria-label="Mis avisos">
        <h2>
          <Bell size={20} aria-hidden="true" /> Avisos de la biblioteca
        </h2>
        <div className="library-records">
          {notices
            .slice()
            .reverse()
            .map((notice) => (
              <article key={notice.id} className="panel library-record">
                <p>{notice.message}</p>
                <p className="library-context">
                  {libraryDate(notice.on)} ·{" "}
                  {notice.read ? "Leído" : "Sin leer"}
                </p>
                {!notice.read && (
                  <Button
                    variant="ghost"
                    onClick={() =>
                      run({ type: "read_notice", noticeId: notice.id })
                    }
                  >
                    Marcar como leído
                  </Button>
                )}
              </article>
            ))}
        </div>
      </section>
    </>
  );
}
