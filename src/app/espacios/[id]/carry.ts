import type { ReadSession } from "@/auth/session";
import { ClosedMonthError, OpenMonthError } from "@/db/closed-months";
import type { MonthComparison } from "@/domain/budget/budget";
import type { CalendarDate, Month } from "@/domain/calendar/month";
import {
  approveCarryOver,
  carryOverOf,
  UnapprovableCarryOverError,
} from "@/domain/space/carry-over";
import type { Movement, NewMovement } from "@/domain/movement/movement";
import type { Space } from "@/domain/space/space";
import { t } from "@/i18n";

/**
 * Approving the Carry-over: the second of the creator's two acts (ADR-0051),
 * and the one that moves money (#120).
 *
 * Beside `close.ts` and for its reason. This is not the plan's and not the
 * ledger's: it reads a whole month's plan against a whole month's spending and
 * writes a Movement, so a handler under either half would be named after half
 * of what it does.
 *
 * The same seam every handler here is proven at: a session, a Space, the
 * month's arithmetic and the write arrive as functions, so who may approve what
 * and when is driven in milliseconds with no server and no database.
 */
export type CarryPorts = {
  readSession: ReadSession;
  findSpace: (spaceId: string, memberId: string) => Promise<Space | null>;
  /**
   * The Reader's own day (ADR-0018). It decides one thing here: whether the
   * month being carried out of has actually ended, which is the same guard the
   * close makes and for the same reason -- at nine at night on the 30th in
   * Bogota the server is already in the next month and the Member is not.
   */
  today: () => CalendarDate;
  /**
   * What that month came to, against its own plan.
   *
   * Read here and never carried in from the screen. The figure a person tapped
   * next to is a claim like any other, and a form that posted the amount would
   * be a form that could post any amount -- the one field in the product where
   * that would put money in a ledger.
   */
  standing: (space: Space, month: Month) => Promise<MonthComparison>;
  /**
   * The write: the income the approval creates, or the one already standing.
   *
   * A `NewMovement` in and a `Movement` out, which is the shape every write in
   * this product has -- the row is what gives it an id. It also carries the two
   * refusals only rows can answer: the month it comes out of has to be closed,
   * and the month it lands in has to be open.
   */
  approve: (approved: NewMovement, space: Space) => Promise<Movement>;
};

/** The surplus is in the following month's ledger, as income nobody earned. */
export type Carried = { kind: "carried"; movement: Movement };

/**
 * Every way approving can fail to happen, each one something a screen can act
 * on.
 *
 * Apart from the success rather than one union with it, the way the close and
 * the plan both keep theirs apart: an action that can only approve must not be
 * handed anything else.
 */
export type CarryRefusal =
  | { kind: "not-signed-in" }
  | { kind: "no-such-space" }
  /**
   * The invited Member submitted it (ADR-0051). Unreachable from the screen --
   * their card states who it is waiting on and draws no control -- and answered
   * anyway, because a form field is a claim and the screen that rendered it is
   * not what decides.
   */
  | { kind: "not-the-creator" }
  /**
   * The month came to exactly its plan, or nobody planned it. There is nothing
   * to carry, which is not a failure: it is the answer.
   */
  | { kind: "nothing-to-carry" }
  /**
   * The month overspent. Decision 11 of #109 reached from the enforcing side: a
   * deficit is money already spent, and the card it went on is paid in the
   * month this would write into -- so recording it as well charges one
   * overspend twice.
   */
  | { kind: "a-deficit" }
  /** The month has not ended on the Reader's own day. */
  | { kind: "not-over-yet" }
  /**
   * The month has not been closed, so its figure is not firm (decision 6).
   * Reachable by a stale screen: the card was drawn on rows that have since
   * changed, which is exactly what this exists to catch.
   */
  | { kind: "not-closed" }
  /**
   * The month it would land in has been closed since the card was drawn. The
   * ordinary refusal every write in the product makes (ADR-0002), and it is
   * not a special case of anything: a carry-over aimed into a closed month is a
   * Movement aimed into a closed month.
   */
  | { kind: "month-is-closed" }
  /**
   * The form carried a month no calendar has. Only reachable from a screen that
   * is broken rather than mistyped -- nobody types this field -- and named
   * anyway, so that a person who somehow meets it is told something true.
   */
  | { kind: "no-such-month" }
  | { kind: "failed"; cause: unknown };

/** What the screen knows after an approval was asked for: nothing, or why not. */
export type CarryFormState = { error: string | null };

/** What the card hands `useActionState` before anything has been submitted. */
export const nothingWrongYet: CarryFormState = { error: null };

/**
 * A month's surplus approved by the Space's creator, into the month after it.
 *
 * **The month is re-measured here and the answer is never the screen's.** The
 * card said "sobraron $609.000"; this reads the rows again and decides for
 * itself, because between the drawing and the tap the month may have been
 * closed, opened on another device, or carried already. The one thing a form
 * may say is *which month*, and even that is checked against a close.
 *
 * Membership is asked before the creator, in that order and for the reason the
 * close gives: a Space somebody is not in reads as no Space at all, and saying
 * "no such space" to the invited Member would hide a Space they are looking at.
 */
export async function handleApproveCarryOver(
  ports: CarryPorts,
  spaceId: string,
  month: Month,
): Promise<Carried | CarryRefusal> {
  const session = await ports.readSession();

  if (session === null) {
    return { kind: "not-signed-in" };
  }

  try {
    const space = await ports.findSpace(spaceId, session.memberId);

    // Not found rather than forbidden, the way `currentSpace` refuses: saying
    // a Space exists but is not theirs is already saying something about it.
    if (space === null) {
      return { kind: "no-such-space" };
    }

    const left = carryOverOf(month, await ports.standing(space, month));

    // Nothing at all: the month landed on its plan, or nobody planned it. The
    // domain has no error for this because it is not a refusal -- there was
    // never anything to approve -- so it is decided here, where the answer is.
    if (left === null) {
      return { kind: "nothing-to-carry" };
    }

    const approved = approveCarryOver(left, {
      space,
      approvedBy: session.memberId,
      today: ports.today(),
    });

    // The two refusals left are the ones only rows can answer -- is the month
    // it comes out of closed, and is the month it lands in open -- and both are
    // the store's, because that is where the rows are (ADR-0052).
    return { kind: "carried", movement: await ports.approve(approved, space) };
  } catch (error) {
    if (error instanceof UnapprovableCarryOverError) {
      switch (error.field) {
        case "creator":
          return { kind: "not-the-creator" };
        case "kind":
          return { kind: "a-deficit" };
        case "month":
          return { kind: "not-over-yet" };
      }
    }

    // The month it comes out of is not closed, so its figure is not firm.
    if (error instanceof OpenMonthError) {
      return { kind: "not-closed" };
    }

    // The month it lands in is closed, which is the refusal every other write
    // in the product meets in the same place.
    if (error instanceof ClosedMonthError) {
      return { kind: "month-is-closed" };
    }

    return { kind: "failed", cause: error };
  }
}

/**
 * What a refused approval says on the screen.
 *
 * Kept beside the outcomes it maps, so adding an outcome without deciding what
 * a person is told about it is a type error rather than a blank screen.
 */
export function carryRefusalMessage(refusal: CarryRefusal): string {
  switch (refusal.kind) {
    case "not-signed-in":
      return t("budget.error.signedOut");
    case "no-such-space":
      return t("budget.error.space");
    case "not-the-creator":
      return t("carry.error.notTheCreator");
    case "nothing-to-carry":
      return t("carry.error.nothingToCarry");
    case "a-deficit":
      return t("carry.error.aDeficit");
    case "not-over-yet":
      return t("carry.error.notOverYet");
    case "not-closed":
      return t("carry.error.notClosed");
    case "month-is-closed":
      return t("carry.error.monthIsClosed");
    case "no-such-month":
      return t("carry.error.month");
    case "failed":
      return t("carry.error.failed");
  }
}
