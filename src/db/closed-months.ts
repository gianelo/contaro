import { and, eq, gte } from "drizzle-orm";
import {
  calendarDate,
  month as asMonth,
  type Month,
} from "@/domain/calendar/month";
import {
  closeMonth,
  type ClosedMonth,
  type Closing,
} from "@/domain/space/closure";
import type { Queries } from "./connection";
import { closedMonths } from "./schema";

type Database = Queries;

/**
 * The monthly close: the act, and the one refusal every other write in the
 * product passes through.
 *
 * Both halves are here because they are one fact read from two directions.
 * `closeMonthInSpace` writes the row; `refuseAClosedMonth` is the only thing in
 * the codebase that asks whether one exists, and every write into a month asks
 * it before writing.
 *
 * **This is the one place the promise named.** `amendItem` and the plan's
 * correction screen each said the close "will refuse this in one place, above
 * the domain, rather than growing a second half-answer here that would then
 * have to agree with it". Above the domain, because the question is about rows
 * -- a `Month` alone cannot answer it -- and one place, because a rule with two
 * implementations is a rule that eventually disagrees with itself, and the day
 * it disagrees is the day a closed month quietly accepts an edit.
 *
 * The askers are many and that is not the same thing. `closed-months.source.
 * test.ts` reads the two store modules and fails the day a write forgets to
 * ask, so the count of call sites is checked rather than trusted.
 */

/**
 * Thrown by `refuseAClosedMonth` when the month a write lands in is closed.
 *
 * A named error and not a boolean the caller may ignore, for the reason
 * `FixedItemAlreadyPaidError` is one: the guarantee ADR-0002 sells is that a
 * closed month never changes, and a check whose answer a caller can drop on the
 * floor is not a guarantee. It carries the month so a screen can say which one.
 */
export class ClosedMonthError extends Error {
  readonly month: Month;

  constructor(of: Month) {
    super(`${of} is closed, and nothing in a closed month changes (ADR-0002).`);
    this.name = "ClosedMonthError";
    this.month = of;
  }
}

/**
 * The refusal, asked by every write before it writes.
 *
 * It reads inside whatever transaction the caller is already in, which is what
 * makes the answer the one that counts rather than a second opinion arriving a
 * moment later. The window it does not close is the one no cheaper answer
 * closes either -- a write submitted in the same instant as the close itself,
 * into a month that ended at least a day before either of them -- and a trigger
 * on the month's own tables would leave exactly the same window while making a
 * Space that ever closed a month impossible to delete.
 */
export async function refuseAClosedMonth(
  db: Database,
  spaceId: string,
  of: Month,
): Promise<void> {
  const [closed] = await db
    .select({ month: closedMonths.month })
    .from(closedMonths)
    .where(and(eq(closedMonths.spaceId, spaceId), eq(closedMonths.month, of)))
    .limit(1);

  if (closed) throw new ClosedMonthError(of);
}

/**
 * Which of a Space's months are closed, from a month onwards.
 *
 * The same fact the refusal is built on, asked by a screen rather than by a
 * write -- and asked about a stretch of months rather than about one, because
 * that is the shape of the screen's question. #118 draws a row about the oldest
 * month still waiting to be closed, and finding the oldest of anything means
 * knowing about all of them: asked one month at a time it would be a query per
 * month lived through, on every load of the Budget screen.
 *
 * A set of strings and not of `Month`s, because a `Set<Month>` is a set nothing
 * can look a plain month up in without a cast. What comes back is exactly what
 * the column holds; the domain walking it brands its own (`month`).
 *
 * It answers about rows and never about permission. Whether the Member reading
 * it may close a month is the domain's question (`closeMonth`), asked somewhere
 * else and answered differently for each of the two Members.
 *
 * The refusal above is left asking for itself. It is the hot path -- ten writes
 * go through it before writing -- and it wants one row and not a month's worth
 * of them.
 */
export async function closedMonthsFrom(
  db: Database,
  spaceId: string,
  from: Month,
): Promise<ReadonlySet<string>> {
  const rows = await db
    .select({ month: closedMonths.month })
    .from(closedMonths)
    .where(and(eq(closedMonths.spaceId, spaceId), gte(closedMonths.month, from)));

  return new Set(rows.map((row) => row.month));
}

/**
 * A month closed by the Space's creator, or nothing where it was already
 * closed.
 *
 * Who may close it and whether it has ended are the domain's (`closeMonth`),
 * and both throw. Whether it is already closed is decided over rows and comes
 * back as an answer, the way a copied plan's is: two taps on the one
 * irreversible button in the product must leave one closed month and no
 * apology, and "somebody already did this" is not a mistake anybody made.
 *
 * `onConflictDoNothing` rather than a read and then an insert, so the primary
 * key is what decides -- two requests racing cannot both see room for a row.
 */
export async function closeMonthInSpace(
  db: Database,
  closing: Closing,
  of: Month,
): Promise<ClosedMonth | null> {
  const closed = closeMonth(of, closing);

  const [written] = await db
    .insert(closedMonths)
    .values({
      spaceId: closed.spaceId,
      month: closed.month,
      closedBy: closed.closedBy,
      closedOn: closed.closedOn,
    })
    .onConflictDoNothing()
    .returning({
      spaceId: closedMonths.spaceId,
      month: closedMonths.month,
      closedBy: closedMonths.closedBy,
      closedOn: closedMonths.closedOn,
    });

  // Read back off the row and never off the draft that went in, every field of
  // it. What was written is the answer; a value carried across from the input
  // is this function agreeing with itself rather than with the database, and
  // there is no second close to correct it on.
  return written
    ? {
        spaceId: written.spaceId,
        month: asMonth(written.month),
        closedBy: written.closedBy,
        closedOn: calendarDate(written.closedOn),
      }
    : null;
}
