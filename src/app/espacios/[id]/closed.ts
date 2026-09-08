import { database } from "@/db/client";
import { closedMonthsFrom } from "@/db/closed-months";
import type { Month } from "@/domain/calendar/month";
import { earliestOffered } from "./months";

/**
 * Whether one month of one Space has been closed, asked by a screen (#119).
 *
 * Here and not under `presupuesto/` or `movimientos/` for the reason `close.ts`
 * gives about the act itself: the close freezes a month's plan and its
 * Movements alike, and a reader living inside one of the two halves it freezes
 * would be named after half of what it answers. Both detail screens ask it, and
 * they ask exactly the same question.
 *
 * Built on `closedMonthsFrom` rather than on a SELECT of its own, which is the
 * whole point. `refuseAClosedMonth` is the refusal every write passes through
 * and it is deliberately the only thing that asks for one row; a third copy of
 * that query would be a third place for the rule to drift. Asking the reader's
 * function about a window that starts at the month itself costs the rows of
 * every month closed after it -- a few dozen on a Space years old, and the
 * price of not writing the same WHERE clause a third time.
 *
 * It answers about rows and never about permission, the same way the function
 * beneath it does. Whether this Member could have closed the month is the
 * domain's question (`closeMonth`), asked somewhere else.
 */
export async function monthIsClosed(
  spaceId: string,
  of: Month,
): Promise<boolean> {
  const closed = await closedMonthsFrom(database(), spaceId, of);

  return closed.has(of);
}

/**
 * Every closed month a screen that reaches backwards can put a day into (#119).
 *
 * The same window the pill offers, out of the same function, so the months a
 * date field refuses and the months the picker marks are one answer. A day
 * older than that window is still refused -- by `refuseAClosedMonth`, on the
 * way in -- and is not warned about, which is the trade: what this closes is
 * the gap somebody can actually walk into, and what it leaves is the receipt
 * from two years ago that the write catches and always did.
 *
 * An array and not the `Set` underneath it, because these cross from a server
 * component into a client one and what crosses has to be plainly serialisable.
 */
export async function closedMonthsToRefuse(
  spaceId: string,
  around: Month,
): Promise<readonly string[]> {
  const closed = await closedMonthsFrom(
    database(),
    spaceId,
    earliestOffered(around),
  );

  return [...closed];
}
