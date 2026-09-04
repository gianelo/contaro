import { and, desc, eq, gte, isNull, lte } from "drizzle-orm";
import {
  calendarDate,
  firstDayOf,
  lastDayOf,
  type Month,
} from "@/domain/calendar/month";
import { money } from "@/domain/money/money";
import {
  amendMovement,
  isMovementDirection,
  recordMovement,
  type Movement,
  type MovementAmendment,
  type MovementDraft,
  type Recorder,
  type Recording,
} from "@/domain/movement/movement";
import type { Space } from "@/domain/space/space";
import { categoriesTheSpaceCanSee } from "./categories";
import type { Queries } from "./connection";
import { isIdentifier } from "./identifier";
import { movements, spaceMembers } from "./schema";

type Database = Queries;

/** Exactly the columns a domain `Movement` is made of. */
const movementColumns = {
  id: movements.id,
  spaceId: movements.spaceId,
  direction: movements.direction,
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
  direction: string;
  categoryId: string | null;
  amount: number;
  occurredOn: string;
  recordedBy: string;
  attributedTo: string;
  struckAt: Date | null;
};

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
      direction: checked.direction,
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
    // The direction is not here on purpose: it is as unchangeable as the
    // recorder, refused by `amendMovement` above and by a trigger under this.
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
  if (!isIdentifier(movementId)) return false;

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
  if (!isIdentifier(movementId)) return null;

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
    // The day it happened on, then the order they were typed in: two Movements
    // on one day read newest first, which is where a thumb is already looking.
    // `movementsByDay` keeps whatever order it is handed, so this is the order
    // the month's list is read in.
    .orderBy(desc(movements.occurredOn), desc(movements.createdAt));

  return rows.map((row) => asMovement(row, space));
}

/**
 * Everything the domain decides a Movement over: the Space, who is asking, its
 * Members, and the catalogue it can see.
 *
 * The catalogue is read through the one place that reads it, and
 * `recordMovement` decides again which of those rows are really this Space's —
 * the same rule asked twice that `catalogueForSpace` asks, for the same reason.
 */
async function asRecording(
  db: Database,
  context: Recorder,
): Promise<Recording> {
  const [memberIds, categories] = await Promise.all([
    db
      .select({ memberId: spaceMembers.memberId })
      .from(spaceMembers)
      .where(eq(spaceMembers.spaceId, context.space.id)),
    categoriesTheSpaceCanSee(db, context.space.id),
  ]);

  return {
    space: context.space,
    recordedBy: context.recordedBy,
    today: context.today,
    memberIds: memberIds.map((row) => row.memberId),
    categories,
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

  // A direction the domain does not know can only come from a write that went
  // round it and past the check in migration 0005. Refused rather than read as
  // an expense: a row nobody can classify must not join a total by default.
  if (!isMovementDirection(row.direction)) {
    throw new Error(
      `Movement ${row.id} is recorded as "${row.direction}", which is neither an expense nor income.`,
    );
  }

  return {
    id: row.id,
    spaceId: row.spaceId,
    direction: row.direction,
    categoryId: row.categoryId,
    // Throws on a fraction, which can only come from a write that went round
    // the domain: a figure that is not whole minor units cannot be shown.
    amount: money(row.amount, space.currency),
    occurredOn: calendarDate(row.occurredOn),
    recordedBy: row.recordedBy,
    attributedTo: row.attributedTo,
  };
}

