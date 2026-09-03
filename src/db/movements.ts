import { and, desc, eq, gte, isNull, lte } from "drizzle-orm";
import {
  calendarDate,
  firstDayOf,
  lastDayOf,
  type Month,
} from "@/domain/calendar/month";
import { categoriesVisibleTo, type Category } from "@/domain/category/category";
import { money } from "@/domain/money/money";
import {
  amendMovement,
  recordMovement,
  type Movement,
  type MovementAmendment,
  type MovementDraft,
  type Recorder,
  type Recording,
} from "@/domain/movement/movement";
import type { Space } from "@/domain/space/space";
import type { Connection } from "./connection";
import { categories, movements, spaceMembers } from "./schema";

type Database = Connection["db"];

/** Exactly the columns a domain `Movement` is made of. */
const movementColumns = {
  id: movements.id,
  spaceId: movements.spaceId,
  categoryId: movements.categoryId,
  amount: movements.amount,
  occurredOn: movements.occurredOn,
  recordedBy: movements.recordedBy,
  attributedTo: movements.attributedTo,
  struckAt: movements.struckAt,
};

type MovementRow = {
  id: string;
  spaceId: string;
  categoryId: string;
  amount: number;
  occurredOn: string;
  recordedBy: string;
  attributedTo: string;
  struckAt: Date | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Only rows that still stand. Said once and used by every reader, because a
 * struck Movement that leaks into one of them is money back in a total nobody
 * meant to add it to — and written twice it is a rule one edit can half-undo.
 */
const standing = isNull(movements.struckAt);

/**
 * Records a Movement in a Space, if the Space can hold it.
 *
 * The rows every rule is decided over are fetched first and the domain decides
 * all of them: whether the Category is one this Space can see, whether the
 * attribution names one of its Members, whether the amount is money and the day
 * has happened. This only fetches what it decides over and writes the answer.
 */
export async function recordMovementInSpace(
  db: Database,
  context: Recorder,
  draft: MovementDraft,
): Promise<Movement> {
  const checked = recordMovement(draft, await asRecording(db, context));

  const [created] = await db
    .insert(movements)
    .values({
      spaceId: checked.spaceId,
      categoryId: checked.categoryId,
      amount: checked.amount.amount,
      occurredOn: checked.occurredOn,
      recordedBy: checked.recordedBy,
      attributedTo: checked.attributedTo,
    })
    .returning(movementColumns);

  if (!created) {
    throw new Error("Inserting the Movement returned no row.");
  }

  return asMovement(created, context.space);
}

/**
 * Corrects a Movement, or answers that this Space has no such Movement.
 *
 * Not found rather than forbidden, the way `findSpaceForMember` refuses: a
 * Movement in a Space the asker is not in must not be distinguishable from one
 * that never existed, or an identifier passed between people buys something.
 */
export async function amendMovementInSpace(
  db: Database,
  context: Recorder,
  movementId: string,
  changes: MovementAmendment,
): Promise<Movement | null> {
  const existing = await findMovementInSpace(db, context.space, movementId);
  if (!existing) return null;

  const checked = amendMovement(
    existing,
    changes,
    await asRecording(db, context),
  );

  const [updated] = await db
    .update(movements)
    .set({
      categoryId: checked.categoryId,
      amount: checked.amount.amount,
      occurredOn: checked.occurredOn,
      attributedTo: checked.attributedTo,
    })
    // The Space is in the WHERE as well as in the read above, so a correction
    // cannot outlive the check that allowed it.
    .where(
      and(
        eq(movements.id, movementId),
        eq(movements.spaceId, context.space.id),
        standing,
      ),
    )
    .returning(movementColumns);

  return updated ? asMovement(updated, context.space) : null;
}

/**
 * Strikes a Movement out: whether one was struck, and never how.
 *
 * Not a DELETE. Who struck it and when go onto the row, because a ledger that
 * loses entries silently lies about every figure downstream — and because a
 * Member of a shared Space may strike out a Movement somebody else typed in,
 * which is a thing the other Member is owed a record of.
 *
 * `standing` is in the WHERE, so the second thumb on the button finds it gone
 * rather than overwriting whose strike it was.
 */
export async function strikeMovementInSpace(
  db: Database,
  spaceId: string,
  movementId: string,
  struckBy: string,
): Promise<boolean> {
  if (!UUID.test(movementId)) return false;

  const struck = await db
    .update(movements)
    .set({ struckBy, struckAt: new Date() })
    .where(
      and(
        eq(movements.id, movementId),
        eq(movements.spaceId, spaceId),
        standing,
      ),
    )
    .returning({ id: movements.id });

  return struck.length > 0;
}

/**
 * One Movement of a Space, if it is one and it still stands.
 *
 * The Space arrives whole and not as an identifier, for the reason
 * `movementsInMonth` needs it whole: the amount can only be read in the
 * currency the Space is denominated in, and a figure with no money attached to
 * it is what ADR-0007 exists to make unwritable.
 */
export async function findMovementInSpace(
  db: Database,
  space: Space,
  movementId: string,
): Promise<Movement | null> {
  // An id from a URL is any string at all, and Postgres refuses a malformed
  // uuid with an error rather than an empty result. No such Movement is the
  // honest answer, and it is not the domain's business what a uuid looks like.
  if (!UUID.test(movementId)) return null;

  const [row] = await db
    .select(movementColumns)
    .from(movements)
    .where(
      and(
        eq(movements.id, movementId),
        eq(movements.spaceId, space.id),
        standing,
      ),
    )
    .limit(1);

  return row ? asMovement(row, space) : null;
}

/**
 * A Space's Movements in one month, most recent first.
 *
 * The Space arrives whole rather than as an identifier because every row read
 * has to be denominated in its currency, and a list of amounts with no money
 * attached to them is exactly what ADR-0007 exists to make unwritable.
 */
export async function movementsInMonth(
  db: Database,
  space: Space,
  month: Month,
): Promise<readonly Movement[]> {
  const rows = await db
    .select(movementColumns)
    .from(movements)
    .where(
      and(
        eq(movements.spaceId, space.id),
        gte(movements.occurredOn, firstDayOf(month)),
        lte(movements.occurredOn, lastDayOf(month)),
        standing,
      ),
    )
    // The day it happened on, then the order they were typed in: two expenses
    // on one day read newest first, which is where a thumb is already looking.
    .orderBy(desc(movements.occurredOn), desc(movements.createdAt));

  return rows.map((row) => asMovement(row, space));
}

/**
 * Everything the domain decides a Movement over: the Space, who is asking, its
 * Members, and the catalogue it can see.
 *
 * The catalogue is narrowed in the query to the global rows plus this Space's,
 * and `recordMovement` decides again which of them are really this Space's —
 * the same rule asked twice that `catalogueForSpace` asks, for the same reason.
 */
async function asRecording(
  db: Database,
  context: Recorder,
): Promise<Recording> {
  const [memberIds, visible] = await Promise.all([
    db
      .select({ memberId: spaceMembers.memberId })
      .from(spaceMembers)
      .where(eq(spaceMembers.spaceId, context.space.id)),
    db
      .select({
        id: categories.id,
        spaceId: categories.spaceId,
        parentId: categories.parentId,
        slug: categories.slug,
        name: categories.name,
      })
      .from(categories),
  ]);

  return {
    space: context.space,
    recordedBy: context.recordedBy,
    today: context.today,
    memberIds: memberIds.map((row) => row.memberId),
    categories: categoriesVisibleTo(context.space.id, visible.map(asCategory)),
  };
}

/**
 * The rows are read for their identifiers alone — whether a Category is one
 * this Space may file money under — so the label is built from whichever of the
 * two columns is set, without the throwing that `catalogueForSpace` does. A
 * contradictory row cannot be chosen here: it would fail the same visibility
 * test as any other row, and be shown by the catalogue's own reader instead.
 */
function asCategory(row: {
  id: string;
  spaceId: string | null;
  parentId: string | null;
  slug: string | null;
  name: string | null;
}): Category {
  return {
    id: row.id,
    spaceId: row.spaceId,
    parentId: row.parentId,
    label:
      row.spaceId === null
        ? { kind: "catalogue", slug: row.slug ?? "" }
        : { kind: "own", name: row.name ?? "" },
  };
}


/**
 * A row is a Movement only if it still stands and its amount is a whole number
 * of minor units.
 *
 * The struck check is `standing` asked a second time, the way membership is
 * asked twice everywhere else in this layer. A WHERE clause that ever loosens
 * is caught here rather than quietly putting struck money back into a total.
 */
function asMovement(row: MovementRow, space: Space): Movement {
  if (row.struckAt !== null) {
    throw new Error(
      `Movement ${row.id} was struck out and must not be read back as one that stands.`,
    );
  }

  return {
    id: row.id,
    spaceId: row.spaceId,
    categoryId: row.categoryId,
    // Throws on a fraction, which can only come from a write that went round
    // the domain: a figure that is not whole minor units cannot be shown.
    amount: money(row.amount, space.currency),
    occurredOn: calendarDate(row.occurredOn),
    recordedBy: row.recordedBy,
    attributedTo: row.attributedTo,
  };
}

