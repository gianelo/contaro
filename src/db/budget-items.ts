import { and, asc, desc, eq, inArray, isNull, lt, sql } from "drizzle-orm";
import {
  amendFixedItem,
  amendItem,
  copyOfPlan,
  FixedItemAlreadyPaidError,
  paymentFor,
  planFixedItem,
  planItem,
  unplan,
  type BudgetItem,
  type BudgetItemAmendment,
  type BudgetItemDraft,
  type FixedItem,
  type FixedItemAmendment,
  type FixedItemDraft,
  type Payment,
  type Planning,
} from "@/domain/budget/budget";
import { isCalendarDate, isMonth, type Month } from "@/domain/calendar/month";
import { money } from "@/domain/money/money";
import type { Movement, Recorder } from "@/domain/movement/movement";
import type { Space } from "@/domain/space/space";
import { bySpace } from "./by-space";
import { categoriesTheSpaceCanSee } from "./categories";
import { refuseAClosedMonth } from "./closed-months";
import type { Queries } from "./connection";
import { isIdentifier } from "./identifier";
import { recordMovementInSpace } from "./movements";
import { budgetItems, movements } from "./schema";

type Database = Queries;

/**
 * Exactly the columns of `budget_items` a domain `BudgetItem` is made of.
 *
 * Only this table, because this is also what the writes below hand to
 * RETURNING, and RETURNING cannot name a column of another one. So a write
 * says for itself what the ledger would have said: the inserts and the
 * Variable correction through `asPending`, because none of the three can be
 * looking at a paid row; the Fixed correction by carrying the `struck_at` its
 * own read returned a moment earlier.
 */
const budgetItemColumns = {
  id: budgetItems.id,
  spaceId: budgetItems.spaceId,
  month: budgetItems.month,
  categoryId: budgetItems.categoryId,
  amount: budgetItems.amount,
  kind: budgetItems.kind,
  name: budgetItems.name,
  dueOn: budgetItems.dueOn,
  movementId: budgetItems.movementId,
};

/**
 * The same columns, plus whether the Movement they point at is still standing.
 *
 * Every read of the plan goes through this and none through
 * `budgetItemColumns`, because "paid" is not `movement_id` being set -- it is
 * `movement_id` being set *and* the Movement it names not having been struck
 * out (ADR-0031). Asking the ledger is what makes the two halves agree, and
 * asking it in the same query is what stops a screen from having to.
 */
const budgetItemColumnsWithPayment = {
  ...budgetItemColumns,
  paymentStruckAt: movements.struckAt,
};

type BudgetItemRow = {
  id: string;
  spaceId: string;
  month: string;
  categoryId: string;
  amount: number;
  kind: string;
  /** Never absent: 0013 made the column `NOT NULL` (#90). */
  name: string;
  dueOn: string | null;
  movementId: string | null;
  /** When the Movement this row points at was struck out, if it was. */
  paymentStruckAt: Date | null;
};

/**
 * A row a write just returned that cannot be a paid one, so there is no
 * Movement here to ask the ledger about.
 *
 * Three of the four writes: the two inserts, which leave `movement_id` null,
 * and `amendBudgetItemInSpace`, because `amendItem` refuses the one kind that
 * can carry a payment. Not the fourth. `amendFixedItemInSpace` (#48) corrects
 * a row that may carry a *struck* payment, and one read back through here
 * would come out as a `movement_id` with no `struck_at` -- which is exactly
 * how a paid item reads. It says its own `struck_at` at the call site instead.
 */
const asPending = (row: Omit<BudgetItemRow, "paymentStruckAt">) => ({
  ...row,
  paymentStruckAt: null,
});


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

  // The one refusal a closed month makes (`refuseAClosedMonth`). After it, the
  // month's plan is as frozen as its Movements -- there is no line to add to a
  // month somebody has finished with.
  await refuseAClosedMonth(db, space.id, checked.month);

  const [created] = await db
    .insert(budgetItems)
    .values({
      spaceId: checked.spaceId,
      month: checked.month,
      categoryId: checked.categoryId,
      amount: checked.amount.amount,
      kind: checked.kind,
      name: checked.name,
    })
    .returning(budgetItemColumns);

  if (!created) {
    throw new Error("Inserting the Budget item returned no row.");
  }

  return asBudgetItem(asPending(created), space);
}

/**
 * Plans one Fixed item, if the Space can hold it.
 *
 * The same shape as planning a Variable one, and deliberately: the two kinds
 * are one plan, and a second way of getting a row into `budget_items` that
 * decided its own rules would be a second place for them to stop being true.
 * What differs is only which domain function checks the answers.
 *
 * It is written pending. There is no answer on the entry screen that could
 * make it anything else: money comes into existence when somebody says it
 * moved (`payFixedItemInSpace`), not when they wrote down that it would.
 */
export async function planFixedItemInSpace(
  db: Database,
  space: Space,
  draft: FixedItemDraft,
): Promise<FixedItem> {
  const checked = planFixedItem(draft, await asPlanning(db, space));

  await refuseAClosedMonth(db, space.id, checked.month);

  const [created] = await db
    .insert(budgetItems)
    .values({
      spaceId: checked.spaceId,
      month: checked.month,
      categoryId: checked.categoryId,
      amount: checked.amount.amount,
      kind: checked.kind,
      name: checked.name,
      dueOn: checked.dueOn,
    })
    .returning(budgetItemColumns);

  if (!created) {
    throw new Error("Inserting the Fixed item returned no row.");
  }

  return asFixedItem(asPending(created), space);
}

/**
 * Marks a Fixed item paid: records its Movement and hangs it on the item, or
 * answers that this Space has no such pending item.
 *
 * Both writes or neither. A Movement recorded with nothing pointing at it is
 * money in the ledger that the plan still calls pending -- the row a Member
 * would then pay a second time -- so the transaction is not a nicety here, it
 * is the whole of "exactly one Movement" (#13).
 *
 * The pending condition is in the UPDATE's WHERE and never in a read before
 * it. Reading and then writing leaves a gap two taps fit inside; asked this
 * way, the database decides which of them wins and the loser's Movement is
 * rolled back with it. `movement_id` being UNIQUE is the same rule again, one
 * layer down.
 *
 * That condition is the pointer being where the read above found it, and not
 * the pointer being null. An item whose payment was struck out is payable
 * again (ADR-0031) and already holds a `movement_id`, so "still null" would
 * refuse the one case this exists to allow. Compared this way it is the same
 * guard either way: whoever changed the pointer since the read wins, and the
 * loser is told it is paid rather than told to try again.
 *
 * Not found rather than forbidden: an item in a Space the asker is not in and
 * one that never existed read the same from here. Already paid is a different
 * answer, and stays one, because a person is owed the difference -- one is a
 * row that is not theirs, the other is the row in front of them, settled. The
 * lost race is told exactly what the second tap on one thumb is told, because
 * it is the same truth.
 */
export async function payFixedItemInSpace(
  db: Database,
  context: Recorder,
  itemId: string,
): Promise<Movement | null> {
  if (!isIdentifier(itemId)) return null;

  return db.transaction(async (tx) => {
    const item = await findBudgetItemInSpace(tx, context.space, itemId);
    if (!item || item.kind !== "fixed") return null;

    // The item's own month, which is not the month the Movement below lands
    // in. Marking a Fixed item paid writes a pointer onto the plan, so a
    // closed September refuses it even in October -- and decision 1 of the
    // #109 map is exactly that refusal read from the other side: an unpaid
    // Fixed item stays unpaid, in its own month, forever. The Movement's own
    // month is asked again by `recordMovementInSpace`.
    await refuseAClosedMonth(tx, context.space.id, item.month);

    // Throws if the item is already paid, which this then never gets to
    // write. The WHERE below is what covers the tap that arrives between
    // this read and that write.
    const draft = paymentFor(item, context);
    const movement = await recordMovementInSpace(tx, context, draft);

    const [paid] = await tx
      .update(budgetItems)
      .set({ movementId: movement.id })
      .where(
        and(
          eq(budgetItems.id, itemId),
          eq(budgetItems.spaceId, context.space.id),
          // Never paid, or paid by the struck Movement `paymentFor` just let
          // through. The old pointer is released rather than kept, which is
          // what leaves `budget_items_movement_pays_one_item` satisfiable:
          // the struck Movement stays in the ledger as an entry (ADR-0015)
          // with nothing pointing at it any more.
          item.payment === null
            ? isNull(budgetItems.movementId)
            : eq(budgetItems.movementId, item.payment.movementId),
        ),
      )
      .returning({ id: budgetItems.id });

    // Somebody else paid it in the moment between the read and here. Thrown
    // rather than rolled back by hand, and the difference is what a person
    // reads: `tx.rollback()` raises drizzle's own `TransactionRollbackError`,
    // which is nothing any layer above knows, so the loser would be told to
    // try again -- about a payment that has already gone through. Any throw
    // rolls the transaction back just the same (`client.begin` re-raises), so
    // this undoes the Movement *and* says why.
    if (!paid) throw new FixedItemAlreadyPaidError(item);

    return movement;
  });
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

  await refuseAClosedMonth(db, space.id, existing.month);

  const corrected = amendItem(existing, changes, await asPlanning(db, space));

  const [updated] = await db
    .update(budgetItems)
    .set({
      categoryId: corrected.categoryId,
      amount: corrected.amount.amount,
      name: corrected.name,
    })
    // The Space is in the WHERE and not only in the read above, so a
    // correction cannot outlive the check that allowed it.
    .where(and(eq(budgetItems.id, itemId), eq(budgetItems.spaceId, space.id)))
    .returning(budgetItemColumns);

  return updated ? asBudgetItem(asPending(updated), space) : null;
}

/**
 * Corrects a Fixed item, or answers that this Space has no such item.
 *
 * Its own function beside `amendBudgetItemInSpace` and not a branch inside it,
 * because it is a different set of questions written back: the two kinds are
 * planned by two functions for the same reason (#48). A Variable item reads as
 * no item at all from here, the way one of another Space does -- the two
 * screens are two doors, and each only opens on what it was built to ask.
 *
 * The payment is never in the SET. It is in the WHERE instead, and that is the
 * whole guard: `amendFixedItem` throws on an item it can see is paid, and the
 * compare-and-swap below catches the payment that lands between that read and
 * this write. Same shape as `payFixedItemInSpace`, and for the same reason --
 * whoever moved the pointer in between wins, and the loser is told it is paid.
 */
export async function amendFixedItemInSpace(
  db: Database,
  space: Space,
  itemId: string,
  changes: FixedItemAmendment,
): Promise<FixedItem | null> {
  const existing = await findBudgetItemInSpace(db, space, itemId);
  if (!existing || existing.kind !== "fixed") return null;

  await refuseAClosedMonth(db, space.id, existing.month);

  const corrected = amendFixedItem(existing, changes, await asPlanning(db, space));

  const [updated] = await db
    .update(budgetItems)
    .set({
      categoryId: corrected.categoryId,
      amount: corrected.amount.amount,
      name: corrected.name,
      dueOn: corrected.dueOn,
    })
    .where(
      and(
        eq(budgetItems.id, itemId),
        eq(budgetItems.spaceId, space.id),
        paymentIsStill(existing.payment),
      ),
    )
    .returning(budgetItemColumns);

  if (!updated) throw new FixedItemAlreadyPaidError(existing);

  // The `struck_at` the read above returned, and not a join this RETURNING
  // cannot make. It is still the answer: a correction never touches
  // `movement_id` -- refused outright while the payment stands, and a struck
  // one kept rather than cleared (ADR-0034) -- and the WHERE is what makes
  // "the read above" mean a row nobody moved in between.
  return asFixedItem(
    { ...updated, paymentStruckAt: existing.payment?.struckAt ?? null },
    space,
  );
}

/**
 * The payment a read just saw, said as a condition a write can carry.
 *
 * Never paid, or paid by the one Movement that was already there. Written
 * once because `payFixedItemInSpace`, the correction and the removal all need
 * the same thing said the same way: not "still unpaid" -- which would refuse
 * a struck payment, the very case #49 exists to allow -- but "still the
 * pointer I read".
 */
const paymentIsStill = (payment: Payment | null) =>
  payment === null
    ? isNull(budgetItems.movementId)
    : eq(budgetItems.movementId, payment.movementId);

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
 *
 * Which is true of every item except the one that did move money. The item is
 * read first and `unplan` decides, because "no money moved" is a claim about
 * one row and not about the table (#48): a paid Fixed item's Movement is in
 * the ledger, and the delete underneath knows nothing about kinds or payments.
 * Until now the only thing keeping one out of it was that no screen linked to
 * a Fixed item -- a guard that lasts exactly as long as the screens do, and
 * this ticket is the one that builds the link.
 *
 * The read is the Space's, so an item of a Space the asker is not in answers
 * `false` rather than being distinguishable from one that never existed. And
 * the payment goes into the WHERE for the reason it does in the correction:
 * to catch the tap that pays it between that read and this delete.
 */
export async function removeBudgetItemFromSpace(
  db: Database,
  space: Space,
  itemId: string,
): Promise<boolean> {
  const existing = await findBudgetItemInSpace(db, space, itemId);
  if (!existing) return false;

  await refuseAClosedMonth(db, space.id, existing.month);

  unplan(existing);

  const payment = existing.kind === "fixed" ? existing.payment : null;

  const removed = await db
    .delete(budgetItems)
    .where(
      and(
        eq(budgetItems.id, itemId),
        eq(budgetItems.spaceId, space.id),
        paymentIsStill(payment),
      ),
    )
    .returning({ id: budgetItems.id });

  // Nothing went, and the row was there a moment ago. Two things can have
  // happened in between and they are told apart rather than guessed at: the
  // other thumb removed it, or the other thumb paid it. Asked again, because
  // answering "it was already paid" about a row somebody else took off the
  // plan is a worse answer than the truth and just as easy to get.
  if (removed.length === 0 && existing.kind === "fixed") {
    const still = await findBudgetItemInSpace(db, space, itemId);
    if (still) throw new FixedItemAlreadyPaidError(existing);
  }

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
    .select(budgetItemColumnsWithPayment)
    .from(budgetItems)
    // LEFT, because most rows point at nothing: a Variable item never does
    // and a pending Fixed one does not yet. An inner join would drop the
    // whole pending half of a plan.
    .leftJoin(movements, eq(movements.id, budgetItems.movementId))
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
    .select(budgetItemColumnsWithPayment)
    .from(budgetItems)
    .leftJoin(movements, eq(movements.id, budgetItems.movementId))
    .where(
      and(eq(budgetItems.spaceId, space.id), eq(budgetItems.month, month)),
    )
    .orderBy(asc(budgetItems.createdAt));

  return rows.map((row) => asBudgetItem(row, space));
}

/**
 * The most recent month before this one that a Space planned anything on, or
 * nothing at all where it never has (#121).
 *
 * It reaches back with no bound, and that is decision 22 of #109 rather than
 * an oversight. A cap was offered and refused: if March had a plan and nobody
 * opened the app until October, March is still the last plan there is and
 * still worth offering. What makes an unbounded reach safe is that the screen
 * *names* the month it found, so a plan old enough to be wrong is visibly old
 * enough to be wrong before the tap rather than after.
 *
 * Deliberately not `monthsToPlan`'s fourteen (ADR-0039). That window is a
 * navigation affordance -- how far a pill can be moved in one opening -- and
 * this is a question about rows. The plan is being carried forward, so the
 * month it came from never has to be reachable.
 *
 * `month` is text that sorts the way a calendar orders months, which is the
 * whole of why this is one index scan and not a walk backwards asking twelve
 * questions (`budget_items_space_id_month_idx`).
 */
export async function latestPlannedMonthBefore(
  db: Database,
  space: Space,
  before: Month,
): Promise<Month | null> {
  const [row] = await db
    .selectDistinct({ month: budgetItems.month })
    .from(budgetItems)
    .where(and(eq(budgetItems.spaceId, space.id), lt(budgetItems.month, before)))
    .orderBy(desc(budgetItems.month))
    .limit(1);

  if (!row) return null;

  // The same refusal `whichMonth` makes about a row, for the same reason: the
  // column is text, and a screen is better off with a stack trace naming the
  // Space than with an offer to copy a month nobody has.
  if (!isMonth(row.month)) {
    throw new Error(
      `Space ${space.id} has a plan on "${row.month}", which is not a month on any calendar.`,
    );
  }

  return row.month;
}

/**
 * Writes one month's plan onto another month. Answers what landed, or that
 * there was nothing to carry, or that the month it would land on is already
 * planned.
 *
 * All three reads and the write in one transaction, because the offer this
 * serves is only ever shown on a month with no plan: two thumbs answering it
 * at once, or one thumb answering it twice, would otherwise write the plan
 * twice and leave a month expecting double the rent. That is the same class of
 * gap `payFixedItemInSpace` closes, and it is closed the same way -- by not
 * leaving one.
 *
 * The lock is what a unique constraint would be if there were a row to put one
 * on. There is not: a Budget is its items and has no row of its own
 * (ADR-0019), so "this month has a plan" is a fact about a set of rows and
 * cannot be spelled as a key. Two transactions reading an empty October under
 * READ COMMITTED would both find it empty and both insert; taken on the Space
 * and the month together, the second one waits, reads the first one's plan,
 * and says so. Held to the transaction, so it is released by the commit or the
 * rollback and never by anything remembering to.
 *
 * One INSERT for every item rather than one per row: a copy is one act, and a
 * plan half-written by a connection that dropped is the shape this exists to
 * make impossible.
 */
export async function copyPlanIntoMonth(
  db: Database,
  space: Space,
  from: Month,
  into: Month,
): Promise<CopiedPlan> {
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${space.id}), hashtext(${into}))`,
    );

    // The month it lands on, and never the month it comes from. A closed month
    // is a month a plan may still be *read* out of -- that is decision 24 of
    // the #109 map and ADR-0050's own "the copy is a snapshot and not a link"
    // -- and it is only a month nothing may be written into.
    await refuseAClosedMonth(tx, space.id, into);

    const source = await budgetItemsInMonth(tx, space, from);
    if (source.length === 0) return { kind: "nothing-to-copy" };

    const already = await budgetItemsInMonth(tx, space, into);
    if (already.length > 0) return { kind: "already-planned" };

    // Through the domain, so a Category this Space can no longer see refuses
    // the whole copy by name rather than arriving one line short.
    const drafts = copyOfPlan(source, into, await asPlanning(tx, space));

    const rows = await tx
      .insert(budgetItems)
      .values(
        drafts.map((draft) => ({
          spaceId: draft.spaceId,
          month: draft.month,
          categoryId: draft.categoryId,
          amount: draft.amount.amount,
          kind: draft.kind,
          name: draft.name,
          // Undefined and not null on a Variable one, so the column keeps the
          // default the check constraint expects of its kind.
          dueOn: draft.kind === "fixed" ? draft.dueOn : undefined,
        })),
      )
      .returning(budgetItemColumns);

    return {
      kind: "copied",
      // Pending by construction: nothing here writes a `movement_id`, so no
      // read of the ledger is needed to know none of them is paid.
      items: rows.map((row) => asBudgetItem(asPending(row), space)),
    };
  });
}

/** What copying a plan onto a month can turn out to be. */
export type CopiedPlan =
  | { kind: "copied"; items: readonly BudgetItem[] }
  /** The month it would have copied has no plan on it any more. */
  | { kind: "nothing-to-copy" }
  /** Somebody planned the month in between, by hand or by copying it too. */
  | { kind: "already-planned" };

/**
 * The same month's plan for several Spaces at once, grouped by the Space it
 * belongs to.
 *
 * Beside `movementsInMonthForSpaces` and for the same reason: the Space list
 * shows what every Space was planned to cost, and one query per card is a
 * screen whose price grows with how many Spaces a person has. The index the
 * Budget screen already uses (`budget_items_space_id_month_idx`) serves it.
 *
 * Whole Spaces rather than ids, because every amount can only be read in the
 * currency its own Space is denominated in. `bySpace` is what holds each row
 * to its own (ADR-0007).
 */
export async function budgetItemsInMonthForSpaces(
  db: Database,
  spaces: readonly Space[],
  month: Month,
): Promise<ReadonlyMap<string, readonly BudgetItem[]>> {
  if (spaces.length === 0) return new Map();

  const byId = new Map(spaces.map((space) => [space.id, space]));

  const rows = await db
    .select(budgetItemColumnsWithPayment)
    .from(budgetItems)
    .leftJoin(movements, eq(movements.id, budgetItems.movementId))
    .where(
      and(
        inArray(budgetItems.spaceId, [...byId.keys()]),
        eq(budgetItems.month, month),
      ),
    )
    .orderBy(asc(budgetItems.createdAt));

  return bySpace(rows, byId, asBudgetItem);
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
 * A row read as the kind of item it says it is.
 *
 * `kind` is the only thing consulted, and never the presence of a name or a
 * due day: the column is what the check constraint holds the other three to,
 * so guessing from them would be a second, quieter answer to a question the
 * row already answers.
 */
function asBudgetItem(row: BudgetItemRow, space: Space): BudgetItem {
  return row.kind === "fixed"
    ? asFixedItem(row, space)
    : {
        kind: "variable",
        id: row.id,
        spaceId: row.spaceId,
        month: whichMonth(row),
        categoryId: row.categoryId,
        amount: money(row.amount, space.currency),
        name: row.name,
      };
}

/**
 * The Fixed half of the same reading, and the same refusal to guess.
 *
 * A row that says it is fixed and carries no due day is a row the check
 * constraint cannot have written
 * (`budget_items_carries_what_its_kind_carries`), so reaching here means the
 * constraint is gone rather than that the item is incomplete. Filling it in
 * would put a plan on the screen that nobody planned; throwing says which row
 * is wrong and stops.
 */
function asFixedItem(row: BudgetItemRow, space: Space): FixedItem {
  if (row.dueOn === null) {
    throw new Error(`Fixed item ${row.id} carries no due day.`);
  }
  if (!isCalendarDate(row.dueOn)) {
    throw new Error(
      `Fixed item ${row.id} falls due on "${row.dueOn}", which is not a day on any calendar.`,
    );
  }

  return {
    kind: "fixed",
    id: row.id,
    spaceId: row.spaceId,
    month: whichMonth(row),
    categoryId: row.categoryId,
    amount: money(row.amount, space.currency),
    name: row.name,
    dueOn: row.dueOn,
    // The pointer and the ledger's answer about it, together. `isPaid` is
    // what reads them as one thing; nothing here decides whether it is paid.
    payment:
      row.movementId === null
        ? null
        : { movementId: row.movementId, struckAt: row.paymentStruckAt },
  };
}

/**
 * The month a row is planned for, or a refusal.
 *
 * Asked once for both kinds. `month` is text so that it sorts the way a
 * calendar orders months, and text is a column any migration could put a
 * thirteenth month in; a screen is better off with a stack trace naming the
 * row than with a plan quietly filed under a month nobody has.
 */
function whichMonth(row: BudgetItemRow): Month {
  if (!isMonth(row.month)) {
    throw new Error(
      `Budget item ${row.id} is planned for "${row.month}", which is not a month on any calendar.`,
    );
  }

  return row.month;
}
