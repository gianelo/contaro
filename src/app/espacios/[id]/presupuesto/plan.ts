import type { ReadSession } from "@/auth/session";
import {
  UnplannableBudgetItemError,
  type BudgetItem,
  type BudgetItemAmendment,
  type BudgetItemDraft,
} from "@/domain/budget/budget";
import type { Space } from "@/domain/space/space";
import { t } from "@/i18n";

/**
 * Everything these handlers need from the world outside them, as functions.
 *
 * The seam #10 is proven at. A session, a Space and a store arrive as
 * arguments, so the whole path — answers to Budget item to refusal — is driven
 * in milliseconds with no server, no database and no Google account.
 *
 * No clock, unlike `MovementPorts`. A Movement is money that already moved and
 * so has a day to hold against the calendar; a plan is about a month somebody
 * named, and next month is exactly the month a person plans in.
 */
export type BudgetPorts = {
  readSession: ReadSession;
  findSpace: (spaceId: string, memberId: string) => Promise<Space | null>;
  plan: (space: Space, draft: BudgetItemDraft) => Promise<BudgetItem>;
  amend: (
    space: Space,
    itemId: string,
    changes: BudgetItemAmendment,
  ) => Promise<BudgetItem | null>;
  remove: (spaceId: string, itemId: string) => Promise<boolean>;
};

/** The month's plan now says what the Member meant it to say. */
export type Planned = { kind: "planned"; item: BudgetItem };

/** An item is off the plan. */
export type Removed = { kind: "removed" };

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
  act: (space: Space) => Promise<Done | Refusal>,
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

    return await act(space);
  } catch (error) {
    // A bad answer is the person's to fix and is named on the screen. Anything
    // else is ours, and saying "the amount is wrong" about a dropped
    // connection would send them to correct a field that was never the problem.
    if (error instanceof UnplannableBudgetItemError) {
      return { kind: "rejected", field: error.field };
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
      }
  }
}
