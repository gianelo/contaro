import type { ReadSession } from "@/auth/session";
import type { CalendarDate, Month } from "@/domain/calendar/month";
import {
  UnclosableMonthError,
  type ClosedMonth,
  type Closing,
} from "@/domain/space/closure";
import type { Space } from "@/domain/space/space";
import { t } from "@/i18n";

/**
 * Closing a month: the one irreversible act in contaro (ADR-0002).
 *
 * Here and not under `presupuesto/` or `movimientos/`, because the close is not
 * either of theirs. It freezes a month's Movements as much as its plan, and a
 * handler living inside one of the two halves it freezes would be a handler
 * named after half of what it does. ADR-0019 said the same thing about where
 * the record itself belongs.
 *
 * The seam every other handler in this app is proven at: a session, a Space and
 * a store arrive as functions, so who may close a month and when is driven in
 * milliseconds with no server, no database and no Google account.
 */
export type ClosePorts = {
  readSession: ReadSession;
  findSpace: (spaceId: string, memberId: string) => Promise<Space | null>;
  /**
   * The Reader's own day (ADR-0018), and this is the one place in the product
   * where using the server's instead would be unrecoverable: at nine at night
   * on the 30th in Bogota the server is already in October, and closing on its
   * answer would permanently freeze a month that, for the person tapping, is
   * still running.
   */
  today: () => CalendarDate;
  /**
   * The close, or nothing where the month was already closed.
   *
   * A `Closing` and not its three parts laid out flat. Who is closing, inside
   * which Space, on which day is one value the domain already names -- taken
   * apart here it would be a shape this port and the store would each have to
   * put back together, and the day one of them reordered it the close would be
   * attributed to a Space.
   */
  close: (closing: Closing, month: Month) => Promise<ClosedMonth | null>;
};

/** The month is closed, and nothing in it changes again. */
export type Closed = { kind: "closed"; closed: ClosedMonth };

/**
 * Every way the close can fail to happen, each one something a screen can act
 * on.
 *
 * Apart from the success rather than one union with it, for the reason the
 * other two handler modules keep theirs apart: an action that can only close
 * must not be handed anything else.
 */
export type CloseRefusal =
  | { kind: "not-signed-in" }
  | { kind: "no-such-space" }
  /**
   * The invited Member tapped it (ADR-0051). It should be unreachable -- #118
   * shows them the row stating the fact and never the button -- and it is
   * answered anyway, because a form field is a claim and the screen that
   * rendered it is not what decides.
   */
  | { kind: "not-the-creator" }
  /** The month is still running on the Reader's own day. */
  | { kind: "not-over-yet" }
  /**
   * Somebody already closed it. Not a failure anybody made: the month is in
   * exactly the state the tap was asking for, and there is no second close to
   * regret.
   */
  | { kind: "already-closed" }
  /**
   * The form carried a month no calendar has. Only reachable from a screen
   * that is broken rather than mistyped -- nobody types this field -- and
   * named anyway, the way the plan names its own: a person who somehow sees it
   * can act on it, and "that month has not ended" would send them to wait for
   * something that will never fix it.
   */
  | { kind: "no-such-month" }
  | { kind: "failed"; cause: unknown };

/** What the screen knows after a close was asked for: nothing, or why not. */
export type CloseFormState = { error: string | null };

/**
 * What the sheet hands `useActionState` before anything has been submitted.
 *
 * Shipped now that there is a form to initialise (#118). #117 deliberately left
 * this out and said so: a constant with no caller is a constant nothing keeps
 * honest.
 */
export const nothingWrongYet: CloseFormState = { error: null };

/**
 * A month closed by the Space's creator, on the Reader's day.
 *
 * Membership is asked here and the creator is asked below it, in that order,
 * because they refuse differently: a Space somebody is not in reads as no Space
 * at all, and a Space they are in but did not create is a real Space they may
 * not close. Saying "no such space" to the invited Member would hide a Space
 * they can see on the screen they are standing on.
 */
export async function handleCloseMonth(
  ports: ClosePorts,
  spaceId: string,
  month: Month,
): Promise<Closed | CloseRefusal> {
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

    const closed = await ports.close(
      { space, closedBy: session.memberId, today: ports.today() },
      month,
    );

    return closed ? { kind: "closed", closed } : { kind: "already-closed" };
  } catch (error) {
    // The two the domain refuses by name, told apart because they are fixed in
    // completely different ways: one is answered by the other Member and the
    // other by the calendar.
    if (error instanceof UnclosableMonthError) {
      return {
        kind: error.field === "creator" ? "not-the-creator" : "not-over-yet",
      };
    }
    return { kind: "failed", cause: error };
  }
}

/**
 * What a refused close says on the screen.
 *
 * Kept beside the outcomes it maps, so adding an outcome without deciding what
 * a person is told about it is a type error rather than a blank screen.
 */
export function closeRefusalMessage(refusal: CloseRefusal): string {
  switch (refusal.kind) {
    case "not-signed-in":
      return t("budget.error.signedOut");
    case "no-such-space":
      return t("budget.error.space");
    case "not-the-creator":
      return t("close.error.notTheCreator");
    case "not-over-yet":
      return t("close.error.notOverYet");
    case "already-closed":
      return t("close.error.alreadyClosed");
    case "no-such-month":
      return t("close.error.month");
    case "failed":
      return t("close.error.failed");
  }
}
