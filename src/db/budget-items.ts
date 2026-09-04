import { and, asc, eq } from "drizzle-orm";
import {
  amendItem,
  planItem,
  type BudgetItem,
  type BudgetItemAmendment,
  type BudgetItemDraft,
  type Planning,
} from "@/domain/budget/budget";
import { isMonth, type Month } from "@/domain/calendar/month";
import { money } from "@/domain/money/money";
import type { Space } from "@/domain/space/space";
import { categoriesTheSpaceCanSee } from "./categories";
import type { Connection } from "./connection";
import { isIdentifier } from "./identifier";
import { budgetItems } from "./schema";

type Database = Connection["db"];

/** Exactly the columns a domain `BudgetItem` is made of. */
const budgetItemColumns = {
  id: budgetItems.id,
  spaceId: budgetItems.spaceId,
  month: budgetItems.month,
  categoryId: budgetItems.categoryId,
  amount: budgetItems.amount,
};

type BudgetItemRow = {
  id: string;
  spaceId: string;
  month: string;
  categoryId: string;
  amount: number;
};

/**
 * Plans one Variable item, if the Space can hold it.
 *
 * The rows every rule is decided over are fetched first and the domain decides
 * all of them: whether the Category is one this Space can see, whether the
 * month is a month, whether the amount is money. This only fetches what it
 * decides over and writes the answer.
 *
 * There is no Budget to create first and none to look up. The first item of a
 * month is what brings that month's plan into existence, so this insert is the
 * whole of it.
 */
export async function planBudgetItemInSpace(
  db: Database,
  space: Space,
  draft: BudgetItemDraft,
): Promise<BudgetItem> {
  const checked = planItem(draft, await asPlanning(db, space));

  const [created] = await db
    .insert(budgetItems)
    .values({
      spaceId: checked.spaceId,
      month: checked.month,
      categoryId: checked.categoryId,
      amount: checked.amount.amount,
    })
    .returning(budgetItemColumns);

  if (!created) {
    throw new Error("Inserting the Budget item returned no row.");
  }

  return asBudgetItem(created, space);
}

/**
 * Corrects an item, or answers that this Space has no such item.
 *
 * Not found rather than forbidden, the way `amendMovementInSpace` refuses: an
 * item in a Space the asker is not in must not be distinguishable from one
 * that never existed.
 */
export async function amendBudgetItemInSpace(
  db: Database,
  space: Space,
  itemId: string,
  changes: BudgetItemAmendment,
): Promise<BudgetItem | null> {
  const existing = await findBudgetItemInSpace(db, space, itemId);
  if (!existing) return null;

  const corrected = amendItem(existing, changes, await asPlanning(db, space));

  const [updated] = await db
    .update(budgetItems)
    .set({
      categoryId: corrected.categoryId,
      amount: corrected.amount.amount,
    })
    // The Space is in the WHERE and not only in the read above, so a
    // correction cannot outlive the check that allowed it.
    .where(and(eq(budgetItems.id, itemId), eq(budgetItems.spaceId, space.id)))
    .returning(budgetItemColumns);

  return updated ? asBudgetItem(updated, space) : null;
}

/**
 * Takes an item out of the plan. Answers whether there was one to take.
 *
 * A real delete, and unlike a Movement, which is struck out and kept
 * (ADR-0015). The reason that ADR gives is that a ledger losing rows silently
 * lies about every figure downstream — but a Budget is a plan and not a
 * ledger. No money moved, nothing was ever measured against a line that is
 * gone before the month is read, and "who removed it and when" answers a
 * question about money that never existed. A plan a person cannot tidy is a
 * plan they stop keeping.
 */
export async function removeBudgetItemFromSpace(
  db: Database,
  spaceId: string,
  itemId: string,
): Promise<boolean> {
  if (!isIdentifier(itemId)) return false;

  const removed = await db
    .delete(budgetItems)
    .where(and(eq(budgetItems.id, itemId), eq(budgetItems.spaceId, spaceId)))
    .returning({ id: budgetItems.id });

  return removed.length > 0;
}

/** One item of a Space's plan, or nothing this Space can see. */
export async function findBudgetItemInSpace(
  db: Database,
  space: Space,
  itemId: string,
): Promise<BudgetItem | null> {
  if (!isIdentifier(itemId)) return null;

  const [row] = await db
    .select(budgetItemColumns)
    .from(budgetItems)
    .where(and(eq(budgetItems.id, itemId), eq(budgetItems.spaceId, space.id)))
    .limit(1);

  return row ? asBudgetItem(row, space) : null;
}

/**
 * A Space's plan for one month: every item on it, oldest first.
 *
 * The Space arrives whole rather than as an identifier because every row read
 * has to be denominated in its currency, and a list of amounts with no money
 * attached to them is exactly what ADR-0007 exists to make unwritable.
 *
 * Oldest first and not newest, unlike the month's Movements: a list of what
 * happened is read from what just happened, and a plan is read as it was
 * built. The four weekly rows of groceries stay in the order they were
 * thought of.
 */
export async function budgetItemsInMonth(
  db: Database,
  space: Space,
  month: Month,
): Promise<readonly BudgetItem[]> {
  const rows = await db
    .select(budgetItemColumns)
    .from(budgetItems)
    .where(
      and(eq(budgetItems.spaceId, space.id), eq(budgetItems.month, month)),
    )
    .orderBy(asc(budgetItems.createdAt));

  return rows.map((row) => asBudgetItem(row, space));
}

/**
 * Everything the domain decides an item over: the Space and the catalogue it
 * can see.
 *
 * The catalogue is read through the one place that reads it, and `planItem`
 * decides again which rows are really this Space's — the same rule asked
 * twice that `asRecording` asks, for the same reason.
 */
async function asPlanning(db: Database, space: Space): Promise<Planning> {
  return { space, categories: await categoriesTheSpaceCanSee(db, space.id) };
}

/**
 * A row is an item only if its month is one. A month the domain cannot read
 * can only come from a write that went round it and past the check in
 * migration 0008, and it would land on a screen that goes on to build days out
 * of it.
 */
function asBudgetItem(row: BudgetItemRow, space: Space): BudgetItem {
  if (!isMonth(row.month)) {
    throw new Error(
      `Budget item ${row.id} is planned for "${row.month}", which is not a month on any calendar.`,
    );
  }

  return {
    id: row.id,
    spaceId: row.spaceId,
    month: row.month,
    categoryId: row.categoryId,
    amount: money(row.amount, space.currency),
  };
}
