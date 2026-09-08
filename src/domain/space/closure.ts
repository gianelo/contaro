import {
  hasEnded,
  lastDayOf,
  monthOf,
  nextMonth,
  previousMonth,
  type CalendarDate,
  type Month,
} from "../calendar/month";
import { mayCloseTheMonth } from "./creator";
import type { Space } from "./space";

/**
 * The monthly close: the one irreversible act in contaro (ADR-0002).
 *
 * A month that is closed can never be edited again -- its Movements as much as
 * its plan -- and there is no unlock. So this module is deliberately small: it
 * decides the two things that can be decided about the act itself, and it
 * decides nothing about what a closed month then refuses. That refusal is one
 * place above the domain (`refuseAClosedMonth`), because it is a question about
 * rows and every write already reads the rows it is about.
 *
 * Its own module and not the Budget's, for the reason ADR-0019 gives: the
 * subject of the close is the month, and a Budget is only half of what it
 * freezes. A month with no plan at all can still be closed.
 *
 * Beside `creator.ts` rather than beside `budget.ts`, because the two questions
 * it asks are both about the Space: who may do this, and has the month the
 * Space is closing actually ended.
 */

/** A month of a Space, closed: the act, as the record it leaves behind. */
export type ClosedMonth = {
  spaceId: string;
  month: Month;
  /** The Member who closed it, which is always the Space's creator. */
  closedBy: string;
  /**
   * The day it was closed on, as the Reader was standing in it (ADR-0018).
   *
   * A day and not an instant, for the reason a Movement's is: what is worth
   * remembering about the close is the day somebody decided the month was
   * finished, and the hour they tapped is a fact about the tapping.
   */
  closedOn: CalendarDate;
};

/** Who is closing a month, inside which Space, on which day. */
export type Closing = {
  space: Space;
  closedBy: string;
  /** The Reader's own day, and never the server's (ADR-0018). */
  today: CalendarDate;
};

/**
 * Thrown when a month cannot be closed as asked. `field` says which half of the
 * question was the bad one, so a screen can say what happened rather than
 * apologising in general: one of the two is about the person and the other is
 * about the calendar, and they are fixed in completely different ways.
 */
export class UnclosableMonthError extends Error {
  readonly field: "creator" | "month";

  constructor(field: "creator" | "month", reason: string) {
    super(`This month cannot be closed: ${reason}.`);
    this.name = "UnclosableMonthError";
    this.field = field;
  }
}

/**
 * A month closed by the Space's creator, once the month is actually over.
 *
 * Two refusals and no more. Everything else the close has to be true about --
 * that it happens once, that nothing is written into the month afterwards -- is
 * about rows rather than about answers, and is decided where the rows are.
 *
 * **The creator, and not either Member** (ADR-0051). Asked through
 * `mayCloseTheMonth` rather than compared here, so the close and the carry-over
 * cannot drift apart: the day they disagree is the day one Member can approve a
 * carry-over out of a month they were not allowed to close.
 *
 * **A month that has ended**, measured against the Reader's day. ADR-0002 made
 * the close manual so that a person decides when they have finished loading
 * rather than the calendar deciding for them -- but "finished loading" is a
 * claim about a month that is over, and freezing a month still running would
 * push its remaining days into the next one by an act nobody can take back. At
 * nine at night on the 30th in Bogota the server is already in October and the
 * Member is not (ADR-0018), which is exactly the hour this would be got wrong.
 */
export function closeMonth(of: Month, closing: Closing): ClosedMonth {
  if (!mayCloseTheMonth(closing.closedBy, closing.space)) {
    throw new UnclosableMonthError(
      "creator",
      "only the Space's creator closes a month",
    );
  }

  if (!hasEnded(of, closing.today)) {
    throw new UnclosableMonthError(
      "month",
      `${of} has not ended yet on ${closing.today}`,
    );
  }

  return {
    spaceId: closing.space.id,
    month: of,
    closedBy: closing.closedBy,
    closedOn: closing.today,
  };
}

/**
 * Whether this opening of a Space is the first one since a month ended.
 *
 * What decides that the close announces itself, and it needs no new state at
 * all -- which is not a lucky accident but the reason this shape was chosen
 * (decision 13 of #109). `space_members.last_opened_at` is written on the way
 * into every screen inside a Space (`currentSpace`) and read here *before* this
 * request overwrites it: a moment from while the month was still running,
 * arriving on a request made after it ended, **is** the first visit since the
 * month turned. The next request carries a moment from after the end, and the
 * answer is false forever after.
 *
 * ADR-0029 refused a flag for the Space being used because "a flag has to be
 * unset somewhere else", and a `dismissedAt` here would have been the same
 * refusal with a worse ending: somewhere would have had to unset it every
 * month, for every Space, for as long as the product exists.
 *
 * A Space nobody has ever opened answers true. It has not been opened since the
 * month ended either -- that is the question -- and the tempting reading of a
 * `null` is "say nothing", which would silence the announcement on exactly the
 * Space whose owner has been away longest.
 *
 * The cost of this shape, accepted on purpose (#118): a hard refresh on that
 * first load spends the announcement. That is what the standing row is for.
 */
export function firstOpeningSince(
  of: Month,
  lastOpened: CalendarDate | null,
): boolean {
  // Compared as text for the reason `hasEnded` is, and against the same bound:
  // the last day of a month is still inside it.
  return lastOpened === null || lastOpened <= lastDayOf(of);
}

/**
 * The month a Space is waiting to have closed: the oldest one that has ended
 * and has no row saying it is closed, or nothing where there is none.
 *
 * **The oldest and not the newest**, which is what #118 asks for in one line --
 * the row "leaves only when it is closed". Announcing the month that just ended
 * would take September's row off the screen the day October ended, and the row
 * would then have left without anybody closing anything. A person who ignored
 * it for a year is asked about the month they stopped at, which is the honest
 * answer to "what is still open": January really is what is still open in
 * December, and the row saying so is the row doing its job.
 *
 * **It starts at the month they joined in**, not at the month the Space was
 * made and not at the beginning of the calendar. A month that ended before this
 * Member arrived is not one they have anything to say about, and without that
 * bound the sheet would open by itself on the first screen somebody ever sees,
 * about a month their Space did not exist in. Measured off the membership
 * because the invited Member joined later than the creator did (#9).
 *
 * The last month it will look at is the one before the month being lived in --
 * a month still running has not ended, and `closeMonth` refuses it.
 */
export function theMonthWaitingToBeClosed(
  history: { joined: CalendarDate; today: CalendarDate },
  closed: ReadonlySet<string>,
): Month | null {
  // The month they joined in, however little of it was left: the last day of a
  // month is still inside it, so somebody who joined on the 30th was here.
  let month = monthOf(history.joined);
  const last = previousMonth(monthOf(history.today));

  // Text comparison, which is what `WRITTEN` buys and what `hasEnded` relies
  // on: months written `YYYY-MM` sort the way the calendar orders them.
  while (month <= last) {
    if (!closed.has(month)) return month;
    month = nextMonth(month);
  }

  return null;
}
