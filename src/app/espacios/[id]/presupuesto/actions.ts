"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { database } from "@/db/client";
import {
  amendBudgetItemInSpace,
  planBudgetItemInSpace,
  removeBudgetItemFromSpace,
} from "@/db/budget-items";
import { findSpaceForMember } from "@/db/spaces";
import { answer } from "@/app/form";
import { todayFor } from "@/app/reader";
import { report } from "@/app/report";
import {
  handleAmendBudgetItem,
  handlePlanBudgetItem,
  handleRemoveBudgetItem,
  refusalMessage,
  type BudgetFormState,
  type BudgetPorts,
} from "./plan";
import { monthInView } from "../movimientos/month";

/**
 * All the behaviour is in `plan.ts`, which is driven directly by tests. This
 * only says where a session, a Space and a store come from in production, and
 * where a Member goes once the plan has changed.
 *
 * Beside the section and not inside `nuevo/`: planning is one of the three
 * things done here, and the other two belong to `[itemId]/`.
 */
async function ports(): Promise<BudgetPorts> {
  return {
    readSession: async () => {
      const session = await auth();
      return session ? { memberId: session.user.id } : null;
    },
    findSpace: (id, memberId) => findSpaceForMember(database(), id, memberId),
    plan: (space, draft) => planBudgetItemInSpace(database(), space, draft),
    amend: (space, itemId, changes) =>
      amendBudgetItemInSpace(database(), space, itemId, changes),
    remove: (spaceId, itemId) =>
      removeBudgetItemFromSpace(database(), spaceId, itemId),
  };
}

export async function planBudgetItemAction(
  _previous: BudgetFormState,
  form: FormData,
): Promise<BudgetFormState> {
  const spaceId = answer(form, "spaceId");

  const outcome = await handlePlanBudgetItem(await ports(), {
    spaceId,
    // Passed through raw, the way the amount is: a month the screen carried is
    // a claim, and `planItem` is where a claim becomes a fact. Repairing an
    // unreadable one into this month here would plan somebody's groceries into
    // a month they were not thinking about.
    month: answer(form, "mes"),
    categoryId: answer(form, "categoryId"),
    // `Number("")` is 0 and `Number("x")` is NaN, and both are refused by the
    // domain by name. Repairing either here would hide the bug rather than the
    // typo.
    amount: Number(answer(form, "amount")),
  });

  report("Planning a Budget item", outcome);

  if (outcome.kind === "planned") {
    // Outside the handler's try on purpose: redirect works by throwing, so
    // catching around it would swallow the navigation.
    //
    // To the month the item actually landed in, and not to whichever month is
    // being lived in — planning October in September is exactly what a person
    // does on the 28th, and a redirect to "this month" would land on a plan
    // that does not contain what they just wrote.
    redirect(budgetScreen(spaceId, outcome.item.month));
  }

  return { error: refusalMessage(outcome) };
}

export async function amendBudgetItemAction(
  _previous: BudgetFormState,
  form: FormData,
): Promise<BudgetFormState> {
  const spaceId = answer(form, "spaceId");

  const outcome = await handleAmendBudgetItem(
    await ports(),
    spaceId,
    answer(form, "itemId"),
    {
      categoryId: answer(form, "categoryId"),
      amount: Number(answer(form, "amount")),
    },
  );

  report("Correcting a Budget item", outcome);

  if (outcome.kind === "planned") {
    redirect(budgetScreen(spaceId, outcome.item.month));
  }

  return { error: refusalMessage(outcome) };
}

export async function removeBudgetItemAction(
  _previous: BudgetFormState,
  form: FormData,
): Promise<BudgetFormState> {
  const spaceId = answer(form, "spaceId");

  const outcome = await handleRemoveBudgetItem(
    await ports(),
    spaceId,
    answer(form, "itemId"),
  );

  report("Removing a Budget item", outcome);

  if (outcome.kind === "removed") {
    // The item is gone, so it cannot say which month it was on. The form
    // carried it, which is why `RemoveBudgetItem` takes one. The Reader's own
    // month is what a form that somehow carried none falls back to, and it is
    // the month their plan is already open on (ADR-0018).
    redirect(
      budgetScreen(
        spaceId,
        monthInView(answer(form, "mes"), todayFor(await headers())),
      ),
    );
  }

  return { error: refusalMessage(outcome) };
}

/** The month's plan, said in one place so three redirects cannot drift. */
function budgetScreen(spaceId: string, month: string): string {
  return `/espacios/${spaceId}?mes=${month}`;
}
