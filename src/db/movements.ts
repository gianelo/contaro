import { and, desc, eq, gte, inArray, isNull, lte, sql } from "drizzle-orm";
import {
  calendarDate,
  firstDayOf,
  isMonth,
  lastDayOf,
  monthOf,
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
  type NewMovement,
  type Recorder,
  type Recording,
} from "@/domain/movement/movement";
import type { Space } from "@/domain/space/space";
import { bySpace } from "./by-space";
import { categoriesTheSpaceCanSee } from "./categories";
import { refuseAClosedMonth, refuseAnOpenMonth } from "./closed-months";
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
  carriedFrom: movements.carriedFrom,
  name: movements.name,
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
  attributedTo: string | null;
  carriedFrom: string | null;
  name: string | null;
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

  // The one refusal a closed month makes (`refuseAClosedMonth`), asked here
  // because this is where the day is finally a day. A late ticket is not
  // turned away by it: `recordMovement` dates a Movement by the day somebody
  // says the money moved, and ADR-0002 already answered what happens to a
  // September receipt found in October -- it is recorded in October and
  // consumes October's Budget. What this refuses is a Movement aimed *into* a
  // month that is closed.
  await refuseAClosedMonth(db, checked.spaceId, monthOf(checked.occurredOn));

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
      name: checked.name,
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

  // Both months, and they are not always the same one. A correction can move
  // the day it happened on, so it can lift a Movement out of one month and
  // drop it into another -- and either end being closed is a closed month
  // changing. The month it leaves is asked first, because that is the one a
  // person is looking at.
  await refuseAClosedMonth(db, context.space.id, monthOf(existing.occurredOn));
  await refuseAClosedMonth(db, context.space.id, monthOf(checked.occurredOn));

  const [updated] = await db
    .update(movements)
    // The direction is not here on purpose: it is as unchangeable as the
    // recorder, refused by `amendMovement` above and by a trigger under this.
    .set({
      categoryId: checked.categoryId,
      amount: checked.amount.amount,
      occurredOn: checked.occurredOn,
      attributedTo: checked.attributedTo,
      name: checked.name,
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

  // The day it happened on, read before the strike, because the month it falls
  // in is what decides whether it may be struck at all and this is the one
  // write here that never had to read the row. Nothing found reads as nothing
  // to strike, exactly as the WHERE below would have answered.
  const [standingRow] = await db
    .select({ occurredOn: movements.occurredOn })
    .from(movements)
    .where(
      and(
        eq(movements.id, movementId),
        eq(movements.spaceId, spaceId),
        standing,
      ),
    )
    .limit(1);

  if (!standingRow) return false;

  // Striking a Movement out is editing the month it is in: the figures every
  // screen reads move, which is exactly what a closed month promises will
  // never happen again (ADR-0002).
  await refuseAClosedMonth(
    db,
    spaceId,
    monthOf(calendarDate(standingRow.occurredOn)),
  );

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
 * A month's surplus approved: the one Movement in the product nobody typed.
 *
 * It takes the answer the domain already reached rather than the question,
 * which is where it differs from `recordMovementInSpace`. A carry-over is not a
 * draft: there is no screen it is typed on, every field on it is decided by the
 * act, and the figure it carries comes out of a whole month's arithmetic that
 * this layer would have to fetch twice to redo. `approveCarryOver` is what
 * decides it, and this writes the answer down.
 *
 * **Two months and two opposite refusals**, which is the shape of the act:
 *
 * The month it comes *out of* has to be closed. A month's leftover is only a
 * figure once nothing more can go into it (decision 6 of #109), and a surplus
 * approved out of a month still running is money that leaves before the month
 * has finished spending it -- with no second approval to correct it, because a
 * month is carried over once.
 *
 * The month it lands *in* has to be open, which is the ordinary refusal every
 * write here makes. It is not a special case of the close: a carry-over aimed
 * at a month somebody already closed is a Movement aimed into a closed month,
 * and ADR-0002 answers it the same way it answers all the others.
 *
 * **Once, and counted in rows that still stand.** The unique index in migration
 * 0017 is what makes that true against two thumbs at once, rather than a read
 * here that a second request could slip between. What comes back from a second
 * approval is the row that already exists, not a refusal: the act asked for has
 * happened, and the honest answer to "approve September" when September is
 * already carried is the carry-over itself.
 */
export async function approveCarryOverInSpace(
  db: Database,
  approved: NewMovement,
  space: Space,
): Promise<Movement> {
  if (approved.carriedFrom === null) {
    throw new Error(
      "A carry-over must say which month it came out of, and this one says nothing.",
    );
  }

  await refuseAnOpenMonth(db, approved.spaceId, approved.carriedFrom);
  await refuseAClosedMonth(db, approved.spaceId, monthOf(approved.occurredOn));

  const [created] = await db
    .insert(movements)
    .values({
      spaceId: approved.spaceId,
      direction: approved.direction,
      categoryId: approved.categoryId,
      amount: approved.amount.amount,
      occurredOn: approved.occurredOn,
      recordedBy: approved.recordedBy,
      attributedTo: approved.attributedTo,
      carriedFrom: approved.carriedFrom,
      name: approved.name,
    })
    // The index is partial, so the conflict has to name its own predicate for
    // Postgres to know which one is meant. Nothing is updated: a carry-over
    // that already stands is the answer, and touching it would be correcting
    // the one Movement that is never corrected.
    .onConflictDoNothing({
      target: [movements.spaceId, movements.carriedFrom],
      where: sql`${movements.carriedFrom} IS NOT NULL AND ${movements.struckAt} IS NULL`,
    })
    .returning(movementColumns);

  if (created) return asMovement(created, space);

  const standingAlready = await carriedOverFrom(
    db,
    space,
    approved.carriedFrom,
  );

  if (!standingAlready) {
    throw new Error(
      `Approving the carry-over of ${approved.carriedFrom} wrote no row and left none standing.`,
    );
  }

  return standingAlready;
}

/**
 * The carry-over a month has already been given, or nothing where it has not.
 *
 * There is no column anywhere saying a month has been approved, and that is the
 * shape rather than an omission: the Movement **is** the approval. ADR-0052
 * made the same argument about the close -- a month is closed if a row says so,
 * and a flag beside it would be a second fact that has to agree with the first.
 *
 * Standing rows only, through the same `standing` clause every other reader
 * here uses, which is what makes striking one out the undo: the month it came
 * out of has no carry-over again, and the offer comes back (ADR-0031).
 */
export async function carriedOverFrom(
  db: Database,
  space: Space,
  from: Month,
): Promise<Movement | null> {
  const [row] = await db
    .select(movementColumns)
    .from(movements)
    .where(
      and(
        eq(movements.spaceId, space.id),
        eq(movements.carriedFrom, from),
        standing,
      ),
    )
    .limit(1);

  return row ? asMovement(row, space) : null;
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
 * The same month's Movements for several Spaces at once, grouped by the Space
 * they belong to.
 *
 * The Space list needs this for every Space a Member is in, and asking
 * `movementsInMonth` once per Space would make landing on that screen cost a
 * query per card — a list whose price goes up with how many Spaces somebody
 * has. One `IN` reads them all, and the index the month's list already uses
 * (`movements_space_id_occurred_on_idx`) serves it.
 *
 * Whole Spaces and not their ids, for the reason the single-Space reader takes
 * one: every amount can only be read in the currency its own Space is
 * denominated in. `bySpace` is what holds each row to its own (ADR-0007).
 */
export async function movementsInMonthForSpaces(
  db: Database,
  spaces: readonly Space[],
  month: Month,
): Promise<ReadonlyMap<string, readonly Movement[]>> {
  if (spaces.length === 0) return new Map();

  const byId = new Map(spaces.map((space) => [space.id, space]));

  const rows = await db
    .select(movementColumns)
    .from(movements)
    .where(
      and(
        inArray(movements.spaceId, [...byId.keys()]),
        gte(movements.occurredOn, firstDayOf(month)),
        lte(movements.occurredOn, lastDayOf(month)),
        standing,
      ),
    )
    .orderBy(desc(movements.occurredOn), desc(movements.createdAt));

  return bySpace(rows, byId, asMovement);
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
    // **Origin**, read back through the one function that says what a month is
    // written like. A row whose `carried_from` is not a month can only come
    // from a write that went round both the domain and the check in migration
    // 0017, and it is refused rather than read as a Movement from nowhere:
    // `attributed_to` is null on exactly these rows, so a carried row nobody
    // can place is a figure with no origin at all.
    carriedFrom: origin(row),
    name: row.name,
  };
}

/**
 * The month a row was carried out of, or nothing where it came from a Member.
 *
 * Held to `isMonth` for the reason the direction is held to
 * `isMovementDirection`: the column is text, and a value that is not a month is
 * one no walk over months could ever place -- it would sort into a gap between
 * two real months and be offered again forever, because the month it claims to
 * have come from does not exist.
 */
function origin(row: MovementRow): Month | null {
  if (row.carriedFrom === null) return null;

  if (!isMonth(row.carriedFrom)) {
    throw new Error(
      `Movement ${row.id} says it was carried out of "${row.carriedFrom}", which is not a month on any calendar.`,
    );
  }

  return row.carriedFrom;
}

