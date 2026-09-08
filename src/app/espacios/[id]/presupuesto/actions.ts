"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { database } from "@/db/client";
import {
  amendBudgetItemInSpace,
  amendFixedItemInSpace,
  copyPlanIntoMonth,
  payFixedItemInSpace,
  planBudgetItemInSpace,
  planFixedItemInSpace,
  removeBudgetItemFromSpace,
} from "@/db/budget-items";
import { findSpaceForMember } from "@/db/spaces";
import { answer } from "@/app/form";
import { todayFor } from "@/app/reader";
import { report } from "@/app/report";
import {
  handleAmendBudgetItem,
  handleAmendFixedItem,
  handleCopyPlan,
  handlePayFixedItem,
  handlePlanBudgetItem,
  handleRemoveBudgetItem,
  refusalMessage,
  type BudgetFormState,
  type BudgetPorts,
} from "./plan";
import { monthInView } from "../movimientos/month";
import { month as asMonth, isMonth } from "@/domain/calendar/month";

/**
 * All the behaviour is in `plan.ts`, which is driven directly by tests. This
 * only says where a session, a Space and a store come from in production, and
 * where a Member goes once the plan has changed.
 *
 * Beside the section and not inside `nuevo/`: planning is one of the three
 * things done here, and the other two belong to `[itemId]/`.
 */
async function ports(): Promise<BudgetPorts> {
  const asked = await headers();

  return {
    readSession: async () => {
      const session = await auth();
      return session ? { memberId: session.user.id } : null;
    },
    findSpace: (id, memberId) => findSpaceForMember(database(), id, memberId),
    // The Reader's own day, which is what they mean by "hoy" (ADR-0018), and
    // deliberately *not* the server's blunter answer that a hand-typed
    // Movement is bounded by. That one guards a day somebody typed; nobody
    // types a day here, so this is the date the money is recorded on -- and at
    // nine at night on the 30th in Bogota the server is already in the next
    // month, which would file September's rent as an October expense that
    // September's own plan could never see.
    //
    // It is not a clock a tap can set: it comes from the zone the request
    // arrived with, which the edge states and the browser does not.
    today: () => todayFor(asked),
    plan: (space, draft) => planBudgetItemInSpace(database(), space, draft),
    planFixed: (space, draft) => planFixedItemInSpace(database(), space, draft),
    amend: (space, itemId, changes) =>
      amendBudgetItemInSpace(database(), space, itemId, changes),
    amendFixed: (space, itemId, changes) =>
      amendFixedItemInSpace(database(), space, itemId, changes),
    remove: (space, itemId) =>
      removeBudgetItemFromSpace(database(), space, itemId),
    pay: (recorder, itemId) =>
      payFixedItemInSpace(database(), recorder, itemId),
    copyPlan: (space, from, into) =>
      copyPlanIntoMonth(database(), space, from, into),
  };
}

/**
 * Marking a Fixed item paid, which is what creates its Movement.
 *
 * The month comes off the form rather than the clock, for the reason removing
 * an item's does: the plan being read may be next month's, and landing back on
 * "this month" would take somebody off the screen they were working on.
 */
export async function payFixedItemAction(
  _previous: BudgetFormState,
  form: FormData,
): Promise<BudgetFormState> {
  const spaceId = answer(form, "spaceId");

  const outcome = await handlePayFixedItem(
    await ports(),
    spaceId,
    answer(form, "itemId"),
  );

  report("Marking a Fixed item paid", outcome);

  if (outcome.kind === "paid") {
    redirect(
      budgetScreen(
        spaceId,
        monthInView(answer(form, "mes"), todayFor(await headers())),
      ),
    );
  }

  return { error: refusalMessage(outcome) };
}

/**
 * A month with no plan takes the most recent one there is (#121).
 *
 * Both months come off the form, and the one being copied is the one the offer
 * named: the row a person tapped said "Copiar el plan de agosto", so agosto is
 * what this copies even if a plan appeared on a nearer month in between. The
 * alternative is a copy that quietly disagrees with the words that were tapped.
 *
 * The month it lands on goes through `monthInView` like every other redirect
 * here, and the month it copies through `isMonth`. Two different questions:
 * one is "which screen is this" and falls back to the month being lived in,
 * and the other is "which plan was offered", which has no sensible fallback --
 * a month nobody named is a month nobody agreed to copy, so it is refused by
 * the same seam a bad amount is.
 */
export async function copyPlanAction(
  _previous: BudgetFormState,
  form: FormData,
): Promise<BudgetFormState> {
  const spaceId = answer(form, "spaceId");
  const into = monthInView(answer(form, "mes"), todayFor(await headers()));
  const from = answer(form, "desde");

  if (!isMonth(from)) {
    return { error: refusalMessage({ kind: "rejected", field: "month" }) };
  }

  const outcome = await handleCopyPlan(
    await ports(),
    spaceId,
    asMonth(from),
    into,
  );

  report("Copying a month's plan forward", outcome);

  if (outcome.kind === "copied") {
    redirect(budgetScreen(spaceId, into));
  }

  return { error: refusalMessage(outcome) };
}

/**
 * One item added to the month's plan, of whichever kind the day makes it (#80).
 *
 * One action, because there is one form: the two that used to be here read
 * different fields off two different forms, and after #79 the only field they
 * disagreed about was the day.
 */
export async function planBudgetItemAction(
  _previous: BudgetFormState,
  form: FormData,
): Promise<BudgetFormState> {
  const spaceId = answer(form, "spaceId");
  const dueDay = answer(form, "dueDay");

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
    // Raw, the way the Fixed item's is: `planItem` is what trims it and what
    // refuses a blank one, and a name repaired here would be a row called
    // something nobody typed.
    name: answer(form, "name"),
    // The one answer read here rather than passed on, and it is read as an
    // answer rather than repaired: the day picker is not on the form at all
    // while "No vence" is chosen (#80), so nothing posted is somebody saying
    // this item never falls due. Every other string goes to the domain as
    // typed -- `Number("x")` is NaN, and `planFixedItem` refuses it by name
    // rather than filing a due date nobody chose.
    dueDay: dueDay === "" ? null : Number(dueDay),
  });

  // One label for both kinds, because one action plans both and this only
  // ever prints when the cause was ours (`report`) -- a failure that never got
  // as far as deciding which kind it was making.
  report("Planning an item", outcome);

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
      name: answer(form, "name"),
    },
  );

  report("Correcting a Budget item", outcome);

  if (outcome.kind === "planned") {
    redirect(budgetScreen(spaceId, outcome.item.month));
  }

  return { error: refusalMessage(outcome) };
}

/**
 * A correction to a Fixed item: all four of the questions it was planned with
 * (#48).
 *
 * Beside `amendBudgetItemAction` and not merged with it, the way the two
 * planning actions are two: they read different fields off the form, and one
 * action switching on which fields happened to be posted would be an action
 * whose rules depend on a form somebody could send half of.
 */
export async function amendFixedItemAction(
  _previous: BudgetFormState,
  form: FormData,
): Promise<BudgetFormState> {
  const spaceId = answer(form, "spaceId");

  const outcome = await handleAmendFixedItem(
    await ports(),
    spaceId,
    answer(form, "itemId"),
    {
      categoryId: answer(form, "categoryId"),
      amount: Number(answer(form, "amount")),
      name: answer(form, "name"),
      // Raw, as the planning passes it: `amendFixedItem` refuses a NaN and a
      // day the month does not have by name, and repairing either here would
      // file a due date the person never chose.
      dueDay: Number(answer(form, "dueDay")),
    },
  );

  report("Correcting a Fixed item", outcome);

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

/** The month's plan, said in one place so four redirects cannot drift. */
function budgetScreen(spaceId: string, month: string): string {
  return `/espacios/${spaceId}?mes=${month}`;
}
