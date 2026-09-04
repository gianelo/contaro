import type { ReadSession } from "@/auth/session";
import {
  FixedItemAlreadyPaidError,
  MAX_FIXED_ITEM_NAME_LENGTH,
  UnplannableBudgetItemError,
  type BudgetItem,
  type BudgetItemAmendment,
  type BudgetItemDraft,
  type FixedItem,
  type FixedItemDraft,
} from "@/domain/budget/budget";
import type { CalendarDate } from "@/domain/calendar/month";
import type { Movement, Recorder } from "@/domain/movement/movement";
import type { Space } from "@/domain/space/space";
import { t } from "@/i18n";

/**
 * Everything these handlers need from the world outside them, as functions.
 *
 * The seam #10 is proven at. A session, a Space and a store arrive as
 * arguments, so the whole path — answers to Budget item to refusal — is driven
 * in milliseconds with no server, no database and no Google account.
 *
 * There is a clock, and only one thing here uses it. Planning still does not:
 * a plan is about a month somebody named, and next month is exactly the month
 * a person plans in. Marking a Fixed item paid does, because that creates a
 * Movement, and a Movement is money that already moved -- it is dated the day
 * somebody says it moved, by a clock nobody tapping can set (#13).
 */
export type BudgetPorts = {
  readSession: ReadSession;
  findSpace: (spaceId: string, memberId: string) => Promise<Space | null>;
  /** The day it is, by a clock nobody tapping can move. */
  today: () => CalendarDate;
  plan: (space: Space, draft: BudgetItemDraft) => Promise<BudgetItem>;
  planFixed: (space: Space, draft: FixedItemDraft) => Promise<FixedItem>;
  amend: (
    space: Space,
    itemId: string,
    changes: BudgetItemAmendment,
  ) => Promise<BudgetItem | null>;
  remove: (spaceId: string, itemId: string) => Promise<boolean>;
  /**
   * The Movement a Fixed item's payment created, or nothing where there was no
   * pending item of that id to pay.
   */
  pay: (recorder: Recorder, itemId: string) => Promise<Movement | null>;
};

/** The month's plan now says what the Member meant it to say. */
export type Planned = { kind: "planned"; item: BudgetItem };

/** An item is off the plan. */
export type Removed = { kind: "removed" };

/** A Fixed item is paid, and here is the Movement that says so. */
export type Paid = { kind: "paid"; movement: Movement };

/**
 * Every way this can fail to happen, each one something a screen can act on.
 *
 * Apart from the two successes rather than one union with them, for the reason
 * `Refusal` in `record.ts` is: an action that can only remove must not be
 * handed an item.
 */
export type Refusal =
  | { kind: "rejected"; field: UnplannableBudgetItemError["field"] }
  | { kind: "not-signed-in" }
  | { kind: "no-such-space" }
  | { kind: "no-such-item" }
  | { kind: "already-paid" }
  | { kind: "failed"; cause: unknown };

/**
 * What the entry screen knows after a submission: nothing, or why it was
 * refused.
 *
 * Here rather than beside the action itself: a "use server" module may export
 * async functions and nothing else, so a state constant living next to the
 * action compiles and then fails at runtime on the first request.
 */
export type BudgetFormState = { error: string | null };

export const nothingWrongYet: BudgetFormState = { error: null };

/**
 * A signed-in Member's answers become an item on a month's plan, inside a
 * Space they are really in.
 *
 * This is also where a month's Budget comes into existence: there is nothing
 * to create first, so the first item planned is the whole of it.
 */
export async function handlePlanBudgetItem(
  ports: BudgetPorts,
  draft: BudgetItemDraft,
): Promise<Planned | Refusal> {
  return inSpace(ports, draft.spaceId, async (space) => ({
    kind: "planned",
    item: await ports.plan(space, draft),
  }));
}

/**
 * A Fixed item planned: an amount on a Category, called something, due on a
 * day of the month being planned.
 *
 * Beside `handlePlanBudgetItem` rather than folded into it. The two kinds are
 * one plan and they share every rule about Spaces and sessions, which is why
 * `inSpace` is asked for both; what they do not share is what a person is
 * asked for, and one handler taking a draft that is sometimes two fields
 * longer would be that difference hidden inside an `if`.
 */
export async function handlePlanFixedItem(
  ports: BudgetPorts,
  draft: FixedItemDraft,
): Promise<Planned | Refusal> {
  return inSpace(ports, draft.spaceId, async (space) => ({
    kind: "planned",
    item: await ports.planFixed(space, draft),
  }));
}

/**
 * A Fixed item marked paid by a Member of its Space, which is what creates its
 * Movement.
 *
 * `recordedBy` comes from the session and the day from the clock, exactly as
 * recording an expense by hand does -- so the Movement a plan creates carries
 * who typed it in and whose money it was like any other (#13), and is a
 * Movement in every respect rather than a second kind of entry.
 *
 * Nothing found and already paid are two different answers here, unlike in the
 * store below them, because a person is owed the difference: one is a row that
 * is not theirs and the other is the row in front of them, already settled.
 */
export async function handlePayFixedItem(
  ports: BudgetPorts,
  spaceId: string,
  itemId: string,
): Promise<Paid | Refusal> {
  return inSpace(ports, spaceId, async (space, memberId) => {
    const movement = await ports.pay(
      { space, recordedBy: memberId, today: ports.today() },
      itemId,
    );

    return movement
      ? { kind: "paid", movement }
      : { kind: "no-such-item" };
  });
}

/** A correction to an item, held to every rule the planning was held to. */
export async function handleAmendBudgetItem(
  ports: BudgetPorts,
  spaceId: string,
  itemId: string,
  changes: BudgetItemAmendment,
): Promise<Planned | Refusal> {
  return inSpace(ports, spaceId, async (space) => {
    const amended = await ports.amend(space, itemId, changes);
    // Not found rather than forbidden: an item in a Space this Member is not
    // in must read the same as one that never existed.
    return amended ? { kind: "planned", item: amended } : { kind: "no-such-item" };
  });
}

/**
 * An item taken off the plan by a Member of its Space.
 *
 * Any Member may remove any of the Space's items — inside a shared Space the
 * money is one pot — and nothing is kept. Unlike a struck Movement (ADR-0015):
 * that is a ledger, where a lost row silently changes every figure downstream,
 * and this is a plan, where a line removed before the month is read was never
 * measured against anything.
 */
export async function handleRemoveBudgetItem(
  ports: BudgetPorts,
  spaceId: string,
  itemId: string,
): Promise<Removed | Refusal> {
  return inSpace(ports, spaceId, async () => {
    const removed = await ports.remove(spaceId, itemId);
    return removed ? { kind: "removed" } : { kind: "no-such-item" };
  });
}

/**
 * The two things every one of the above does first: who is asking, and whether
 * they are in this Space.
 *
 * Written once because it is one rule. Three copies of "prove the membership
 * before writing" is three places for one of them to stop proving it.
 */
async function inSpace<Done>(
  ports: BudgetPorts,
  spaceId: string,
  act: (space: Space, memberId: string) => Promise<Done | Refusal>,
): Promise<Done | Refusal> {
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

    return await act(space, session.memberId);
  } catch (error) {
    // A bad answer is the person's to fix and is named on the screen. Anything
    // else is ours, and saying "the amount is wrong" about a dropped
    // connection would send them to correct a field that was never the problem.
    if (error instanceof UnplannableBudgetItemError) {
      return { kind: "rejected", field: error.field };
    }
    // The item in front of them is already settled. It points at no answer on
    // any screen -- nothing was mistyped -- so it is its own outcome rather
    // than a rejected field, and what it earns is a sentence saying so.
    if (error instanceof FixedItemAlreadyPaidError) {
      return { kind: "already-paid" };
    }
    return { kind: "failed", cause: error };
  }
}

/**
 * What a refused plan says on the screen.
 *
 * Kept beside the outcomes it maps, so adding an outcome without deciding what
 * a person is told about it is a type error rather than a blank screen.
 */
export function refusalMessage(refusal: Refusal): string {
  switch (refusal.kind) {
    case "not-signed-in":
      return t("budget.error.signedOut");
    case "no-such-space":
      return t("budget.error.space");
    case "no-such-item":
      return t("budget.error.gone");
    case "already-paid":
      return t("budget.error.alreadyPaid");
    case "failed":
      return t("budget.error.failed");
    case "rejected":
      switch (refusal.field) {
        case "amount":
          return t("budget.error.amount");
        case "category":
          return t("budget.error.category");
        case "month":
          // Only reachable from a screen that carried a month no calendar has,
          // which is broken rather than mistyped. Named anyway: a person who
          // somehow sees it can act on it.
          return t("budget.error.month");
        case "space":
          // The draft named no Space this Member is in. Nothing on the screen
          // is the problem, so pointing at a field would send them to fix the
          // wrong thing.
          return t("budget.error.space");
        case "name":
          return t("budget.error.name", { max: MAX_FIXED_ITEM_NAME_LENGTH });
        case "dueDay":
          return t("budget.error.dueDay");
      }
  }
}
