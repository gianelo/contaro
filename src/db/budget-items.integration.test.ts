// @vitest-environment node
import { afterAll, expect, it } from "vitest";
import {
  FixedItemAlreadyPaidError,
  isPaid,
  UnplannableBudgetItemError,
} from "@/domain/budget/budget";
import { calendarDate, month } from "@/domain/calendar/month";
import { money } from "@/domain/money/money";
import { createDatabase, databaseUrl } from "./connection";
import { memberFromGoogle } from "./members";
import { createSpaceForMember } from "./spaces";
import { addCategoryToSpace, catalogueForSpace } from "./categories";
import { expected } from "@/domain/budget/budget";
import { movementsInMonth, strikeMovementInSpace } from "./movements";
import { ClosedMonthError, closeMonthInSpace } from "./closed-months";
import {
  amendBudgetItemInSpace,
  amendFixedItemInSpace,
  budgetItemsInMonth,
  budgetItemsInMonthForSpaces,
  copyPlanIntoMonth,
  findBudgetItemInSpace,
  latestPlannedMonthBefore,
  payFixedItemInSpace,
  planBudgetItemInSpace,
  planFixedItemInSpace,
  removeBudgetItemFromSpace,
} from "./budget-items";

// Run with `pnpm test:db`, which starts Postgres first.
const { db, sql } = createDatabase(databaseUrl(), { max: 1 });

afterAll(async () => {
  await sql.end();
});

const SEPTEMBER = month("2026-09");
const OCTOBER = month("2026-10");

/** The database outlives a run, so every test invents its own Space. */
let next = 0;
const aMember = (name: string) =>
  memberFromGoogle(db, {
    subject: `budget-${process.pid}-${Date.now()}-${next++}`,
    email: `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
    name,
  });

async function aSpaceWithACategory(name: string, currency = "ARS") {
  const member = await aMember(name);
  const space = await createSpaceForMember(db, member.id, { name, currency });
  const catalogue = await catalogueForSpace(db, space.id);
  const groceries = catalogue
    .flatMap((branch) => branch.children)
    .find(
      (child) =>
        child.label.kind === "catalogue" && child.label.slug === "food.groceries",
    );

  if (!groceries) throw new Error("The shipped catalogue has no groceries.");

  return { member, space, categoryId: groceries.id };
}

it("plans a Variable item and reads the month back", async () => {
  const { space, categoryId } = await aSpaceWithACategory("Planificado");

  const planned = await planBudgetItemInSpace(db, space, {
    spaceId: space.id,
    month: SEPTEMBER,
    categoryId,
    amount: 240_000_00,
    name: "Súper semana 1",
  });

  // The name is part of the row and not of the Category (#79): it is written,
  // it survives the round trip, and it is what tells one week of groceries
  // from the next.
  expect(planned).toEqual({
    kind: "variable",
    id: expect.any(String),
    spaceId: space.id,
    month: SEPTEMBER,
    categoryId,
    amount: money(240_000_00, "ARS"),
    name: "Súper semana 1",
  });
  expect(await budgetItemsInMonth(db, space, SEPTEMBER)).toEqual([planned]);
});

it("keeps a month's plan out of the months around it", async () => {
  const { space, categoryId } = await aSpaceWithACategory("Meses");
  const item = { spaceId: space.id, categoryId, amount: 100_00, name: "Súper" };

  await planBudgetItemInSpace(db, space, { ...item, month: SEPTEMBER });

  expect(await budgetItemsInMonth(db, space, OCTOBER)).toEqual([]);
});

it("takes several items on one Category, which is how a month is planned in weeks", async () => {
  const { space, categoryId } = await aSpaceWithACategory("Semanas");
  const week = { spaceId: space.id, month: SEPTEMBER, categoryId, amount: 60_000_00 };

  await planBudgetItemInSpace(db, space, { ...week, name: "Súper semana 1" });
  await planBudgetItemInSpace(db, space, { ...week, name: "Súper semana 2" });

  const planned = await budgetItemsInMonth(db, space, SEPTEMBER);
  expect(planned).toHaveLength(2);
  // Two rows on one Category, and now two rows a person can tell apart.
  expect(planned.map((one) => one.name)).toEqual([
    "Súper semana 1",
    "Súper semana 2",
  ]);
});

it("refuses a Category another Space added", async () => {
  const { space } = await aSpaceWithACategory("Propia");
  const other = await aSpaceWithACategory("Ajena");
  const theirs = await addCategoryToSpace(db, {
    spaceId: other.space.id,
    parentId: null,
    name: "Asado",
  });

  await expect(
    planBudgetItemInSpace(db, space, {
      spaceId: space.id,
      month: SEPTEMBER,
      categoryId: theirs.id,
      amount: 100_00,
      name: "Asado",
    }),
  ).rejects.toThrow(UnplannableBudgetItemError);
});

it("corrects what a Category is expected to cost", async () => {
  const { space, categoryId } = await aSpaceWithACategory("Corrige");
  const planned = await planBudgetItemInSpace(db, space, {
    spaceId: space.id,
    month: SEPTEMBER,
    categoryId,
    amount: 240_000_00,
    name: "Súper semana 1",
  });

  expect(
    await amendBudgetItemInSpace(db, space, planned.id, { amount: 300_000_00 }),
  ).toEqual({ ...planned, amount: money(300_000_00, "ARS") });
});

it("corrects what a Variable item is called", async () => {
  const { space, categoryId } = await aSpaceWithACategory("Renombra");
  const planned = await planBudgetItemInSpace(db, space, {
    spaceId: space.id,
    month: SEPTEMBER,
    categoryId,
    amount: 60_000_00,
    name: "Súper semana 1",
  });

  const corrected = await amendBudgetItemInSpace(db, space, planned.id, {
    name: "Súper semana 2",
  });

  expect(corrected).toEqual({ ...planned, name: "Súper semana 2" });
  // Read back through the query the screen reads through, because a correction
  // only the RETURNING agrees with is not a correction.
  expect(await findBudgetItemInSpace(db, space, planned.id)).toEqual(corrected);
});

it("answers no such item for one in another Space, rather than refusing it", async () => {
  const { space } = await aSpaceWithACategory("Mía");
  const other = await aSpaceWithACategory("Suya");
  const theirs = await planBudgetItemInSpace(db, other.space, {
    spaceId: other.space.id,
    month: SEPTEMBER,
    categoryId: other.categoryId,
    amount: 100_00,
    name: "Súper",
  });

  expect(await amendBudgetItemInSpace(db, space, theirs.id, { amount: 200_00 }))
    .toBeNull();
  expect(await removeBudgetItemFromSpace(db, space, theirs.id)).toBe(false);
  // And it is still standing in the Space it belongs to.
  expect(await budgetItemsInMonth(db, other.space, SEPTEMBER)).toEqual([theirs]);
});

it("removes an item from the plan, leaving no trace", async () => {
  const { space, categoryId } = await aSpaceWithACategory("Saca");
  const planned = await planBudgetItemInSpace(db, space, {
    spaceId: space.id,
    month: SEPTEMBER,
    categoryId,
    amount: 100_00,
    name: "Súper",
  });

  expect(await removeBudgetItemFromSpace(db, space, planned.id)).toBe(true);
  expect(await budgetItemsInMonth(db, space, SEPTEMBER)).toEqual([]);
});

const TODAY = calendarDate("2026-09-18");

const aFixedItem = async (
  space: Awaited<ReturnType<typeof aSpaceWithACategory>>["space"],
  categoryId: string,
  changes: { name?: string; amount?: number; dueDay?: number } = {},
) =>
  planFixedItemInSpace(db, space, {
    spaceId: space.id,
    month: SEPTEMBER,
    categoryId,
    amount: changes.amount ?? 1_800_000_00,
    name: changes.name ?? "Arriendo",
    dueDay: changes.dueDay ?? 1,
  });

it("plans a Fixed item and reads it back as one", async () => {
  const { space, categoryId } = await aSpaceWithACategory("Fijo");

  const planned = await aFixedItem(space, categoryId);

  expect(planned).toEqual({
    kind: "fixed",
    id: expect.any(String),
    spaceId: space.id,
    month: SEPTEMBER,
    categoryId,
    amount: money(1_800_000_00, "ARS"),
    name: "Arriendo",
    dueOn: "2026-09-01",
    payment: null,
  });

  // Read back through the same query the screen reads through: the kind has
  // to survive the round trip, or the month's plan comes back as one kind.
  const [read] = await budgetItemsInMonth(db, space, SEPTEMBER);
  expect(read).toEqual(planned);
});

it("reads both kinds as one month's plan", async () => {
  const { space, categoryId } = await aSpaceWithACategory("Dos clases");

  await planBudgetItemInSpace(db, space, {
    spaceId: space.id,
    month: SEPTEMBER,
    categoryId,
    amount: 240_000_00,
    name: "Súper",
  });
  await aFixedItem(space, categoryId, { name: "Netflix", amount: 44_900_00 });

  expect(
    (await budgetItemsInMonth(db, space, SEPTEMBER)).map((item) => item.kind),
  ).toEqual(["variable", "fixed"]);
});

it("refuses a due day the month being planned does not have", async () => {
  const { space, categoryId } = await aSpaceWithACategory("Febrero corto");

  await expect(
    planFixedItemInSpace(db, space, {
      spaceId: space.id,
      month: month("2026-02"),
      categoryId,
      amount: 44_900_00,
      name: "Netflix",
      dueDay: 30,
    }),
  ).rejects.toThrow(UnplannableBudgetItemError);
});

it("marks a Fixed item paid, which creates exactly one Movement", async () => {
  const { member, space, categoryId } = await aSpaceWithACategory("Pagando");
  const item = await aFixedItem(space, categoryId);

  const movement = await payFixedItemInSpace(
    db,
    { space, recordedBy: member.id, today: TODAY },
    item.id,
  );

  // The Movement is a Movement in every respect: it carries who typed it in
  // and whose money it was, exactly as one recorded by hand does (#13).
  expect(movement).toMatchObject({
    spaceId: space.id,
    direction: "expense",
    categoryId,
    amount: money(1_800_000_00, "ARS"),
    occurredOn: TODAY,
    recordedBy: member.id,
    attributedTo: member.id,
  });

  expect(await movementsInMonth(db, space, SEPTEMBER)).toHaveLength(1);

  // And the item now says so, by holding the Movement rather than a flag.
  const paid = await findBudgetItemInSpace(db, space, item.id);
  expect(paid?.kind === "fixed" && isPaid(paid)).toBe(true);
  expect(paid?.kind === "fixed" && paid.payment?.movementId).toBe(movement?.id);
});

/*
 * The whole path #49 asks for: plan it, pay it, strike the payment out, and
 * read the plan back. It is one test and not three because the disagreement
 * it is about only exists between the halves -- each of them, asked on its
 * own, has always been right.
 */
it("says a Fixed item is pending again once its Movement is struck out", async () => {
  const { member, space, categoryId } = await aSpaceWithACategory("Anulando");
  const item = await aFixedItem(space, categoryId);

  const movement = await payFixedItemInSpace(
    db,
    { space, recordedBy: member.id, today: TODAY },
    item.id,
  );
  if (!movement) throw new Error("The Fixed item was not paid.");

  expect(
    await strikeMovementInSpace(db, space.id, movement.id, member.id),
  ).toBe(true);

  // The ledger already agreed: a struck Movement counts towards nothing.
  expect(await movementsInMonth(db, space, SEPTEMBER)).toHaveLength(0);

  // And now the plan says the same thing, in both of the ways it is read.
  const read = await findBudgetItemInSpace(db, space, item.id);
  expect(read?.kind === "fixed" && isPaid(read)).toBe(false);

  const [listed] = await budgetItemsInMonth(db, space, SEPTEMBER);
  expect(listed?.kind === "fixed" && isPaid(listed)).toBe(false);

  // Including the read the Space list is drawn from (#38), which is a third
  // query and would have been a third place for the two halves to disagree.
  const [across] = await budgetItemsInMonthForSpaces(db, [space], SEPTEMBER)
    .then((plans) => plans.get(space.id) ?? []);
  expect(across?.kind === "fixed" && isPaid(across)).toBe(false);

  // The pointer itself is untouched: striking a Movement writes to the
  // ledger and never to a plan (ADR-0031).
  expect(read?.kind === "fixed" && read.payment?.movementId).toBe(movement.id);
});

it("lets a Fixed item whose payment was struck out be paid again", async () => {
  const { member, space, categoryId } = await aSpaceWithACategory("De nuevo");
  const item = await aFixedItem(space, categoryId);
  const recorder = { space, recordedBy: member.id, today: TODAY };

  const first = await payFixedItemInSpace(db, recorder, item.id);
  if (!first) throw new Error("The Fixed item was not paid.");
  await strikeMovementInSpace(db, space.id, first.id, member.id);

  const second = await payFixedItemInSpace(db, recorder, item.id);

  // A payment and not an undo: an ordinary second Movement, and the struck
  // first one still in the ledger with nothing pointing at it any more.
  expect(second?.id).not.toBe(first.id);
  expect(await movementsInMonth(db, space, SEPTEMBER)).toHaveLength(1);

  // The pointer moved rather than doubled, which is what keeps
  // `budget_items_movement_pays_one_item` satisfiable at all.
  const paid = await findBudgetItemInSpace(db, space, item.id);
  expect(paid?.kind === "fixed" && isPaid(paid)).toBe(true);
  expect(paid?.kind === "fixed" && paid.payment?.movementId).toBe(second?.id);

  // And it is settled again: a third tap is refused exactly as a second one
  // on a standing payment is.
  await expect(payFixedItemInSpace(db, recorder, item.id)).rejects.toThrow(
    FixedItemAlreadyPaidError,
  );
  expect(await movementsInMonth(db, space, SEPTEMBER)).toHaveLength(1);
});

it("creates no second Movement when an item is marked paid twice", async () => {
  const { member, space, categoryId } = await aSpaceWithACategory("Dos toques");
  const item = await aFixedItem(space, categoryId);
  const recorder = { space, recordedBy: member.id, today: TODAY };

  await payFixedItemInSpace(db, recorder, item.id);

  await expect(
    payFixedItemInSpace(db, recorder, item.id),
  ).rejects.toThrow(FixedItemAlreadyPaidError);

  // The whole point: the second tap left nothing behind in the ledger.
  expect(await movementsInMonth(db, space, SEPTEMBER)).toHaveLength(1);
});

it("has no such item to pay in a Space it was not planned in", async () => {
  const { space, categoryId } = await aSpaceWithACategory("Suyo");
  const other = await aSpaceWithACategory("De otro");
  const item = await aFixedItem(space, categoryId);

  // Not found rather than forbidden: an item in a Space the asker is not in
  // must read the same as one that never existed.
  expect(
    await payFixedItemInSpace(
      db,
      { space: other.space, recordedBy: other.member.id, today: TODAY },
      item.id,
    ),
  ).toBeNull();

  expect(await movementsInMonth(db, other.space, SEPTEMBER)).toHaveLength(0);
});

it("has nothing to pay where the item is a Variable one", async () => {
  const { member, space, categoryId } = await aSpaceWithACategory("Variable");
  const item = await planBudgetItemInSpace(db, space, {
    spaceId: space.id,
    month: SEPTEMBER,
    categoryId,
    amount: 240_000_00,
    name: "Súper",
  });

  expect(
    await payFixedItemInSpace(
      db,
      { space, recordedBy: member.id, today: TODAY },
      item.id,
    ),
  ).toBeNull();
});

it("refuses a correction to a Fixed item rather than stripping it", async () => {
  const { space, categoryId } = await aSpaceWithACategory("Sin corregir");
  const item = await aFixedItem(space, categoryId);

  // The Variable item's correction asks for a Category and an amount and
  // nothing else. Letting one through here would save the row with its name,
  // its day and its payment quietly left out.
  await expect(
    amendBudgetItemInSpace(db, space, item.id, { amount: 1_000_00 }),
  ).rejects.toThrow(UnplannableBudgetItemError);
});

it("creates one Movement when two thumbs mark the same item paid at once", async () => {
  const { member, space, categoryId } = await aSpaceWithACategory("Dos pulgares");
  const item = await aFixedItem(space, categoryId);
  const recorder = { space, recordedBy: member.id, today: TODAY };

  // A second connection, so the two really do race: on one pooled connection
  // Postgres would serialise them and the gap this is about would not exist.
  const other = createDatabase(databaseUrl(), { max: 1 });

  try {
    const both = await Promise.allSettled([
      payFixedItemInSpace(db, recorder, item.id),
      payFixedItemInSpace(other.db, recorder, item.id),
    ]);

    // One wins, and the loser is told the truth rather than told to try
    // again: its own Movement was rolled back with its transaction.
    expect(both.filter((one) => one.status === "fulfilled")).toHaveLength(1);
    const lost = both.find((one) => one.status === "rejected");
    expect(lost?.status === "rejected" && lost.reason).toBeInstanceOf(
      FixedItemAlreadyPaidError,
    );

    expect(await movementsInMonth(db, space, SEPTEMBER)).toHaveLength(1);
  } finally {
    await other.sql.end();
  }
});

/*
 * The Space list reads every Space's plan at once (#38), so that landing on it
 * costs the same whether somebody has one Space or four.
 */

it("reads several Spaces' plans in one go, each under its own Space", async () => {
  const casa = await aSpaceWithACategory("Plan Casa", "ARS");
  const viaje = await aSpaceWithACategory("Plan Viaje", "USD");

  await planBudgetItemInSpace(db, casa.space, {
    spaceId: casa.space.id,
    month: SEPTEMBER,
    categoryId: casa.categoryId,
    amount: 240_000_00,
    name: "Súper",
  });
  await planBudgetItemInSpace(db, viaje.space, {
    spaceId: viaje.space.id,
    month: SEPTEMBER,
    categoryId: viaje.categoryId,
    amount: 800_00,
    name: "Comidas",
  });

  const grouped = await budgetItemsInMonthForSpaces(
    db,
    [casa.space, viaje.space],
    SEPTEMBER,
  );

  expect(expected(grouped.get(casa.space.id) ?? [], "ARS")).toEqual(
    money(240_000_00, "ARS"),
  );
  expect(expected(grouped.get(viaje.space.id) ?? [], "USD")).toEqual(
    money(800_00, "USD"),
  );
});

it("holds a batch to the month it was asked about", async () => {
  const { space, categoryId } = await aSpaceWithACategory("Plan Mes");

  await planBudgetItemInSpace(db, space, {
    spaceId: space.id,
    month: SEPTEMBER,
    categoryId,
    amount: 100_000_00,
    name: "Súper",
  });

  const grouped = await budgetItemsInMonthForSpaces(db, [space], OCTOBER);

  expect(grouped.get(space.id) ?? []).toHaveLength(0);
});

// The acceptance criterion a blank card would fail: a Space nobody has planned
// a month for still owes a figure, and zero in its own money is one.
it("leaves a Space nobody has planned for with nothing, which totals zero", async () => {
  const { space } = await aSpaceWithACategory("Plan Vacio");

  const grouped = await budgetItemsInMonthForSpaces(db, [space], SEPTEMBER);

  expect(expected(grouped.get(space.id) ?? [], "ARS")).toEqual(
    money(0, "ARS"),
  );
});

it("asks nothing at all when there are no Spaces to ask about", async () => {
  await expect(
    budgetItemsInMonthForSpaces(db, [], SEPTEMBER),
  ).resolves.toEqual(new Map());
});

it("corrects all four of a Fixed item's questions at once", async () => {
  const { space, categoryId } = await aSpaceWithACategory("Corrigiendo");
  const item = await aFixedItem(space, categoryId, { amount: 1_800_00 });

  const other = await addCategoryToSpace(db, {
    spaceId: space.id,
    parentId: null,
    name: "Mate",
  });

  const corrected = await amendFixedItemInSpace(db, space, item.id, {
    amount: 1_800_000_00,
    name: "Arriendo y expensas",
    dueDay: 5,
    categoryId: other.id,
  });

  expect(corrected).toEqual({
    kind: "fixed",
    id: item.id,
    spaceId: space.id,
    month: SEPTEMBER,
    categoryId: other.id,
    amount: money(1_800_000_00, "ARS"),
    name: "Arriendo y expensas",
    dueOn: "2026-09-05",
    payment: null,
  });

  // Read back through the query the screen reads through, because a correction
  // that only the RETURNING agrees with is not a correction.
  expect(await findBudgetItemInSpace(db, space, item.id)).toEqual(corrected);
});

it("reads a Fixed item of another Space as one that never existed", async () => {
  const { space, categoryId } = await aSpaceWithACategory("Ajeno");
  const item = await aFixedItem(space, categoryId);
  const { space: other } = await aSpaceWithACategory("Otro");

  await expect(
    amendFixedItemInSpace(db, other, item.id, { amount: 1 }),
  ).resolves.toBeNull();
});

it("refuses to correct a Fixed item while its payment stands", async () => {
  const { member, space, categoryId } = await aSpaceWithACategory("Ya pagado");
  const item = await aFixedItem(space, categoryId);

  await payFixedItemInSpace(
    db,
    { space, recordedBy: member.id, today: TODAY },
    item.id,
  );

  await expect(
    amendFixedItemInSpace(db, space, item.id, { amount: 1_800_00 }),
  ).rejects.toThrow(FixedItemAlreadyPaidError);

  // And nothing landed: a refused correction is not half of one.
  const read = await findBudgetItemInSpace(db, space, item.id);
  expect(read?.amount).toEqual(money(1_800_000_00, "ARS"));
});

/*
 * The trap this ticket had to walk past. A write reads its own row back
 * through `asPending`, which was true while `amendItem` refused the only kind
 * that can carry a payment. Correct an item whose Movement was struck out and
 * that stops being true: the row comes back with a `movement_id` and no
 * `struck_at`, which is exactly how a *paid* item reads.
 */
it("keeps a struck payment struck across a correction", async () => {
  const { member, space, categoryId } = await aSpaceWithACategory("Anulado");
  const item = await aFixedItem(space, categoryId);

  const movement = await payFixedItemInSpace(
    db,
    { space, recordedBy: member.id, today: TODAY },
    item.id,
  );
  if (!movement) throw new Error("The Fixed item was not paid.");
  await strikeMovementInSpace(db, space.id, movement.id, member.id);

  const corrected = await amendFixedItemInSpace(db, space, item.id, {
    amount: 1_900_000_00,
  });

  expect(corrected?.kind === "fixed" && isPaid(corrected)).toBe(false);
  expect(corrected?.payment?.movementId).toBe(movement.id);
  expect(corrected).toEqual(await findBudgetItemInSpace(db, space, item.id));
});

it("takes a pending Fixed item off the plan", async () => {
  const { space, categoryId } = await aSpaceWithACategory("Sacando fijo");
  const item = await aFixedItem(space, categoryId);

  expect(await removeBudgetItemFromSpace(db, space, item.id)).toBe(true);
  expect(await budgetItemsInMonth(db, space, SEPTEMBER)).toEqual([]);
});

it("refuses to take a paid Fixed item off the plan, and keeps its Movement", async () => {
  const { member, space, categoryId } = await aSpaceWithACategory("Pagado fijo");
  const item = await aFixedItem(space, categoryId);

  const movement = await payFixedItemInSpace(
    db,
    { space, recordedBy: member.id, today: TODAY },
    item.id,
  );
  if (!movement) throw new Error("The Fixed item was not paid.");

  await expect(
    removeBudgetItemFromSpace(db, space, item.id),
  ).rejects.toThrow(FixedItemAlreadyPaidError);

  // The item is still on the plan, and the money it spent is still in the
  // ledger. A plan being tidied does not take a Movement with it.
  expect(await budgetItemsInMonth(db, space, SEPTEMBER)).toHaveLength(1);
  expect(await movementsInMonth(db, space, SEPTEMBER)).toHaveLength(1);
});

it("lets an item whose payment was struck out be taken off the plan", async () => {
  const { member, space, categoryId } = await aSpaceWithACategory("Anulado y fuera");
  const item = await aFixedItem(space, categoryId);

  const movement = await payFixedItemInSpace(
    db,
    { space, recordedBy: member.id, today: TODAY },
    item.id,
  );
  if (!movement) throw new Error("The Fixed item was not paid.");
  await strikeMovementInSpace(db, space.id, movement.id, member.id);

  expect(await removeBudgetItemFromSpace(db, space, item.id)).toBe(true);
  expect(await budgetItemsInMonth(db, space, SEPTEMBER)).toEqual([]);
});

// The floor under the domain. Every test above goes through `planItem` or
// `planFixedItem`; this one goes round them, straight to SQL, which is the
// path a migration written in a hurry or a psql session takes.

it("refuses, in the database itself, a Budget item that names no kind", async () => {
  // The Space, the Category and the amount are all fine, so 0009's
  // `DEFAULT 'variable'` would have let this row in as a Variable item. 0011
  // dropped it (#47): the kind `planItem` and `planFixedItem` each say by name
  // is said here too.
  const { space, categoryId } = await aSpaceWithACategory("Sin especie");

  await expect(
    sql`
      INSERT INTO budget_items (space_id, month, category_id, amount)
      VALUES (${space.id}, '2026-09', ${categoryId}, 240000)
    `,
  ).rejects.toThrow(/null value in column "kind"/);
});

it("refuses, in the database itself, a Budget item that is called nothing", async () => {
  const { space, categoryId } = await aSpaceWithACategory("Sin nombre");

  // Both kinds, because the name stopped belonging to one of them (#79), and
  // both halves of the rule, because they are two different refusals. A name
  // that is not there is refused by the column, which is what 0013 made
  // `NOT NULL` once the bridge under it came down (#90); a name that is only
  // spaces is refused by the check, which is the half that was always
  // reachable.
  for (const { kind, dueOn } of [
    { kind: "variable", dueOn: null },
    { kind: "fixed", dueOn: "2026-09-01" },
  ] as const) {
    // The two inserts are written out rather than built by a helper: which
    // columns a statement names is the whole of what is being refused here.
    //
    // The column omitted rather than sent empty, which is the shape of an
    // insert written by something that does not know the column is there.
    await expect(
      sql`
        INSERT INTO budget_items (space_id, month, category_id, amount, kind, due_on)
        VALUES (${space.id}, '2026-09', ${categoryId}, 240000, ${kind}, ${dueOn})
      `,
    ).rejects.toThrow(/null value in column "name"/);

    for (const blank of ["", "   "]) {
      await expect(
        sql`
          INSERT INTO budget_items (space_id, month, category_id, amount, kind, name, due_on)
          VALUES (${space.id}, '2026-09', ${categoryId}, 240000, ${kind}, ${blank}, ${dueOn})
        `,
      ).rejects.toThrow(/budget_items_carries_what_its_kind_carries/);
    }
  }
});

const JULY = month("2026-07");
const AUGUST = month("2026-08");

const aVariableItem = (
  space: Awaited<ReturnType<typeof aSpaceWithACategory>>["space"],
  categoryId: string,
  on = SEPTEMBER,
  changes: { name?: string; amount?: number } = {},
) =>
  planBudgetItemInSpace(db, space, {
    spaceId: space.id,
    month: on,
    categoryId,
    amount: changes.amount ?? 400_000_00,
    name: changes.name ?? "Semana 1",
  });

it("finds no month to copy in a Space that has never planned one", async () => {
  const { space } = await aSpaceWithACategory("Primer mes");

  expect(await latestPlannedMonthBefore(db, space, SEPTEMBER)).toBeNull();
});

/*
 * Decision 22 of #109: the lookback reaches back with no bound and skips the
 * months in between. "The previous calendar month has no plan" is not a case.
 */
it("reaches past empty months to the most recent one with a plan", async () => {
  const { space, categoryId } = await aSpaceWithACategory("Salteado");

  await aVariableItem(space, categoryId, JULY);

  expect(await latestPlannedMonthBefore(db, space, OCTOBER)).toBe(JULY);
});

it("finds the nearest of several planned months", async () => {
  const { space, categoryId } = await aSpaceWithACategory("Varios meses");

  await aVariableItem(space, categoryId, JULY);
  await aVariableItem(space, categoryId, AUGUST);

  expect(await latestPlannedMonthBefore(db, space, SEPTEMBER)).toBe(AUGUST);
});

// Strictly before. A month with a plan is never offered its own plan back.
it("never names the month being asked about", async () => {
  const { space, categoryId } = await aSpaceWithACategory("Mismo mes");

  await aVariableItem(space, categoryId, SEPTEMBER);

  expect(await latestPlannedMonthBefore(db, space, SEPTEMBER)).toBeNull();
});

// Another Space's plan is not this Space's, however recent it is.
it("sees only the plans of the Space it was asked about", async () => {
  const mine = await aSpaceWithACategory("Mío");
  const theirs = await aSpaceWithACategory("Ajeno");

  await aVariableItem(theirs.space, theirs.categoryId, AUGUST);

  expect(await latestPlannedMonthBefore(db, mine.space, SEPTEMBER)).toBeNull();
});

it("carries both kinds forward at their amounts and their names", async () => {
  const { space, categoryId } = await aSpaceWithACategory("Copiado");

  await aFixedItem(space, categoryId, { name: "Arriendo", dueDay: 1 });
  await aVariableItem(space, categoryId, SEPTEMBER, { name: "Semana 1" });

  const outcome = await copyPlanIntoMonth(db, space, SEPTEMBER, OCTOBER);

  expect(outcome.kind).toBe("copied");

  const october = await budgetItemsInMonth(db, space, OCTOBER);

  expect(october).toHaveLength(2);
  expect(october.map((item) => item.name).sort()).toEqual([
    "Arriendo",
    "Semana 1",
  ]);
  expect(expected(october, "ARS")).toEqual(money(2_200_000_00, "ARS"));
});

/*
 * Decision 9 of #109. The payment is a Movement in September's ledger, and
 * October has not been paid for -- so a Fixed item arrives pending whatever it
 * was, and its day moves onto the month it lands on.
 */
it("brings a paid Fixed item across pending, on a day in the new month", async () => {
  const { member, space, categoryId } = await aSpaceWithACategory("Pagado");

  const item = await aFixedItem(space, categoryId, { dueDay: 22 });
  await payFixedItemInSpace(
    db,
    { space, recordedBy: member.id, today: TODAY },
    item.id,
  );

  await copyPlanIntoMonth(db, space, SEPTEMBER, OCTOBER);

  const [copied] = await budgetItemsInMonth(db, space, OCTOBER);

  expect(copied?.kind).toBe("fixed");
  if (copied?.kind !== "fixed") throw new Error("The copy lost its kind.");
  expect(isPaid(copied)).toBe(false);
  expect(copied.dueOn).toBe("2026-10-22");
});

/*
 * ADR-0050: the 31st has no answer in a 30-day month, and the line is moved
 * rather than dropped or refused. September has thirty days.
 */
it("lands a due day the new month is too short for on its last day", async () => {
  const { space, categoryId } = await aSpaceWithACategory("Fin de mes");

  await planFixedItemInSpace(db, space, {
    spaceId: space.id,
    month: AUGUST,
    categoryId,
    amount: 1_800_000_00,
    name: "Arriendo",
    dueDay: 31,
  });

  await copyPlanIntoMonth(db, space, AUGUST, SEPTEMBER);

  const [copied] = await budgetItemsInMonth(db, space, SEPTEMBER);

  expect(copied?.kind === "fixed" ? copied.dueOn : null).toBe("2026-09-30");
});

it("says there was nothing to copy out of a month with no plan", async () => {
  const { space } = await aSpaceWithACategory("Nada que copiar");

  expect(await copyPlanIntoMonth(db, space, AUGUST, SEPTEMBER)).toEqual({
    kind: "nothing-to-copy",
  });
});

it("refuses to copy onto a month that already has a plan", async () => {
  const { space, categoryId } = await aSpaceWithACategory("Ya planeado");

  await aVariableItem(space, categoryId, AUGUST);
  await aVariableItem(space, categoryId, SEPTEMBER, { name: "Ya estaba" });

  expect(await copyPlanIntoMonth(db, space, AUGUST, SEPTEMBER)).toEqual({
    kind: "already-planned",
  });

  // And nothing was added on top of what was there.
  expect(await budgetItemsInMonth(db, space, SEPTEMBER)).toHaveLength(1);
});

/*
 * The whole reason `copyPlanIntoMonth` takes an advisory lock (ADR-0050). Two
 * thumbs answering the offer at once would otherwise both read an empty
 * October and both write, leaving the month expecting double the rent -- and
 * there is no row to hang a unique key on, because a Budget is its items
 * (ADR-0019).
 */
it("writes one plan and not two when both are answered at once", async () => {
  const { space, categoryId } = await aSpaceWithACategory("Dos pulgares");

  await aFixedItem(space, categoryId);
  await aVariableItem(space, categoryId, SEPTEMBER);

  // Its own connection, so the two really contend rather than queueing on one.
  const other = createDatabase(databaseUrl(), { max: 1 });

  try {
    const outcomes = await Promise.all([
      copyPlanIntoMonth(db, space, SEPTEMBER, OCTOBER),
      copyPlanIntoMonth(other.db, space, SEPTEMBER, OCTOBER),
    ]);

    expect(outcomes.map((outcome) => outcome.kind).sort()).toEqual([
      "already-planned",
      "copied",
    ]);
    expect(await budgetItemsInMonth(db, space, OCTOBER)).toHaveLength(2);
  } finally {
    await other.sql.end();
  }
});

// The copy is a snapshot and not a link (decision 24 of #109). Correcting the
// month it came from afterwards leaves the month it landed on alone.
it("copies out of a month that is still being changed", async () => {
  const { space, categoryId } = await aSpaceWithACategory("Instantánea");

  const source = await aVariableItem(space, categoryId, SEPTEMBER);
  await copyPlanIntoMonth(db, space, SEPTEMBER, OCTOBER);

  await amendBudgetItemInSpace(db, space, source.id, {
    categoryId,
    amount: 1_00,
    name: "Cambiado después",
  });

  const [copied] = await budgetItemsInMonth(db, space, OCTOBER);

  expect(copied?.name).toBe("Semana 1");
  expect(copied?.amount).toEqual(money(400_000_00, "ARS"));
});

/*
 * The close, from the side the plan feels it (#117).
 *
 * ADR-0002 said a closed month never changes and `amendItem` promised the
 * refusal would live in one place above the domain. These are that promise,
 * driven against real rows: every way a plan can be written into is asked, and
 * every one of them is turned away by the same error.
 */

const IN_OCTOBER = calendarDate("2026-10-03");

async function aClosedSeptember(name: string) {
  const made = await aSpaceWithACategory(name);
  const planned = await planBudgetItemInSpace(db, made.space, {
    spaceId: made.space.id,
    month: SEPTEMBER,
    categoryId: made.categoryId,
    amount: 100_000_00,
    name: "Súper",
  });
  const fixed = await planFixedItemInSpace(db, made.space, {
    spaceId: made.space.id,
    month: SEPTEMBER,
    categoryId: made.categoryId,
    amount: 50_000_00,
    name: "Alquiler",
    dueDay: 10,
  });

  await closeMonthInSpace(
    db,
    { space: made.space, closedBy: made.member.id, today: IN_OCTOBER },
    SEPTEMBER,
  );

  return { ...made, planned, fixed };
}

it("refuses a new item on a closed month", async () => {
  const { space, categoryId } = await aClosedSeptember("Cerrado planear");

  await expect(
    planBudgetItemInSpace(db, space, {
      spaceId: space.id,
      month: SEPTEMBER,
      categoryId,
      amount: 10_000_00,
      name: "Tarde",
    }),
  ).rejects.toThrow(ClosedMonthError);
});

it("refuses a new Fixed item on a closed month", async () => {
  const { space, categoryId } = await aClosedSeptember("Cerrado fijo");

  await expect(
    planFixedItemInSpace(db, space, {
      spaceId: space.id,
      month: SEPTEMBER,
      categoryId,
      amount: 10_000_00,
      name: "Tarde",
      dueDay: 5,
    }),
  ).rejects.toThrow(ClosedMonthError);
});

it("refuses a correction to an item of a closed month", async () => {
  const { space, planned } = await aClosedSeptember("Cerrado corregir");

  await expect(
    amendBudgetItemInSpace(db, space, planned.id, { amount: 1_00 }),
  ).rejects.toThrow(ClosedMonthError);
});

it("refuses a correction to a Fixed item of a closed month", async () => {
  const { space, fixed } = await aClosedSeptember("Cerrado corregir fijo");

  await expect(
    amendFixedItemInSpace(db, space, fixed.id, { amount: 1_00 }),
  ).rejects.toThrow(ClosedMonthError);
});

it("refuses taking an item off a closed month's plan", async () => {
  const { space, planned } = await aClosedSeptember("Cerrado sacar");

  await expect(
    removeBudgetItemFromSpace(db, space, planned.id),
  ).rejects.toThrow(ClosedMonthError);
});

/*
 * Decision 1 of the #109 map, read from the side that enforces it: an unpaid
 * Fixed item stays unpaid, in its own month, forever. Nothing is deleted --
 * the record that it went unpaid is the point -- and it is refused in October
 * as much as in September, because what the payment writes is a pointer onto
 * September's plan.
 */
it("refuses marking a Fixed item of a closed month paid, and leaves it pending", async () => {
  const { space, member, fixed } = await aClosedSeptember("Cerrado pagar");

  await expect(
    payFixedItemInSpace(
      db,
      { space, recordedBy: member.id, today: IN_OCTOBER },
      fixed.id,
    ),
  ).rejects.toThrow(ClosedMonthError);

  const still = await findBudgetItemInSpace(db, space, fixed.id);
  expect(still && still.kind === "fixed" && isPaid(still)).toBe(false);
});

it("refuses copying a plan onto a closed month", async () => {
  const { space, categoryId } = await aClosedSeptember("Cerrado copiar");

  await planBudgetItemInSpace(db, space, {
    spaceId: space.id,
    month: month("2026-08"),
    categoryId,
    amount: 10_000_00,
    name: "Agosto",
  });

  await expect(
    copyPlanIntoMonth(db, space, month("2026-08"), SEPTEMBER),
  ).rejects.toThrow(ClosedMonthError);
});

/*
 * A closed month is a month a plan may still be *read* out of. That is decision
 * 24 of the #109 map, and ADR-0050's "the copy is a snapshot and not a link":
 * waiting for a close would mean nobody could plan October until September was
 * over, which is exactly the time they would.
 */
it("copies a closed month's plan into an open one", async () => {
  const { space } = await aClosedSeptember("Cerrado copiar desde");

  const copied = await copyPlanIntoMonth(db, space, SEPTEMBER, OCTOBER);

  expect(copied.kind).toBe("copied");
});

it("leaves every other month of the Space writable", async () => {
  const { space, categoryId } = await aClosedSeptember("Cerrado y el resto");

  await expect(
    planBudgetItemInSpace(db, space, {
      spaceId: space.id,
      month: OCTOBER,
      categoryId,
      amount: 10_000_00,
      name: "Octubre",
    }),
  ).resolves.toMatchObject({ month: "2026-10" });
});
