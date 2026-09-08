import { budgetItemsInMonth } from "@/db/budget-items";
import { database } from "@/db/client";
import { carriedOverFrom, movementsInMonth } from "@/db/movements";
import { monthAgainstPlan } from "@/domain/budget/budget";
import {
  monthOf,
  nextMonth,
  previousMonth,
  type Month,
} from "@/domain/calendar/month";
import { formatMoney } from "@/domain/money/money";
import { carryOverOf, type CarryOver } from "@/domain/space/carry-over";
import { mayApproveTheCarryOver } from "@/domain/space/creator";
import type { Space } from "@/domain/space/space";
import { monthName } from "@/i18n/day";
import type { Reader } from "@/app/reader";

/**
 * What the month before the one on screen left behind, and how it reaches the
 * person reading (#120, decisions 4, 6 and 11 of #109).
 *
 * Beside `waiting.ts` and `close.ts`, and here rather than under `presupuesto/`
 * for the reason both of those give: the carry-over comes out of a Budget's
 * arithmetic and lands in the ledger as a Movement, so a module under either
 * half would be named after half of what it answers.
 *
 * **It is read on the following month, and that is not a placement, it is the
 * decision.** The surplus becomes income *of this month*, and the deficit is a
 * fact *about this month* -- so the screen it belongs on is the one whose money
 * it is about. It also settles a tension #119 would otherwise have created: a
 * closed month "keeps every link and loses every control" (ADR-0054), and an
 * approve button standing on September after September was frozen would be the
 * one control that survived the close.
 */

/** What a month left the next one, as the card on the screen draws it. */
export type ReadableCarryOver = {
  /** The month it came out of, which is the closed one. */
  from: Month;
  /** Written to be read inside a sentence: "septiembre". */
  name: string;
  /**
   * The month it lands in, written the same way: "octubre". Always the month on
   * screen, because the carry-over of a month goes into the one after it.
   *
   * Carried rather than worked out where it is drawn, so the sheet says the
   * month the server will write into and not one a client re-derived after
   * midnight on the 1st.
   */
  into: string;
  /** How much, already in the Reader's separators and the Space's money. */
  amount: string;
  /**
   * Which of the two things happened. A surplus is offered and a deficit is
   * only ever stated, which is the whole of what this decides on the screen.
   */
  kind: CarryOver["kind"];
  /**
   * The creator's name, where a surplus is waiting on them and the Reader is
   * not them — and nothing at all otherwise.
   *
   * The same nullable field the close's row carries and for the same reason
   * (ADR-0051, ADR-0053): a name here means the card states a fact, and no name
   * means it is the Reader's to act on or there is nothing to act on at all.
   */
  waitingOn: string | null;
  /** Whether this Reader is offered the act, on this screen, right now. */
  offer: boolean;
};

/**
 * What the card says, decided over answers rather than over rows.
 *
 * **A deficit is stated and never offered**, which is decision 11 arriving on a
 * screen: there is no verb, for anybody, in any month. Approving a debt into
 * existence was never the right thing to put under a thumb, and the domain
 * refuses it as well (`approveCarryOver`) so that this is the screen agreeing
 * with a rule rather than being the rule.
 *
 * **On a closed month it states and never offers.** Approving would write a
 * Movement into the month on screen, which is the write ADR-0002 refuses -- so
 * the control comes off and the sentence stays, exactly as #119 does with every
 * other control on a closed month (ADR-0054).
 *
 * **Whether it has already been carried is not asked here**, and that is the
 * same split `closeWaitingOn` makes: which months are closed is a question
 * about rows and is answered by the half of this module that reads them. What
 * is left here is the whole of what can be decided from answers.
 */
export function carryOverToShow(asked: {
  space: Space;
  memberId: string;
  /** The name of whoever created the Space, for the card that states. */
  creatorName: string;
  /** What the month before the one in view left, or nothing where it left none. */
  left: CarryOver | null;
  /** Whether the month in view is itself closed. */
  inViewClosed: boolean;
  reader: Reader;
}): ReadableCarryOver | null {
  if (asked.left === null) return null;

  const mine = mayApproveTheCarryOver(asked.memberId, asked.space);
  const offerable = asked.left.kind === "surplus" && !asked.inViewClosed;

  return {
    from: asked.left.from,
    name: monthName(asked.left.from, monthOf(asked.reader.today)),
    into: monthName(nextMonth(asked.left.from), monthOf(asked.reader.today)),
    amount: formatMoney(asked.left.amount, asked.reader.locales),
    kind: asked.left.kind,
    waitingOn: offerable && !mine ? asked.creatorName : null,
    offer: offerable && mine,
  };
}

/**
 * The same answer, with the two things about it that live in rows.
 *
 * **A surplus already carried says nothing.** The Movement is in the ledger and
 * on the month's list; a card above it announcing the same money a second time
 * would be the screen counting it twice out loud. There is no "approved" column
 * anywhere to read for this -- the Movement *is* the approval, which is
 * ADR-0052's shape for the close asked a second time.
 *
 * **Nothing is read at all until the month before this one is closed.** That is
 * decision 6 as a query plan rather than as a sentence: what a month left
 * behind is not a figure until nothing more can go into it, so on the ordinary
 * screen -- the month being lived in, with last month still open -- this costs
 * nothing.
 *
 * **The carry-over is looked for before the arithmetic is done.** A month
 * already carried has nothing to say, and finding that out is one indexed row
 * against a unique index; working out that it was a surplus first would be two
 * month-scoped reads paid to reach the same silence.
 *
 * What is left is the cost this does have, named rather than hidden: a month
 * whose predecessor closed with a deficit pays those two reads on every opening
 * of it, forever, because a deficit has no record to leave and the sentence is
 * the only place it exists.
 */
export async function theCarryOver(asked: {
  space: Space;
  memberId: string;
  creatorName: string;
  /** The month on screen, which the carry-over would land in. */
  inView: Month;
  /** Whether the month before it is closed, off the rows already read. */
  previousClosed: boolean;
  /** Whether the month on screen is closed. */
  inViewClosed: boolean;
  reader: Reader;
}): Promise<ReadableCarryOver | null> {
  if (!asked.previousClosed) return null;

  const from = previousMonth(asked.inView);
  const db = database();

  const standing = await carriedOverFrom(db, asked.space, from);

  if (standing !== null) return null;

  const [planned, spending] = await Promise.all([
    budgetItemsInMonth(db, asked.space, from),
    movementsInMonth(db, asked.space, from),
  ]);

  return carryOverToShow({
    space: asked.space,
    memberId: asked.memberId,
    creatorName: asked.creatorName,
    // The same arithmetic the summary card of that month draws, done by the
    // same function: the figure here and the four figures there are one sum,
    // and a second implementation of "what did this month cost" is a second
    // answer waiting to disagree with the first.
    left: carryOverOf(
      from,
      monthAgainstPlan(planned, spending, asked.space.currency),
    ),
    inViewClosed: asked.inViewClosed,
    reader: asked.reader,
  });
}
