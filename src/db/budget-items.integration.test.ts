// @vitest-environment node
import { afterAll, expect, it } from "vitest";
import { UnplannableBudgetItemError } from "@/domain/budget/budget";
import { month } from "@/domain/calendar/month";
import { money } from "@/domain/money/money";
import { createDatabase, databaseUrl } from "./connection";
import { memberFromGoogle } from "./members";
import { createSpaceForMember } from "./spaces";
import { addCategoryToSpace, catalogueForSpace } from "./categories";
import {
  amendBudgetItemInSpace,
  budgetItemsInMonth,
  planBudgetItemInSpace,
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
