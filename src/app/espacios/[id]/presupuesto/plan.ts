import type { ReadSession } from "@/auth/session";
import type { CopiedPlan } from "@/db/budget-items";
import { ClosedMonthError } from "@/db/closed-months";
import {
  FixedItemAlreadyPaidError,
  MAX_BUDGET_ITEM_NAME_LENGTH,
  UnplannableBudgetItemError,
  type BudgetItem,
  type BudgetItemAmendment,
  type BudgetItemDraft,
  type FixedItem,
  type FixedItemAmendment,
  type FixedItemDraft,
} from "@/domain/budget/budget";
import type { CalendarDate, Month } from "@/domain/calendar/month";
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
  /**
   * The other kind's correction, and its own port for the reason `planFixed`
   * is one: it writes back two more answers, and a port that took either set
   * would be a port neither screen could be held to.
   */
  amendFixed: (
    space: Space,
    itemId: string,
    changes: FixedItemAmendment,
  ) => Promise<FixedItem | null>;
  /**
   * The Space and not its id, because taking an item off the plan is a rule
   * about the item before it is a delete (#48), and the rule has to read the
   * item to know whether it moved money.
   */
  remove: (space: Space, itemId: string) => Promise<boolean>;
  /**
   * The Movement a Fixed item's payment created, or nothing where there was no
   * pending item of that id to pay.
   */
  pay: (recorder: Recorder, itemId: string) => Promise<Movement | null>;
  /**
   * One month's plan written onto another, and what that turned out to be.
   *
   * Whole months and not a list of items, because whether a month can be
   * copied at all is decided over rows nobody handed in: what the month it
   * comes from still holds, and whether the month it lands on has been planned
   * in the meantime. A port taking items would be a port that had already made
   * both of those decisions somewhere else (`copyPlanIntoMonth`).
   */
  copyPlan: (space: Space, from: Month, into: Month) => Promise<CopiedPlan>;
};

/** The month's plan now says what the Member meant it to say. */
export type Planned = { kind: "planned"; item: BudgetItem };

/** An item is off the plan. */
export type Removed = { kind: "removed" };

/** A Fixed item is paid, and here is the Movement that says so. */
export type Paid = { kind: "paid"; movement: Movement };

/** A month that had no plan has one, carried from the month that did. */
export type Copied = { kind: "copied"; items: readonly BudgetItem[] };

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
  /**
   * The month a copy was carrying has nothing on it any more. Its own answer
   * beside the one below, because the two are fixed differently: this one
   * leaves the month unplanned and the plan has to be written by hand.
   */
  | { kind: "nothing-to-copy" }
  /**
   * The month a copy would have landed on was planned in between -- by the
   * other thumb, by hand or by a copy of its own. Nothing was written twice,
   * and what a person wanted is already on the screen behind the sheet.
   */
  | { kind: "already-planned" }
  /**
   * The month is closed, and a closed month never changes (ADR-0002). Its own
   * outcome and not a rejected field, for the reason `already-paid` is one:
   * nothing on the screen was mistyped, so pointing at an input would send a
   * person to correct something that was never the problem. What it earns is a
   * sentence saying the month is finished.
   */
  | { kind: "month-closed" }
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
 * What one screen asks for, of whichever kind of item (#80).
 *
 * A `BudgetItemDraft` and the one question that used to be a second screen:
 * whether it falls due, answered with a day or not answered at all. Nobody is
 * asked to pick a kind — after #79 the day was the only difference left
 * between the two forms, and one field is not a second screen.
 *
 * `number | null` and not an optional field, because "they said no" is an
 * answer somebody gave and a missing key is a form that lost one. The
 * difference matters one line down, where the answer picks which of the
 * domain's two shapes is built.
 */
export type PlannedItemDraft = BudgetItemDraft & {
  /** The day of the month it falls due, or nothing at all where it never does. */
  dueDay: number | null;
};

/**
 * A signed-in Member's answers become an item on a month's plan, inside a
 * Space they are really in.
 *
 * This is also where a month's Budget comes into existence: there is nothing
 * to create first, so the first item planned is the whole of it.
 *
 * One handler for both kinds since #80, and this is the seam the merge happens
 * at. Above it the screen asks one set of questions; below it the domain keeps
 * its two shapes, because a Variable item genuinely has no due day and a type
 * that let one carry `null` would be a type that stopped saying so. The `if`
 * is here rather than in either place: it is the whole of the translation
 * between what a person answers and what a plan holds.
 *
 * The day is passed on raw. `0` is what an unanswered picker reads as and
 * `NaN` what a broken one does, and `planFixedItem` refuses both by name —
 * repairing either here would file a due date nobody chose, under a kind
 * nobody chose either.
 */
export async function handlePlanBudgetItem(
  ports: BudgetPorts,
  draft: PlannedItemDraft,
): Promise<Planned | Refusal> {
  const { dueDay, ...planned } = draft;

  return inSpace(ports, draft.spaceId, async (space) => ({
    kind: "planned",
    item:
      dueDay === null
        ? await ports.plan(space, planned)
        : await ports.planFixed(space, { ...planned, dueDay }),
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

/**
 * A correction to a Fixed item, held to every rule the planning was held to.
 *
 * Its own handler beside the other kind's, and the two never merge: they ask
 * different questions, write back different columns and reach different
 * screens. What they share is this shape, which is the point of `inSpace`.
 */
export async function handleAmendFixedItem(
  ports: BudgetPorts,
  spaceId: string,
  itemId: string,
  changes: FixedItemAmendment,
): Promise<Planned | Refusal> {
  return inSpace(ports, spaceId, async (space) => {
    const amended = await ports.amendFixed(space, itemId, changes);
    return amended
      ? { kind: "planned", item: amended }
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
  return inSpace(ports, spaceId, async (space) => {
    const removed = await ports.remove(space, itemId);
    return removed ? { kind: "removed" } : { kind: "no-such-item" };
  });
}

/**
 * A month with no plan gets the most recent one there is, carried forward
 * (#121).
 *
 * Both months arrive from the screen and neither is derived here. The month
 * being planned is the one the screen is open on, and the month it copies is
 * the one the offer *named* -- which is the whole reason the offer names it.
 * Deriving "the previous month" at this depth would copy a month nobody was
 * shown, on exactly the plans that reach furthest back.
 *
 * Every outcome of the write comes back as it was decided, because all three
 * are decided over rows and not over answers: the store reads what is there
 * inside the transaction that writes, and this hands the result on. A handler
 * that re-read either month to say the same thing would be a second opinion
 * arriving a moment later than the one that counted.
 */
export async function handleCopyPlan(
  ports: BudgetPorts,
  spaceId: string,
  from: Month,
  into: Month,
): Promise<Copied | Refusal> {
  return inSpace(ports, spaceId, async (space) => {
    const outcome = await ports.copyPlan(space, from, into);

    return outcome.kind === "copied"
      ? { kind: "copied", items: outcome.items }
      : outcome;
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
    // The one refusal a closed month makes, arriving from the one place it is
    // decided (`refuseAClosedMonth`). Named here and not asked here: this
    // handler would be a second half-answer, and the month it would have to
    // ask about is not one it always holds -- a correction's month is the
    // item's, which only the store has read.
    if (error instanceof ClosedMonthError) {
      return { kind: "month-closed" };
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
    case "nothing-to-copy":
      return t("budget.error.nothingToCopy");
    case "already-planned":
      return t("budget.error.alreadyPlanned");
    case "month-closed":
      return t("budget.error.monthClosed");
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
          return t("budget.error.name", { max: MAX_BUDGET_ITEM_NAME_LENGTH });
        case "dueDay":
          return t("budget.error.dueDay");
      }
  }
}
