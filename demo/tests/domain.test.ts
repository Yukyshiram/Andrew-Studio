import test from "node:test";
import assert from "node:assert/strict";
import books from "../src/data/books.json" with { type: "json" };
import {
  createDemoState,
  executeDemoCommand,
  assertDemoIntegrity,
  availability,
  accountFor,
  queuePosition,
  dueDate,
  overdueDates,
  addDays,
  type DemoState,
  type DemoIntent,
  type ProfileId,
} from "../src/library-domain.ts";

const activeBooks = books.map((book) => book.id);
let sequence = 0;
const run = (
  state: DemoState,
  intent: DemoIntent,
  key = `test-${++sequence}`,
) => executeDemoCommand(state, { ...intent, operationId: key }, activeBooks);
const as = (state: DemoState, profileId: ProfileId): DemoState => ({
  ...state,
  profileId,
});
function issueToLucia(bookId = 1) {
  let state = run(as(createDemoState(), "lucia"), { type: "request", bookId });
  const requestId = state.requests.at(-1)!.id;
  state = run(as(state, "mateo"), { type: "prepare", requestId });
  state = run(state, { type: "issue", requestId });
  return { state, requestId, loanId: state.loans.at(-1)!.id };
}

test("la muestra inicia con inventario, reservas, historial y centavos coherentes", () => {
  const state = createDemoState();
  assertDemoIntegrity(state);
  assert.equal(state.copies.length, 6);
  assert.equal(availability(state, 1), 2);
  assert.equal(availability(state, 2), 0);
  assert.deepEqual(accountFor(state, "nora"), {
    recorded_cents: 25,
    pending_cents: 0,
    balance_cents: 25,
    currency: "MXN",
  });
  assert.equal(
    state.loans.filter((loan) => loan.status === "returned").length,
    1,
  );
});

test("una solicitud no es una entrega: preparar, entregar, devolver y actualizar disponibilidad", () => {
  const original = createDemoState();
  let state = run(as(original, "lucia"), { type: "request", bookId: 1 });
  const requestId = state.requests.at(-1)!.id;
  assert.equal(state.requests.at(-1)!.status, "pending");
  assert.equal(state.loans.length, original.loans.length);
  assert.equal(availability(state, 1), 2);
  assert.throws(
    () => run(as(state, "mateo"), { type: "issue", requestId }),
    /Prepara un ejemplar/,
  );
  state = run(as(state, "mateo"), { type: "prepare", requestId });
  assert.equal(availability(state, 1), 1);
  assert.equal(state.requests.at(-1)!.status, "ready");
  state = run(state, { type: "issue", requestId });
  const loan = state.loans.at(-1)!;
  assert.equal(loan.status, "active");
  assert.equal(loan.dueOn, "2026-12-07");
  assert.equal(availability(state, 1), 1);
  state = run(state, { type: "return", loanId: loan.id, condition: "good" });
  assert.equal(state.loans.at(-1)!.status, "returned");
  assert.equal(availability(state, 1), 2);
  assert.equal(original.requests.length, 3);
  assertDemoIntegrity(state);
});

test("perfiles, titularidad, cupos y duplicados impiden operaciones incongruentes", () => {
  const initial = createDemoState();
  assert.throws(
    () => run(initial, { type: "request", bookId: 1 }),
    /perfil ficticio/,
  );
  let state = run(as(initial, "lucia"), { type: "request", bookId: 1 });
  const requestId = state.requests.at(-1)!.id;
  assert.throws(
    () => run(state, { type: "prepare", requestId }),
    /Biblioteca o Administración/,
  );
  assert.throws(
    () => run(as(state, "nora"), { type: "cancel", requestId }),
    /perfil lector/,
  );
  assert.throws(
    () => run(state, { type: "request", bookId: 1 }),
    /solicitud abierta/,
  );
  assert.throws(
    () =>
      executeDemoCommand(
        state,
        { type: "request", bookId: 5, operationId: "archived" },
        [1, 2, 3],
      ),
    /catálogo activo/,
  );
  state = run(state, { type: "request", bookId: 5 });
  assert.throws(() => run(state, { type: "request", bookId: 7 }), /cupo/);
  state = {
    ...state,
    members: state.members.map((member) =>
      member.id === "lucia" ? { ...member, status: "suspended" } : member,
    ),
  };
  assert.throws(() => run(state, { type: "request", bookId: 7 }), /suspendida/);
});

test("la clave repetida no duplica solicitudes, recogidas, préstamos ni avisos", () => {
  let state = run(
    as(createDemoState(), "lucia"),
    { type: "request", bookId: 1 },
    "request-key",
  );
  const repeated = run(state, { type: "request", bookId: 1 }, "request-key");
  assert.deepEqual(repeated.requests, state.requests);
  const requestId = state.requests.at(-1)!.id;
  state = run(
    as(state, "mateo"),
    { type: "prepare", requestId },
    "prepare-key",
  );
  assert.deepEqual(
    run(state, { type: "prepare", requestId }, "prepare-key").notices,
    state.notices,
  );
  state = run(state, { type: "issue", requestId }, "issue-key");
  const twice = run(state, { type: "issue", requestId }, "issue-key");
  assert.deepEqual(twice.loans, state.loans);
  assert.equal(
    twice.loans.filter(
      (loan) =>
        loan.copyId === state.loans.at(-1)!.copyId && loan.status === "active",
    ).length,
    1,
  );
});

test("la lista aprobada mantiene FIFO y la cancelación libera al siguiente lector", () => {
  let state = createDemoState();
  state.policy.block_overdue = false;
  state = run(as(state, "lucia"), { type: "request", bookId: 5 });
  const first = state.requests.at(-1)!.id;
  state = run(as(state, "mateo"), { type: "prepare", requestId: first });
  state = run(as(state, "nora"), { type: "request", bookId: 5 });
  const second = state.requests.at(-1)!.id;
  state = run(as(state, "mateo"), { type: "prepare", requestId: second });
  assert.equal(
    queuePosition(
      state,
      state.requests.find((row) => row.id === first)!,
    ),
    1,
  );
  assert.equal(
    queuePosition(
      state,
      state.requests.find((row) => row.id === second)!,
    ),
    2,
  );
  state.copies.push({
    id: 501,
    bookId: 5,
    barcode: "DEMO-ARRIVAL-TEST",
    location: "Muestra de prueba",
    condition: "good",
    status: "available",
    requestId: null,
  });
  state = run(state, { type: "refresh" });
  assert.equal(state.requests.find((row) => row.id === first)!.status, "ready");
  assert.equal(
    state.requests.find((row) => row.id === second)!.status,
    "waiting",
  );
  state = run(as(state, "lucia"), { type: "cancel", requestId: first });
  assert.equal(
    state.requests.find((row) => row.id === second)!.status,
    "ready",
  );
  assertDemoIntegrity(state);
});

test("devolver el único ejemplar prepara automáticamente una reserva aprobada", () => {
  let state = run(as(createDemoState(), "lucia"), {
    type: "request",
    bookId: 2,
  });
  const id = state.requests.at(-1)!.id;
  state = run(as(state, "mateo"), { type: "prepare", requestId: id });
  assert.equal(state.requests.at(-1)!.status, "waiting");
  state = run(state, { type: "return", loanId: 1, condition: "good" });
  assert.equal(state.requests.at(-1)!.status, "ready");
  assert.equal(state.copies.find((copy) => copy.id === 201)!.status, "held");
  assert.equal(availability(state, 2), 0);
});

test("el plazo de recogida incluye su último día y vence al siguiente, una sola vez", () => {
  let state = as(createDemoState(), "mateo");
  state = run(state, { type: "advance", days: 3 });
  assert.equal(state.today, "2026-11-25");
  assert.equal(state.requests.find((row) => row.id === 3)!.status, "ready");
  state = run(state, { type: "advance", days: 1 });
  assert.equal(state.requests.find((row) => row.id === 3)!.status, "expired");
  assert.equal(availability(state, 6), 1);
  const notices = state.notices.length,
    entries = state.entries.length;
  state = run(state, { type: "refresh" });
  assert.equal(state.notices.length, notices);
  assert.equal(state.entries.length, entries);
});

test("fechas civiles, cierres, gracia y cambio de año conservan el calendario", () => {
  const terms = createDemoState().policy;
  assert.equal(dueDate("2026-11-20", 2, terms), "2026-11-23");
  assert.equal(
    dueDate("2026-11-20", 2, { ...terms, closure_dates: ["2026-11-23"] }),
    "2026-11-24",
  );
  assert.deepEqual(overdueDates("2026-11-18", "2026-11-22", terms), [
    "2026-11-20",
    "2026-11-21",
  ]);
  assert.equal(addDays("2028-02-28", 1), "2028-02-29");
  assert.throws(() => addDays("2026-02-30", 1), /fecha/);
  assert.throws(
    () =>
      dueDate("2026-11-20", 2, {
        ...terms,
        closed_weekdays: [0, 1, 2, 3, 4, 5, 6],
      }),
    /calendario/,
  );
});

test("renovar conserva condiciones, respeta el máximo y no ignora solicitudes ajenas", () => {
  let { state, loanId } = issueToLucia();
  state.policy.loan_days = 3;
  state = run(as(state, "lucia"), { type: "renew", loanId });
  assert.equal(state.loans.at(-1)!.dueOn, "2026-12-21");
  state = run(state, { type: "renew", loanId });
  assert.equal(state.loans.at(-1)!.renewalCount, 2);
  assert.throws(() => run(state, { type: "renew", loanId }), /máximo/);
  ({ state, loanId } = issueToLucia());
  state.policy.block_overdue = false;
  state = run(as(state, "nora"), { type: "request", bookId: 1 });
  assert.throws(
    () => run(as(state, "lucia"), { type: "renew", loanId }),
    /Otra persona/,
  );
  assert.throws(
    () => run(as(createDemoState(), "nora"), { type: "renew", loanId: 1 }),
    /vencido/,
  );
});

test("las reejecuciones no duplican mora, y pagos/reversiones conservan centavos e historia", () => {
  let state = run(as(createDemoState(), "mateo"), { type: "refresh" });
  assert.equal(state.entries.length, 3);
  state = run(state, { type: "advance", days: 1 });
  assert.equal(accountFor(state, "nora").balance_cents, 50);
  assert.throws(
    () => run(state, { type: "payment", memberId: "nora", amountCents: 1 }),
    /Administración/,
  );
  state = run(
    as(state, "andrea"),
    { type: "payment", memberId: "nora", amountCents: 1 },
    "cent-payment",
  );
  assert.equal(accountFor(state, "nora").balance_cents, 49);
  const payment = state.entries.at(-1)!;
  assert.equal(payment.amountCents, -1);
  assert.deepEqual(
    run(
      state,
      { type: "payment", memberId: "nora", amountCents: 1 },
      "cent-payment",
    ).entries,
    state.entries,
  );
  for (const amountCents of [0.1, 0, -1, 50])
    assert.throws(
      () => run(state, { type: "payment", memberId: "nora", amountCents }),
      /centavos/,
    );
  state = run(state, { type: "reverse", entryId: payment.id });
  assert.equal(accountFor(state, "nora").balance_cents, 50);
  assert.equal(
    state.entries.find((entry) => entry.id === payment.id)!.amountCents,
    -1,
  );
  assert.throws(
    () => run(state, { type: "reverse", entryId: payment.id }),
    /una sola vez/,
  );
});

test("un daño posterior no cobra de nuevo una devolución histórica del mismo ejemplar", () => {
  const { state: issued, loanId } = issueToLucia(3);
  let state = run(issued, { type: "return", loanId, condition: "damaged" });
  assert.equal(
    state.entries.filter((entry) => entry.kind === "damage").length,
    1,
  );
  assert.equal(
    state.entries.find((entry) => entry.kind === "damage")!.loanId,
    loanId,
  );
  assert.equal(accountFor(state, "lucia").balance_cents, 5000);
  state = run(state, { type: "refresh" });
  assert.equal(
    state.entries.filter((entry) => entry.kind === "damage").length,
    1,
  );
  assert.equal(
    state.loans.find((loan) => loan.id === 2)!.returnedCondition,
    "worn",
  );
});

test("la devolución sigue permitida con deuda y las operaciones fallidas no dejan cambios parciales", () => {
  const previous = as(createDemoState(), "andrea");
  previous.today = "2026-11-23";
  const before = structuredClone(previous);
  assert.throws(
    () =>
      run(previous, { type: "payment", memberId: "nora", amountCents: 9999 }),
    /saldo/,
  );
  assert.deepEqual(previous, before);
  let state = as(createDemoState(), "nora");
  assert.throws(() => run(state, { type: "request", bookId: 1 }), /vencido/);
  state = run(as(state, "mateo"), {
    type: "return",
    loanId: 1,
    condition: "lost",
  });
  assert.equal(state.loans.find((loan) => loan.id === 1)!.status, "lost");
  assert.equal(state.copies.find((copy) => copy.id === 201)!.status, "lost");
  assert.throws(
    () => run(as(state, "nora"), { type: "request", bookId: 1 }),
    /saldo ficticio/,
  );
});

test("el reloj y los avisos tienen límites y titularidad explícitos", () => {
  const state = createDemoState();
  assert.throws(
    () => run(as(state, "lucia"), { type: "advance", days: 1 }),
    /Biblioteca o Administración/,
  );
  for (const days of [0, 1.1, 8])
    assert.throws(
      () => run(as(state, "mateo"), { type: "advance", days }),
      /avanzar/,
    );
  assert.throws(
    () => run(as(state, "nora"), { type: "read_notice", noticeId: 1 }),
    /perfil lector/,
  );
  const read = run(as(state, "lucia"), { type: "read_notice", noticeId: 1 });
  assert.equal(read.notices[0].read, true);
  assert.equal(state.notices[0].read, false);
});
