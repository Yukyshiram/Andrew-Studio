import type { LibraryTerms } from "../../modern/resources/js/library-types";

export const INITIAL_DAY = "2026-11-22";
export const DEMO_POLICY: LibraryTerms = {
  timezone: "America/Mexico_City",
  currency: "MXN",
  max_loans: 3,
  loan_days: 14,
  max_renewals: 2,
  pickup_days: 3,
  grace_days: 1,
  daily_fine_cents: 25,
  lost_charge_cents: 30000,
  damage_charge_cents: 5000,
  block_balance_cents: 2500,
  block_overdue: true,
  closed_weekdays: [0],
  closure_dates: [],
  version: 1,
};
export const PROFILES = [
  {
    id: "visitor",
    name: "Visitante",
    role: "visitor",
    memberId: null,
    description: "Explorar el catálogo y las novedades.",
  },
  {
    id: "lucia",
    name: "Lucía · Lectora",
    role: "reader",
    memberId: "lucia",
    description:
      "Solicitar, recoger, renovar y consultar tu biblioteca ficticia.",
  },
  {
    id: "nora",
    name: "Nora · Lectora",
    role: "reader",
    memberId: "nora",
    description: "Explorar un vencimiento y su cuenta de demostración.",
  },
  {
    id: "mateo",
    name: "Mateo · Biblioteca",
    role: "librarian",
    memberId: null,
    description:
      "Preparar recogidas, entregar ejemplares y recibir devoluciones.",
  },
  {
    id: "andrea",
    name: "Andrea · Administración",
    role: "admin",
    memberId: null,
    description:
      "Explorar circulación, fichas y movimientos financieros ficticios.",
  },
] as const;
export type ProfileId = (typeof PROFILES)[number]["id"];
export type RequestStatus =
  | "pending"
  | "waiting"
  | "ready"
  | "fulfilled"
  | "cancelled"
  | "rejected"
  | "expired";
export const OPEN_REQUESTS: RequestStatus[] = ["pending", "waiting", "ready"];
export interface DemoMember {
  id: string;
  name: string;
  card: string;
  status: "active" | "suspended";
  expiresOn: string | null;
  loanLimit: number | null;
}
export interface DemoCopy {
  id: number;
  bookId: number;
  barcode: string;
  location: string;
  condition: "good" | "worn" | "damaged" | "lost";
  status: "available" | "held" | "loaned" | "repair" | "lost";
  requestId: number | null;
}
export interface DemoRequest {
  id: number;
  memberId: string;
  bookId: number;
  status: RequestStatus;
  requestedOn: string;
  readyUntil: string | null;
  copyId: number | null;
  reason: string | null;
}
export interface DemoLoan {
  id: number;
  memberId: string;
  copyId: number;
  requestId: number;
  status: "active" | "returned" | "lost";
  checkedOutOn: string;
  dueOn: string;
  returnedOn: string | null;
  renewalCount: number;
  returnedCondition: DemoCopy["condition"] | null;
  terms: LibraryTerms;
}
export interface DemoEntry {
  id: number;
  memberId: string;
  loanId: number | null;
  kind: "overdue" | "damage" | "lost" | "payment" | "reversal";
  amountCents: number;
  on: string;
  reason: string;
  eventKey: string;
  reversalOf: number | null;
}
export interface DemoNotice {
  id: number;
  memberId: string;
  bookId: number;
  on: string;
  message: string;
  read: boolean;
}
export interface DemoNews {
  id: number;
  bookId: number;
  status: "announced" | "ordered" | "in_transit" | "incorporated";
  publicationOn: string | null;
  expectedOn: string | null;
  incorporatedOn: string | null;
  note: string;
}
export interface DemoState {
  today: string;
  profileId: ProfileId;
  policy: LibraryTerms;
  nextId: number;
  members: DemoMember[];
  copies: DemoCopy[];
  requests: DemoRequest[];
  loans: DemoLoan[];
  entries: DemoEntry[];
  notices: DemoNotice[];
  news: DemoNews[];
  operations: string[];
  history: { id: number; on: string; actor: ProfileId; message: string }[];
  feedback: {
    kind: "success" | "error" | "info";
    message: string;
    sequence: number;
  } | null;
}
type Operation = { operationId: string };
export type DemoCommand = Operation &
  (
    | { type: "request"; bookId: number }
    | { type: "prepare" | "issue" | "cancel"; requestId: number }
    | { type: "reject"; requestId: number; reason: string }
    | { type: "renew"; loanId: number }
    | { type: "return"; loanId: number; condition: DemoCopy["condition"] }
    | { type: "advance"; days: number }
    | { type: "refresh" }
    | { type: "payment"; memberId: string; amountCents: number }
    | { type: "reverse"; entryId: number }
    | { type: "read_notice"; noticeId: number }
  );
type WithoutOperation<T> = T extends Operation ? Omit<T, "operationId"> : never;
export type DemoIntent = WithoutOperation<DemoCommand>;
export class DemoRuleError extends Error {}
function fail(message: string): never {
  throw new DemoRuleError(message);
}

export function createDemoState(): DemoState {
  return {
    today: INITIAL_DAY,
    profileId: "visitor",
    policy: structuredClone(DEMO_POLICY),
    nextId: 10,
    members: [
      {
        id: "lucia",
        name: "Lucía Mar",
        card: "DEMO-L001",
        status: "active",
        expiresOn: null,
        loanLimit: null,
      },
      {
        id: "nora",
        name: "Nora Vega",
        card: "DEMO-L002",
        status: "active",
        expiresOn: null,
        loanLimit: null,
      },
    ],
    copies: [
      {
        id: 101,
        bookId: 1,
        barcode: "DEMO-001-A",
        location: "Sala de lectura",
        condition: "good",
        status: "available",
        requestId: null,
      },
      {
        id: 102,
        bookId: 1,
        barcode: "DEMO-001-B",
        location: "Sala de lectura",
        condition: "good",
        status: "available",
        requestId: null,
      },
      {
        id: 201,
        bookId: 2,
        barcode: "DEMO-002-A",
        location: "Ciencia",
        condition: "good",
        status: "loaned",
        requestId: 1,
      },
      {
        id: 301,
        bookId: 3,
        barcode: "DEMO-003-A",
        location: "Filosofía",
        condition: "worn",
        status: "available",
        requestId: null,
      },
      {
        id: 401,
        bookId: 4,
        barcode: "DEMO-004-A",
        location: "Reparación",
        condition: "damaged",
        status: "repair",
        requestId: null,
      },
      {
        id: 601,
        bookId: 6,
        barcode: "DEMO-006-A",
        location: "Mostrador",
        condition: "good",
        status: "held",
        requestId: 3,
      },
    ],
    requests: [
      {
        id: 1,
        memberId: "nora",
        bookId: 2,
        status: "fulfilled",
        requestedOn: "2026-11-04",
        readyUntil: null,
        copyId: 201,
        reason: null,
      },
      {
        id: 2,
        memberId: "lucia",
        bookId: 3,
        status: "fulfilled",
        requestedOn: "2026-10-22",
        readyUntil: null,
        copyId: 301,
        reason: null,
      },
      {
        id: 3,
        memberId: "lucia",
        bookId: 6,
        status: "ready",
        requestedOn: "2026-11-21",
        readyUntil: "2026-11-25",
        copyId: 601,
        reason: null,
      },
    ],
    loans: [
      {
        id: 1,
        memberId: "nora",
        copyId: 201,
        requestId: 1,
        status: "active",
        checkedOutOn: "2026-11-04",
        dueOn: "2026-11-18",
        returnedOn: null,
        renewalCount: 0,
        returnedCondition: null,
        terms: structuredClone(DEMO_POLICY),
      },
      {
        id: 2,
        memberId: "lucia",
        copyId: 301,
        requestId: 2,
        status: "returned",
        checkedOutOn: "2026-10-22",
        dueOn: "2026-11-05",
        returnedOn: "2026-10-30",
        renewalCount: 0,
        returnedCondition: "worn",
        terms: structuredClone(DEMO_POLICY),
      },
    ],
    entries: [
      {
        id: 1,
        memberId: "nora",
        loanId: 1,
        kind: "overdue",
        amountCents: 25,
        on: "2026-11-20",
        reason: "Retraso ficticio del 20 de noviembre",
        eventKey: "overdue:1:2026-11-20",
        reversalOf: null,
      },
      {
        id: 2,
        memberId: "nora",
        loanId: 1,
        kind: "overdue",
        amountCents: 25,
        on: "2026-11-21",
        reason: "Retraso ficticio del 21 de noviembre",
        eventKey: "overdue:1:2026-11-21",
        reversalOf: null,
      },
      {
        id: 3,
        memberId: "nora",
        loanId: null,
        kind: "payment",
        amountCents: -25,
        on: "2026-11-21",
        reason: "Pago parcial ficticio de la muestra",
        eventKey: "sample-payment:1",
        reversalOf: null,
      },
    ],
    notices: [
      {
        id: 1,
        memberId: "lucia",
        bookId: 6,
        on: "2026-11-21",
        message:
          "Tu recogida ficticia está preparada. Consulta su plazo en Mis solicitudes.",
        read: false,
      },
    ],
    news: [
      {
        id: 1,
        bookId: 6,
        status: "incorporated",
        publicationOn: null,
        expectedOn: null,
        incorporatedOn: "2026-11-20",
        note: "Incorporación ficticia: su disponibilidad actual se consulta en la ficha.",
      },
      {
        id: 2,
        bookId: 5,
        status: "ordered",
        publicationOn: null,
        expectedOn: "2026-12-05",
        incorporatedOn: null,
        note: "Pedido de demostración. La fecha de llegada es una estimación ficticia.",
      },
      {
        id: 3,
        bookId: 13,
        status: "announced",
        publicationOn: "2026-12-12",
        expectedOn: "2027-01-08",
        incorporatedOn: null,
        note: "Título, autoría y anuncio completamente ficticios. No es una publicación confirmada.",
      },
    ],
    operations: [],
    history: [],
    feedback: null,
  };
}

export function profileFor(state: DemoState) {
  return PROFILES.find((profile) => profile.id === state.profileId)!;
}
export function isOperator(state: DemoState) {
  return ["librarian", "admin"].includes(profileFor(state).role);
}
export function memberFor(state: DemoState): DemoMember | null {
  return (
    state.members.find((member) => member.id === profileFor(state).memberId) ??
    null
  );
}
export function copyFor(state: DemoState, copyId: number) {
  return (
    state.copies.find((copy) => copy.id === copyId) ??
    fail("No se encontró ese ejemplar de la muestra.")
  );
}
export function availability(state: DemoState, bookId: number) {
  return state.copies.filter(
    (copy) =>
      copy.bookId === bookId &&
      copy.status === "available" &&
      ["good", "worn"].includes(copy.condition),
  ).length;
}
export function queuePosition(state: DemoState, request: DemoRequest) {
  return request.status === "waiting"
    ? state.requests
        .filter(
          (row) => row.bookId === request.bookId && row.status === "waiting",
        )
        .sort((a, b) => a.id - b.id)
        .findIndex((row) => row.id === request.id) + 1
    : null;
}
export function hasOpenCirculation(state: DemoState, bookId: number) {
  return (
    state.requests.some(
      (row) => row.bookId === bookId && OPEN_REQUESTS.includes(row.status),
    ) ||
    state.loans.some(
      (loan) =>
        loan.status === "active" &&
        copyFor(state, loan.copyId).bookId === bookId,
    )
  );
}
export function addDays(day: string, days: number): string {
  const date = new Date(`${day}T12:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(day) ||
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== day ||
    !Number.isInteger(days)
  )
    fail("La fecha de la muestra no es válida.");
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
const isOpen = (day: string, policy: LibraryTerms) =>
  !policy.closed_weekdays.includes(new Date(`${day}T12:00:00Z`).getUTCDay()) &&
  !policy.closure_dates.includes(day);
export function dueDate(
  from: string,
  days: number,
  policy: LibraryTerms,
): string {
  let day = addDays(from, days);
  for (let attempt = 0; attempt < 3660; attempt++, day = addDays(day, 1))
    if (isOpen(day, policy)) return day;
  return fail("El calendario ficticio no tiene un día de apertura válido.");
}
export function overdueDates(
  dueOn: string,
  through: string,
  terms: LibraryTerms,
): string[] {
  const dates: string[] = [];
  for (let day = addDays(dueOn, 1); day <= through; day = addDays(day, 1))
    if (isOpen(day, terms)) dates.push(day);
  return dates.slice(terms.grace_days);
}
function pendingEntries(state: DemoState, loan: DemoLoan) {
  const through = loan.returnedOn ?? state.today;
  const rows = overdueDates(loan.dueOn, through, loan.terms)
    .filter((on) => loan.terms.daily_fine_cents > 0)
    .map((on) => ({
      kind: "overdue" as DemoEntry["kind"],
      on,
      amountCents: loan.terms.daily_fine_cents,
      reason: "Retraso ficticio calculado con el calendario de la muestra",
      eventKey: `overdue:${loan.id}:${on}`,
    }));
  const condition = loan.returnedCondition;
  if (loan.status === "lost" && loan.terms.lost_charge_cents > 0)
    rows.push({
      kind: "lost",
      on: through,
      amountCents: loan.terms.lost_charge_cents,
      reason: "Pérdida ficticia de un ejemplar",
      eventKey: `lost:${loan.id}`,
    });
  if (condition === "damaged" && loan.terms.damage_charge_cents > 0)
    rows.push({
      kind: "damage",
      on: through,
      amountCents: loan.terms.damage_charge_cents,
      reason: "Daño ficticio de un ejemplar",
      eventKey: `damage:${loan.id}`,
    });
  return rows.filter(
    (row) => !state.entries.some((entry) => entry.eventKey === row.eventKey),
  );
}
export function accountFor(state: DemoState, memberId: string) {
  const recorded = state.entries
    .filter((entry) => entry.memberId === memberId)
    .reduce((sum, entry) => sum + entry.amountCents, 0);
  const pending = state.loans
    .filter((loan) => loan.memberId === memberId)
    .flatMap((loan) => pendingEntries(state, loan))
    .reduce((sum, entry) => sum + entry.amountCents, 0);
  return {
    recorded_cents: recorded,
    pending_cents: pending,
    balance_cents: recorded + pending,
    currency: state.policy.currency,
  };
}
function assess(state: DemoState, loan: DemoLoan) {
  for (const row of pendingEntries(state, loan))
    state.entries.push({
      ...row,
      id: state.nextId++,
      memberId: loan.memberId,
      loanId: loan.id,
      reversalOf: null,
    });
}
function notice(state: DemoState, request: DemoRequest, message: string) {
  state.notices.push({
    id: state.nextId++,
    memberId: request.memberId,
    bookId: request.bookId,
    on: state.today,
    message,
    read: false,
  });
}
function eligible(
  state: DemoState,
  memberId: string,
  excludeRequest?: number,
  excludeLoan?: number,
) {
  const member =
    state.members.find((row) => row.id === memberId) ??
    fail("No existe ese perfil de lector ficticio.");
  if (
    member.status !== "active" ||
    (member.expiresOn && member.expiresOn < state.today)
  )
    fail("La membresía ficticia está suspendida o vencida.");
  if (
    state.policy.block_overdue &&
    state.loans.some(
      (loan) =>
        loan.memberId === memberId &&
        loan.status === "active" &&
        loan.dueOn < state.today,
    )
  )
    fail(
      "Hay un préstamo vencido. Puedes devolverlo; después revisa las restricciones de tu cuenta.",
    );
  if (
    state.policy.block_balance_cents > 0 &&
    accountFor(state, memberId).balance_cents > state.policy.block_balance_cents
  )
    fail(
      "El saldo ficticio supera el umbral permitido. La devolución sigue disponible.",
    );
  const used =
    state.loans.filter(
      (loan) =>
        loan.memberId === memberId &&
        loan.status === "active" &&
        loan.id !== excludeLoan,
    ).length +
    state.requests.filter(
      (row) =>
        row.memberId === memberId &&
        OPEN_REQUESTS.includes(row.status) &&
        row.id !== excludeRequest,
    ).length;
  if (used >= (member.loanLimit ?? state.policy.max_loans))
    fail("Alcanzaste el cupo de préstamos y solicitudes de la muestra.");
}
function requireOperator(state: DemoState) {
  if (!isOperator(state))
    fail(
      "Elige el perfil ficticio de Biblioteca o Administración para esta operación.",
    );
}
function requireAdmin(state: DemoState) {
  if (profileFor(state).role !== "admin")
    fail("Esta simulación corresponde al perfil de Administración.");
}
function prepareReady(state: DemoState, request: DemoRequest, copy: DemoCopy) {
  copy.status = "held";
  copy.requestId = request.id;
  request.status = "ready";
  request.copyId = copy.id;
  request.readyUntil = dueDate(
    state.today,
    state.policy.pickup_days,
    state.policy,
  );
  notice(
    state,
    request,
    "Tu recogida está preparada. La entrega física todavía debe confirmarse en Biblioteca.",
  );
}
function refresh(state: DemoState) {
  for (const request of state.requests) {
    const member = state.members.find(
      (member) => member.id === request.memberId,
    )!;
    if (request.status === "ready" && request.readyUntil! < state.today) {
      const copy = copyFor(state, request.copyId!);
      copy.status = "available";
      copy.requestId = null;
      request.status = "expired";
      request.copyId = null;
      notice(
        state,
        request,
        "Venció el plazo de recogida y el ejemplar quedó libre para otra persona.",
      );
    }
    if (
      request.status === "waiting" &&
      (member.status !== "active" ||
        (member.expiresOn && member.expiresOn < state.today))
    ) {
      request.status = "rejected";
      request.reason = "La membresía dejó de estar activa.";
      notice(
        state,
        request,
        "La reserva se cerró porque la membresía ficticia está inactiva.",
      );
    }
  }
  for (const request of state.requests
    .filter((row) => row.status === "waiting")
    .sort((a, b) => a.id - b.id)) {
    const copy = state.copies.find(
      (copy) =>
        copy.bookId === request.bookId &&
        copy.status === "available" &&
        ["good", "worn"].includes(copy.condition),
    );
    if (!copy) continue;
    try {
      eligible(state, request.memberId, request.id);
    } catch (error) {
      if (error instanceof DemoRuleError) continue;
      throw error;
    }
    prepareReady(state, request, copy);
  }
}

/** Simulación local: no autentica personas ni sustituye las políticas del servidor Laravel. */
export function executeDemoCommand(
  previous: DemoState,
  command: DemoCommand,
  activeBookIds: readonly number[],
): DemoState {
  if (!command.operationId)
    fail("Vuelve a abrir la acción para probarla de nuevo.");
  if (previous.operations.includes(command.operationId))
    return {
      ...previous,
      feedback: {
        kind: "info",
        message: "Esta operación simulada ya estaba registrada.",
        sequence: (previous.feedback?.sequence ?? 0) + 1,
      },
    };
  const state = structuredClone(previous);
  const profile = profileFor(state);
  let message = "Simulación actualizada.";
  if (command.type === "request") {
    const member =
      memberFor(state) ??
      fail("Selecciona un perfil ficticio de lectura para solicitar un libro.");
    if (!activeBookIds.includes(command.bookId))
      fail("Esta ficha no está disponible en el catálogo activo.");
    const existing = state.requests.find(
      (row) =>
        row.memberId === member.id &&
        row.bookId === command.bookId &&
        OPEN_REQUESTS.includes(row.status),
    );
    if (existing)
      fail(
        "Ya tienes una solicitud abierta para este título. Consúltala en Mi biblioteca.",
      );
    if (
      state.loans.some(
        (loan) =>
          loan.memberId === member.id &&
          loan.status === "active" &&
          copyFor(state, loan.copyId).bookId === command.bookId,
      )
    )
      fail(
        "Ya tienes un préstamo activo de este título. Consulta sus opciones de renovación.",
      );
    eligible(state, member.id);
    state.requests.push({
      id: state.nextId++,
      memberId: member.id,
      bookId: command.bookId,
      status: "pending",
      requestedOn: state.today,
      readyUntil: null,
      copyId: null,
      reason: null,
    });
    message =
      "Solicitud ficticia registrada. Biblioteca debe validarla y confirmar después la entrega física.";
  } else if (["prepare", "issue", "cancel", "reject"].includes(command.type)) {
    if (!("requestId" in command))
      fail("Selecciona una solicitud de la muestra.");
    const request =
      state.requests.find((row) => row.id === command.requestId) ??
      fail("No se encontró esa solicitud ficticia.");
    if (command.type === "cancel") {
      if (profile.memberId !== request.memberId)
        fail("Cambia al perfil lector que creó esta solicitud ficticia.");
      if (!OPEN_REQUESTS.includes(request.status))
        fail("La solicitud ya está cerrada.");
      if (request.status === "ready") {
        const copy = copyFor(state, request.copyId!);
        copy.status = "available";
        copy.requestId = null;
      }
      request.status = "cancelled";
      request.copyId = null;
      notice(
        state,
        request,
        "Cancelaste tu solicitud ficticia. Si había un ejemplar preparado, quedó libre.",
      );
      refresh(state);
      message = "Solicitud cancelada en la muestra.";
    } else {
      requireOperator(state);
      refresh(state);
      if (command.type === "reject") {
        if (!OPEN_REQUESTS.includes(request.status))
          fail("La solicitud ya está cerrada.");
        if (!command.reason.trim() || command.reason.trim().length > 500)
          fail("Escribe un motivo de rechazo de hasta 500 caracteres.");
        if (request.status === "ready") {
          const copy = copyFor(state, request.copyId!);
          copy.status = "available";
          copy.requestId = null;
        }
        request.status = "rejected";
        request.copyId = null;
        request.reason = command.reason.trim();
        notice(
          state,
          request,
          `Solicitud rechazada en la muestra: ${request.reason}`,
        );
        refresh(state);
        message = "Rechazo ficticio registrado con su motivo.";
      } else if (command.type === "prepare") {
        if (!activeBookIds.includes(request.bookId))
          fail("La ficha está archivada.");
        if (!OPEN_REQUESTS.includes(request.status))
          fail("La solicitud ya está cerrada.");
        if (request.status !== "ready") {
          eligible(state, request.memberId, request.id);
          request.status = "waiting";
          refresh(state);
        }
        message =
          request.status === "ready"
            ? "Ejemplar preparado. Falta confirmar la entrega ficticia."
            : "Reserva aprobada: permanece en lista de espera hasta que haya un ejemplar elegible.";
      } else if (command.type === "issue") {
        if (!activeBookIds.includes(request.bookId))
          fail("La ficha está archivada.");
        if (state.loans.some((loan) => loan.requestId === request.id))
          fail("La entrega ya estaba registrada en la muestra.");
        if (request.status !== "ready" || !request.copyId)
          fail("Prepara un ejemplar antes de confirmar la entrega.");
        eligible(state, request.memberId, request.id);
        const copy = copyFor(state, request.copyId);
        if (copy.status !== "held" || copy.requestId !== request.id)
          fail("El ejemplar ya no está asignado a esta solicitud.");
        copy.status = "loaned";
        request.status = "fulfilled";
        state.loans.push({
          id: state.nextId++,
          memberId: request.memberId,
          copyId: copy.id,
          requestId: request.id,
          status: "active",
          checkedOutOn: state.today,
          dueOn: dueDate(state.today, state.policy.loan_days, state.policy),
          returnedOn: null,
          renewalCount: 0,
          returnedCondition: null,
          terms: structuredClone(state.policy),
        });
        notice(
          state,
          request,
          "La entrega ficticia está confirmada. Tu préstamo ya aparece en Mi biblioteca.",
        );
        message = "Entrega ficticia confirmada. El préstamo está activo.";
      }
    }
  } else if (command.type === "renew" || command.type === "return") {
    const loan =
      state.loans.find((loan) => loan.id === command.loanId) ??
      fail("No se encontró ese préstamo ficticio.");
    if (loan.status !== "active") fail("El préstamo ya está cerrado.");
    const request = state.requests.find((row) => row.id === loan.requestId)!;
    if (command.type === "renew") {
      if (profile.memberId !== loan.memberId && !isOperator(state))
        fail("Selecciona el perfil de este lector o de Biblioteca.");
      eligible(state, loan.memberId, undefined, loan.id);
      if (loan.renewalCount >= loan.terms.max_renewals)
        fail("Este préstamo alcanzó el máximo de renovaciones de la muestra.");
      if (
        state.requests.some(
          (row) =>
            row.bookId === request.bookId &&
            row.memberId !== loan.memberId &&
            OPEN_REQUESTS.includes(row.status),
        )
      )
        fail(
          "Otra persona tiene una solicitud abierta para este título. No se puede renovar.",
        );
      assess(state, loan);
      loan.dueOn = dueDate(
        loan.dueOn > state.today ? loan.dueOn : state.today,
        loan.terms.loan_days,
        loan.terms,
      );
      loan.renewalCount++;
      notice(
        state,
        request,
        "Renovación ficticia registrada. Consulta la nueva fecha de vencimiento en Mi biblioteca.",
      );
      message = "Préstamo renovado en la muestra, conservando sus condiciones.";
    } else {
      requireOperator(state);
      if (!["good", "worn", "damaged", "lost"].includes(command.condition))
        fail("Selecciona la condición de devolución.");
      const copy = copyFor(state, loan.copyId);
      loan.status = command.condition === "lost" ? "lost" : "returned";
      loan.returnedOn = state.today;
      loan.returnedCondition = command.condition;
      copy.condition = command.condition;
      copy.status =
        command.condition === "lost"
          ? "lost"
          : command.condition === "damaged"
            ? "repair"
            : "available";
      copy.requestId = null;
      assess(state, loan);
      refresh(state);
      notice(
        state,
        request,
        "Devolución o cierre ficticio registrado. El historial y los movimientos se conservan.",
      );
      message = "Devolución ficticia registrada y disponibilidad actualizada.";
    }
  } else if (command.type === "advance") {
    requireOperator(state);
    if (
      !Number.isInteger(command.days) ||
      command.days < 1 ||
      command.days > 7 ||
      addDays(state.today, command.days) > addDays(INITIAL_DAY, 90)
    )
      fail(
        "La muestra permite avanzar de uno a siete días, hasta 90 días desde su inicio. Puedes restablecerla.",
      );
    state.today = addDays(state.today, command.days);
    for (const loan of state.loans) assess(state, loan);
    refresh(state);
    message =
      "Día ficticio avanzado. Se actualizaron plazos, reservas y cargos de la muestra.";
  } else if (command.type === "refresh") {
    requireOperator(state);
    for (const loan of state.loans) assess(state, loan);
    refresh(state);
    message =
      "Reservas y cargos ficticios actualizados, sin duplicar movimientos.";
  } else if (command.type === "payment") {
    requireAdmin(state);
    if (!state.members.some((member) => member.id === command.memberId))
      fail("Selecciona un lector ficticio.");
    for (const loan of state.loans.filter(
      (loan) => loan.memberId === command.memberId,
    ))
      assess(state, loan);
    const balance = accountFor(state, command.memberId).balance_cents;
    if (
      !Number.isSafeInteger(command.amountCents) ||
      command.amountCents <= 0 ||
      command.amountCents > balance
    )
      fail(
        "El pago ficticio debe usar centavos enteros y no superar el saldo pendiente.",
      );
    state.entries.push({
      id: state.nextId++,
      memberId: command.memberId,
      loanId: null,
      kind: "payment",
      amountCents: -command.amountCents,
      on: state.today,
      reason: "Pago ficticio registrado en la muestra; no se transfirió dinero",
      eventKey: `payment:${command.operationId}`,
      reversalOf: null,
    });
    message =
      "Pago ficticio registrado. No se realizó ningún cobro ni transferencia.";
  } else if (command.type === "reverse") {
    requireAdmin(state);
    const original =
      state.entries.find((entry) => entry.id === command.entryId) ??
      fail("No se encontró ese movimiento ficticio.");
    if (
      original.kind !== "payment" ||
      state.entries.some((entry) => entry.reversalOf === original.id)
    )
      fail("La muestra permite revertir cada pago una sola vez.");
    state.entries.push({
      id: state.nextId++,
      memberId: original.memberId,
      loanId: null,
      kind: "reversal",
      amountCents: -original.amountCents,
      on: state.today,
      reason:
        "Reversión ficticia de un pago; se conserva el movimiento original",
      eventKey: `reversal:${original.id}`,
      reversalOf: original.id,
    });
    message = "Reversión ficticia registrada, conservando el pago original.";
  } else if (command.type === "read_notice") {
    const row =
      state.notices.find(
        (notice) =>
          notice.id === command.noticeId &&
          notice.memberId === profile.memberId,
      ) ?? fail("Ese aviso no corresponde al perfil lector seleccionado.");
    row.read = true;
    message = "Aviso ficticio marcado como leído.";
  }
  state.operations.push(command.operationId);
  state.history.unshift({
    id: state.nextId++,
    on: state.today,
    actor: state.profileId,
    message,
  });
  state.history = state.history.slice(0, 100);
  state.feedback = {
    kind: "success",
    message,
    sequence: (previous.feedback?.sequence ?? 0) + 1,
  };
  assertDemoIntegrity(state);
  return state;
}

export function assertDemoIntegrity(state: DemoState): void {
  const activeCopies = new Set<number>(),
    openKeys = new Set<string>(),
    events = new Set<string>();
  for (const loan of state.loans.filter((loan) => loan.status === "active")) {
    const copy = copyFor(state, loan.copyId);
    const request = state.requests.find(
      (request) => request.id === loan.requestId,
    );
    if (
      !request ||
      request.status !== "fulfilled" ||
      request.memberId !== loan.memberId ||
      request.bookId !== copy.bookId
    )
      fail("El préstamo perdió su solicitud o su titular.");
    if (
      activeCopies.has(copy.id) ||
      copy.status !== "loaned" ||
      copy.requestId !== loan.requestId
    )
      fail("La muestra intentó asignar un mismo ejemplar a dos préstamos.");
    activeCopies.add(copy.id);
  }
  for (const copy of state.copies) {
    if (copy.status === "loaned" && !activeCopies.has(copy.id))
      fail("Hay un ejemplar prestado sin préstamo activo.");
    if (
      copy.status === "held" &&
      !state.requests.some(
        (request) =>
          request.id === copy.requestId &&
          request.copyId === copy.id &&
          request.status === "ready" &&
          request.bookId === copy.bookId,
      )
    )
      fail("Hay un ejemplar preparado sin solicitud válida.");
    if (!["held", "loaned"].includes(copy.status) && copy.requestId !== null)
      fail("Un ejemplar libre conserva una asignación inválida.");
  }
  for (const request of state.requests.filter((request) =>
    OPEN_REQUESTS.includes(request.status),
  )) {
    const key = `${request.memberId}:${request.bookId}`;
    if (openKeys.has(key))
      fail("La muestra contiene solicitudes abiertas duplicadas.");
    openKeys.add(key);
    if (request.status === "ready") {
      const copy = copyFor(state, request.copyId!);
      if (copy.status !== "held" || copy.requestId !== request.id)
        fail("La recogida no conserva su ejemplar asignado.");
    }
  }
  for (const entry of state.entries) {
    if (
      !state.members.some((member) => member.id === entry.memberId) ||
      !Number.isSafeInteger(entry.amountCents) ||
      entry.amountCents === 0 ||
      events.has(entry.eventKey)
    )
      fail("La muestra contiene un movimiento monetario inválido o duplicado.");
    if (
      entry.kind === "payment" ? entry.amountCents > 0 : entry.amountCents < 0
    )
      fail("El movimiento tiene un signo monetario incorrecto.");
    events.add(entry.eventKey);
  }
}
