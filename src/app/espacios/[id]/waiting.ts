import { budgetItemsInMonth } from "@/db/budget-items";
import { database } from "@/db/client";
import { closedMonthsFrom } from "@/db/closed-months";
import { movementsInMonth } from "@/db/movements";
import type { SpaceOpening } from "@/db/spaces";
import {
  monthOf,
  previousMonth,
  type CalendarDate,
  type Month,
} from "@/domain/calendar/month";
import { isPaid } from "@/domain/budget/budget";
import { mayCloseTheMonth } from "@/domain/space/creator";
import {
  firstOpeningSince,
  theMonthWaitingToBeClosed,
} from "@/domain/space/closure";
import type { Space } from "@/domain/space/space";
import { monthName } from "@/i18n/day";
import { dayForReader } from "@/app/reader";
import type { Reader } from "@/app/reader";

/**
 * The close a Space is waiting on, and how it reaches the person standing on
 * the Budget screen (#118, decisions 3, 12, 13 and 14 of #109).
 *
 * Here and not under `presupuesto/`, beside `close.ts` and for its reason: the
 * close freezes a month's Movements as much as its plan, and the Budget screen
 * is where a thumb happens to be rather than what the act belongs to.
 */

/** How a Member's membership row reads as days, where they are standing. */
export type SpaceHistory = {
  /** The day the Space became theirs. */
  joined: CalendarDate;
  /**
   * The day they last opened it, read before this request overwrote it, or
   * nothing where they never had.
   */
  lastOpened: CalendarDate | null;
};

/** A month that has ended, has not been closed, and is somebody's to close. */
export type WaitingClose = {
  month: Month;
  /** Written to be read inside a sentence: "septiembre". */
  name: string;
  /**
   * The month it now spends into: what a September receipt found in October
   * comes out of (ADR-0002). Always the month being lived in, because the month
   * waiting to be closed is always the one before it.
   */
  nextName: string;
  /**
   * The creator's name, where the Reader is not them — and nothing at all where
   * they are.
   *
   * The whole of the asymmetry, in one nullable field (decision 14, ADR-0051).
   * A name here means the row states a fact; no name means it offers an act.
   * It is not a `mayClose` boolean beside a name, because those are two fields
   * that have to agree and this is one fact: whoever is not the creator is
   * waiting on somebody, and that somebody has a name.
   */
  waitingOn: string | null;
  /**
   * Whether the sheet opens by itself on this load, and never again.
   *
   * Only ever true for the creator. Announcing an act to the one Member who
   * cannot perform it would be an interruption with no answer to it, which is
   * the opposite of what the standing row does for them.
   */
  announces: boolean;
};

/**
 * The close waiting on this Space, as this Member should be told about it.
 *
 * **The month is the oldest one still open**, and never the one on the screen.
 * The screen's month is wherever somebody navigated to; a month ending is news,
 * and news does not depend on which month you happened to be reading when it
 * arrived (decision 12). Which month is waiting is `theMonthWaitingToBeClosed`,
 * because "leaves only when it is closed" is a promise about a month and not
 * about a screen: a row that moved on to October the day October ended would be
 * a row that left with September still open.
 *
 * **The announcement is about the newest, even when the row is about the
 * oldest.** They are the same month in every ordinary case; where they are not,
 * a person has already been interrupted about the older one and the row has been
 * standing ever since. That is decision 12 working as drawn -- the row does not
 * have to interrupt, because the sheet already said it once.
 */
export function closeWaitingOn(asked: {
  space: Space;
  memberId: string;
  /** The name of whoever created the Space, for the row that states. */
  creatorName: string;
  today: CalendarDate;
  /** Which of this Space's months are closed, from the one they joined in. */
  closed: ReadonlySet<string>;
  /** Nothing at all where this Member has no membership row to read. */
  history: SpaceHistory | null;
}): WaitingClose | null {
  // A Member with no row is not in this Space at all, which every caller has
  // already refused. Answered rather than thrown, because the honest reading
  // of "no history" is "nothing to announce".
  if (asked.history === null) return null;

  const thisMonth = monthOf(asked.today);

  const month = theMonthWaitingToBeClosed(
    { joined: asked.history.joined, today: asked.today },
    asked.closed,
  );

  // Every month they have been here for is closed. The row exists to end, and
  // this is where it ends (#118).
  if (month === null) return null;

  const mine = mayCloseTheMonth(asked.memberId, asked.space);

  return {
    month,
    name: monthName(month, thisMonth),
    nextName: monthName(thisMonth, thisMonth),
    waitingOn: mine ? null : asked.creatorName,
    announces:
      mine &&
      firstOpeningSince(previousMonth(thisMonth), asked.history.lastOpened),
  };
}

/**
 * What the month about to be frozen holds, so that nothing is frozen blind.
 *
 * Two figures and not a summary of the month's money. The sheet is not asking
 * "was this a good month" -- the screen behind it already answers that -- it is
 * asking "is there anything still to load", which is the one question a person
 * can still act on before the act that has no undo (`design/SheetCerrar`).
 */
export type ClosingTally = {
  /** How many Movements the month holds. */
  movements: number;
  /** How many of its Fixed items fell due and were never marked paid. */
  unpaid: number;
};

/** The waiting close, with what its month holds where that is drawn. */
export type AnnouncedClose = WaitingClose & {
  /**
   * What the month holds, for the sheet the creator can open — and nothing at
   * all for the invited Member, whose row states a fact and opens nothing.
   */
  tally: ClosingTally | null;
};

/**
 * The same answer, with the two things about it that live in rows.
 *
 * Which months are closed is asked through `closedMonthsFrom` and nowhere else,
 * which keeps the promise `closed-months.ts` makes: the closed months are read
 * in one module, however many screens and writes ask about them.
 *
 * The moments come in as `Date`s and are read as days where the Reader is
 * standing, never where the server is (ADR-0018). Getting this wrong shows the
 * announcement one load early or one load late, which the next request
 * corrects — unlike the close itself, which nothing corrects.
 */
export async function theCloseWaiting(asked: {
  space: Space;
  memberId: string;
  creatorName: string;
  reader: Reader;
  /** The request's own headers, to read a moment as the Reader's day. */
  headers: Headers;
  opening: SpaceOpening | null;
}): Promise<AnnouncedClose | null> {
  const history = asked.opening && {
    joined: dayForReader(asked.headers, asked.opening.joinedAt),
    lastOpened:
      asked.opening.lastOpenedAt &&
      dayForReader(asked.headers, asked.opening.lastOpenedAt),
  };

  // Read no further back than the month they joined in, which is exactly as far
  // back as the decision below will look. A Member who is not in this Space has
  // no history and nothing to be told, so nothing is read at all.
  const closed = history
    ? await closedMonthsFrom(
        database(),
        asked.space.id,
        monthOf(history.joined),
      )
    : new Set<string>();

  const waiting = closeWaitingOn({
    space: asked.space,
    memberId: asked.memberId,
    creatorName: asked.creatorName,
    today: asked.reader.today,
    closed,
    history,
  });

  if (waiting === null) return null;

  // Counted only for whoever can open the sheet it is drawn in, which is the
  // creator alone. The invited Member's row states that the month is waiting
  // and offers no tap, so two queries for a tray nobody can reach would be two
  // queries paid on every load of their Budget screen for nothing.
  //
  // Counted whether or not the sheet opens by itself, because the row opens it
  // too. What that costs is a second month's rows fetched on every load of this
  // screen for as long as a month stays unclosed -- and the state it is paid in
  // is exactly the state the row exists to end.
  // The invited Member never opens the sheet, so the tray it would fill is two
  // queries with nowhere to be drawn.
  const forTheCreator = waiting.waitingOn === null;

  return {
    ...waiting,
    tally: forTheCreator ? await tallyOf(asked.space, waiting.month) : null,
  };
}

/**
 * What a month holds, read straight off its rows.
 *
 * The two reads the Budget screen already makes for the month in view, made
 * again for the month that ended -- which is a different month and cannot share
 * them. Nothing is summed: the tray counts rows, and the figures the month came
 * to are on the screen the sheet opened over.
 */
async function tallyOf(space: Space, month: Month): Promise<ClosingTally> {
  const db = database();

  const [movements, items] = await Promise.all([
    movementsInMonth(db, space, month),
    budgetItemsInMonth(db, space, month),
  ]);

  return {
    movements: movements.length,
    // "Pending" read through the Movement that paid it and never off a flag,
    // which is what `isPaid` exists to guarantee (ADR-0031): a Fixed item whose
    // payment was struck out is pending again, and the tray has to say so.
    unpaid: items.filter((item) => item.kind === "fixed" && !isPaid(item))
      .length,
  };
}
