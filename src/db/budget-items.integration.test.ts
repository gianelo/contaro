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
import {
  amendBudgetItemInSpace,
  budgetItemsInMonth,
  budgetItemsInMonthForSpaces,
  findBudgetItemInSpace,
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
  });

  expect(planned).toEqual({
    kind: "variable",
    id: expect.any(String),
    spaceId: space.id,
    month: SEPTEMBER,
    categoryId,
    amount: money(240_000_00, "ARS"),
  });
  expect(await budgetItemsInMonth(db, space, SEPTEMBER)).toEqual([planned]);
});

it("keeps a month's plan out of the months around it", async () => {
  const { space, categoryId } = await aSpaceWithACategory("Meses");
  const item = { spaceId: space.id, categoryId, amount: 100_00 };

  await planBudgetItemInSpace(db, space, { ...item, month: SEPTEMBER });

  expect(await budgetItemsInMonth(db, space, OCTOBER)).toEqual([]);
});

it("takes several items on one Category, which is how a month is planned in weeks", async () => {
  const { space, categoryId } = await aSpaceWithACategory("Semanas");
  const week = { spaceId: space.id, month: SEPTEMBER, categoryId, amount: 60_000_00 };

  await planBudgetItemInSpace(db, space, week);
  await planBudgetItemInSpace(db, space, week);

  const planned = await budgetItemsInMonth(db, space, SEPTEMBER);
  expect(planned).toHaveLength(2);
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
  });

  expect(
    await amendBudgetItemInSpace(db, space, planned.id, { amount: 300_000_00 }),
  ).toEqual({ ...planned, amount: money(300_000_00, "ARS") });
});

it("answers no such item for one in another Space, rather than refusing it", async () => {
  const { space } = await aSpaceWithACategory("Mía");
  const other = await aSpaceWithACategory("Suya");
  const theirs = await planBudgetItemInSpace(db, other.space, {
    spaceId: other.space.id,
    month: SEPTEMBER,
    categoryId: other.categoryId,
    amount: 100_00,
  });

  expect(await amendBudgetItemInSpace(db, space, theirs.id, { amount: 200_00 }))
    .toBeNull();
  expect(await removeBudgetItemFromSpace(db, space.id, theirs.id)).toBe(false);
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
  });

  expect(await removeBudgetItemFromSpace(db, space.id, planned.id)).toBe(true);
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
  });
  await planBudgetItemInSpace(db, viaje.space, {
    spaceId: viaje.space.id,
    month: SEPTEMBER,
    categoryId: viaje.categoryId,
    amount: 800_00,
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
