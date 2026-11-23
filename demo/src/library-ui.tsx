import { useRef, useState, type ReactNode } from "react";
import { BookOpen, ArrowUpRight } from "lucide-react";
import { Badge, Button, Dialog } from "../../modern/resources/js/components/ui";
import { libraryDate } from "../../modern/resources/js/library-format";
import { useDemoLibrary } from "./library-context";
import {
  availability,
  memberFor,
  OPEN_REQUESTS,
  profileFor,
  copyFor,
  type DemoIntent,
} from "./library-domain";
import { DemoLink } from "./navigation";

export { libraryDate };
export function money(cents: number, currency = "MXN") {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(
    cents / 100,
  );
}
export const statusLabels: Record<string, string> = {
  pending: "Pendiente de validación",
  waiting: "En lista de espera",
  ready: "Lista para recoger",
  fulfilled: "Entrega confirmada",
  cancelled: "Cancelada",
  rejected: "Rechazada",
  expired: "Plazo vencido",
  active: "Préstamo activo",
  returned: "Devuelto",
  overdue: "Vencido",
  available: "Disponible",
  held: "Preparado",
  loaned: "Prestado",
  repair: "En reparación",
  lost: "Extraviado",
  good: "Buen estado",
  worn: "Desgaste habitual",
  damaged: "Dañado",
};
export function DemoStatus({ status }: { status: string }) {
  return (
    <Badge className={`library-status library-status-${status}`}>
      {statusLabels[status] ?? status}
    </Badge>
  );
}
export function AvailabilityLabel({ bookId }: { bookId: number }) {
  const { state } = useDemoLibrary();
  const available = availability(state, bookId);
  return (
    <span className="book-availability">
      {available
        ? `${available} ${available === 1 ? "ejemplar disponible" : "ejemplares disponibles"}`
        : "Sin ejemplares disponibles"}
      <span className="sr-only"> en la muestra ficticia</span>
    </span>
  );
}
export function BorrowBook({ bookId }: { bookId: number }) {
  const { state, openProfiles } = useDemoLibrary();
  const member = memberFor(state);
  const open = state.requests.find(
    (row) =>
      row.bookId === bookId &&
      row.memberId === member?.id &&
      OPEN_REQUESTS.includes(row.status),
  );
  const available = availability(state, bookId);
  const currentLoan = state.loans.find(
    (loan) =>
      loan.memberId === member?.id &&
      loan.status === "active" &&
      copyFor(state, loan.copyId).bookId === bookId,
  );
  return (
    <section className="library-borrow" aria-label="Disponibilidad y solicitud">
      <p>
        <AvailabilityLabel bookId={bookId} />
      </p>
      <p className="library-context">
        Inventario ficticio. Solicitar no confirma un préstamo: Biblioteca
        valida, prepara y entrega el ejemplar.
      </p>
      {member ? (
        open ? (
          <>
            <DemoStatus status={open.status} />
            <div>
              <DemoLink href="/my-library" className="text-link">
                Consultar mi solicitud{" "}
                <ArrowUpRight size={15} aria-hidden="true" />
              </DemoLink>
            </div>
          </>
        ) : currentLoan ? (
          <>
            <DemoStatus
              status={currentLoan.dueOn < state.today ? "overdue" : "active"}
            />
            <div>
              <DemoLink href="/my-library" className="text-link">
                Consultar mi préstamo{" "}
                <ArrowUpRight size={15} aria-hidden="true" />
              </DemoLink>
            </div>
          </>
        ) : (
          <DemoActionButton
            intent={{ type: "request", bookId }}
            title={available ? "Solicitar libro" : "Reservar título"}
            description="Registraremos una solicitud ficticia pendiente. Si no hay un ejemplar elegible, Biblioteca podrá aprobarla para la lista de espera."
          >
            <BookOpen size={17} aria-hidden="true" />
            {available ? "Solicitar libro" : "Reservar título"}
          </DemoActionButton>
        )
      ) : profileFor(state).role === "visitor" ? (
        <Button
          onClick={(event) => {
            event.currentTarget.focus({ preventScroll: true });
            openProfiles();
          }}
        >
          Elegir perfil para solicitar
        </Button>
      ) : (
        <DemoLink href="/demo/admin/circulation" className="text-link">
          Atender solicitudes en Biblioteca{" "}
          <ArrowUpRight size={15} aria-hidden="true" />
        </DemoLink>
      )}
    </section>
  );
}
export function DemoActionButton({
  intent,
  title,
  description,
  children,
  fields,
  disabled = false,
  variant = "secondary",
}: {
  intent: DemoIntent;
  title: string;
  description: string;
  children: ReactNode;
  fields?: ReactNode;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "ghost" | "destructive";
}) {
  const { run } = useDemoLibrary();
  const [operationId, setOperationId] = useState<string | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const fallback = useRef<HTMLElement | null>(null);
  return (
    <>
      <Button
        ref={trigger}
        variant={variant}
        disabled={disabled}
        onClick={(event) => {
          event.currentTarget.focus({ preventScroll: true });
          fallback.current = document.querySelector("main h1");
          setOperationId(crypto.randomUUID());
        }}
      >
        {children}
      </Button>
      <Dialog
        open={!!operationId}
        onOpenChange={(open) => {
          if (!open) setOperationId(null);
        }}
        title={title}
        description={description}
        returnFocusRef={trigger}
        fallbackFocusRef={fallback}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (operationId) {
              run(intent, operationId);
              setOperationId(null);
            }
          }}
        >
          {fields}
          <div className="dialog-actions">
            <Button
              variant="ghost"
              type="button"
              onClick={() => setOperationId(null)}
            >
              Volver
            </Button>
            <Button type="submit">Confirmar simulación</Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
