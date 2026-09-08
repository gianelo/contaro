import type { MonthComparison } from "../budget/budget";
import {
  firstDayOf,
  hasEnded,
  nextMonth,
  type CalendarDate,
  type Month,
} from "../calendar/month";
import { money, type Money } from "../money/money";
import type { NewMovement } from "../movement/movement";
import { mayApproveTheCarryOver } from "./creator";
import type { Space } from "./space";

/**
 * The carry-over: what a month left behind, and the one of the two halves that
 * moves (ADR-0003, amended by #120).
 *
 * Beside `closure.ts` and for its reason. This is the second of the creator's
 * two acts (ADR-0051), it reaches into a Budget's arithmetic and comes out as a
 * Movement, and a module living inside either of those two would be named after
 * half of what it answers -- the same argument that put the close here rather
 * than under the Budget.
 *
 * **The two halves are not symmetric, and the asymmetry is the whole point**
 * (decision 11 of #109). A surplus is money that still exists and can be spent
 * again, so it becomes income in the following month. A deficit is money
 * already spent -- almost always on a card, and that card is paid the following
 * month, where the payment is a genuine expense of it. Subtracting the deficit
 * as well would charge one overspend twice and render a month that was fine as
 * a month that failed. So a surplus is a Movement and a deficit is a sentence,
 * and this module can produce the first and refuses to produce the second.
 */

/** Which of the two things a month left behind. */
export type CarryOverKind = "surplus" | "deficit";

/**
 * What a closed month left the following one, as a figure and what it means.
 *
 * The amount is positive in both directions and `kind` is what it means, which
 * is ADR-0016's rule about a Movement's direction applied to the one figure
 * that has the same shape: a sign is a thing you can lose, and a `Math.abs`
 * downstream would turn a month that overspent into a month that saved.
 */
export type CarryOver = {
  /** The month it came out of, which is the closed one. */
  from: Month;
  kind: CarryOverKind;
  /** How much, in the Space's money, always positive. */
  amount: Money;
};

/**
 * What a month left behind, read off the same arithmetic its summary card
 * draws.
 *
 * It takes the comparison rather than the items and the Movements, so the
 * figure here and the four figures at the top of the Budget screen cannot
 * disagree: they are one sum, done once (`monthAgainstPlan`). Doing it again
 * here would be a second implementation of "what did this month cost", and the
 * day the two drift is the day a person is offered a surplus the card above it
 * says they do not have.
 *
 * **Nothing at all on a month nobody planned.** A Budget is its items and comes
 * into existence with the first one (ADR-0019), so a month with no items has no
 * Budget -- and the carry-over is "the unspent part of a month's Budget"
 * (CONTEXT.md). Read the other way, every peso of an unplanned month would be a
 * deficit against a plan of zero, which is the product telling somebody they
 * overspent a plan they never wrote.
 *
 * **Nothing at all on a month that landed exactly on its plan.** A carry-over of
 * nothing is not money, and a card announcing it is a screen interrupting
 * somebody to say that nothing happened.
 */
export function carryOverOf(
  from: Month,
  against: MonthComparison,
): CarryOver | null {
  if (against.expected.amount === 0) return null;

  const currency = against.expected.currency;

  if (against.over !== null) {
    return { from, kind: "deficit", amount: against.over };
  }

  const unspent = against.expected.amount - against.spent.amount;

  if (unspent === 0) return null;

  return { from, kind: "surplus", amount: money(unspent, currency) };
}

/** Who is approving a carry-over, out of which Space, on which day. */
export type Approving = {
  space: Space;
  /** The Member tapping, which has to be the Space's creator (ADR-0051). */
  approvedBy: string;
  /** The Reader's own day, and never the server's (ADR-0018). */
  today: CalendarDate;
};

/**
 * Thrown when a carry-over cannot be approved as asked. `field` says which of
 * the three questions was the bad one, so a screen can say what happened
 * instead of apologising in general -- and the three are fixed in completely
 * different ways, or in the case of a deficit are not fixed at all.
 */
export class UnapprovableCarryOverError extends Error {
  readonly field: "creator" | "kind" | "month";

  constructor(field: "creator" | "kind" | "month", reason: string) {
    super(`This carry-over cannot be approved: ${reason}.`);
    this.name = "UnapprovableCarryOverError";
    this.field = field;
  }
}

/**
 * A surplus approved: one income in the following month, attributed to nobody.
 *
 * A `NewMovement` and not a `MovementDraft`, which is where this departs from
 * the other act that brings money into existence from a plan -- `paymentFor`
 * hands a draft to `recordMovement` and is checked by it. This cannot, and the
 * reason is the shape of the row rather than convenience: `recordMovement`
 * exists to turn a screen's claims into facts, and its rule about attribution
 * is that a Movement is somebody's. A draft that could say "nobody" would be a
 * field the entry form could post, and the entry form posting it would mint an
 * unattributed income out of a month nobody closed. So the one Movement in the
 * product that has no Member is the one Movement no form can describe.
 *
 * **It is dated the first day of the following month**, and never the day of the
 * tap. The money is the following month's from the moment it is approved, and a
 * carry-over approved on the 24th would otherwise sit three weeks down that
 * month's list, under a day nothing happened on. The figure it carries is the
 * one the month closed with, so the day it is written under is the day that
 * month began.
 *
 * Three refusals and no more:
 *
 * **The creator** (ADR-0051), asked through `mayApproveTheCarryOver` rather than
 * compared here, so this and the close cannot drift apart.
 *
 * **Never a deficit.** This is decision 11 of #109 made unwritable rather than
 * merely undrawn: there is no screen that offers it, and there is no function
 * that could be called by one. ADR-0003 as originally written did not say the
 * carry-over was one-directional; it says so now, and this is where the sentence
 * is enforced.
 *
 * **A month that has ended**, measured against the Reader's day, which is the
 * guard `closeMonth` already makes and this one repeats for its own reason: the
 * day this writes is the first of the following month, and until the month it
 * came out of has ended that is a day that has not happened. `recordMovement`
 * would have refused it, and this is the one write that does not go through it.
 */
export function approveCarryOver(
  carried: CarryOver,
  approving: Approving,
): NewMovement {
  if (!mayApproveTheCarryOver(approving.approvedBy, approving.space)) {
    throw new UnapprovableCarryOverError(
      "creator",
      "only the Space's creator approves the carry-over",
    );
  }

  if (carried.kind === "deficit") {
    throw new UnapprovableCarryOverError(
      "kind",
      "a deficit is stated and never recorded (ADR-0003)",
    );
  }

  if (!hasEnded(carried.from, approving.today)) {
    throw new UnapprovableCarryOverError(
      "month",
      `${carried.from} has not ended yet on ${approving.today}`,
    );
  }

  return {
    spaceId: approving.space.id,
    // Money that is available again, which is what the Members already call it
    // and what keeps it in the ledger rather than buried in a plan (ADR-0003).
    direction: "income",
    // Income is filed nowhere (ADR-0016), and there is no Category a carry-over
    // could belong under even if the dimension took one.
    categoryId: null,
    amount: carried.amount,
    occurredOn: firstDayOf(nextMonth(carried.from)),
    // Who typed it in is still a fact, and it is the one thing about this row
    // that is a person: somebody tapped approve. Whose money it is, is nobody's.
    recordedBy: approving.approvedBy,
    // The whole of ADR-0003's "attributed to no Member": nobody earned it, and
    // a report about what each Member contributed reads exactly the rows where
    // this is a name.
    attributedTo: null,
    carriedFrom: carried.from,
    // Read by where it came from and not by a name, which is what `carriedFrom`
    // is for: "Arrastre de septiembre" is copy, and copy does not live here.
    name: null,
  };
}
