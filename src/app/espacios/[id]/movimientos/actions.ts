"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { database } from "@/db/client";
import {
  amendMovementInSpace,
  recordMovementInSpace,
  strikeMovementInSpace,
} from "@/db/movements";
import { findSpaceForMember } from "@/db/spaces";
import { answer } from "@/app/form";
import { monthOf } from "@/domain/calendar/month";
import {
  handleAmendMovement,
  handleRecordMovement,
  handleStrikeMovement,
  refusalMessage,
  type MovementFormState,
  type MovementPorts,
} from "./record";
import { monthInView, todayOnTheServer } from "./month";

/**
 * All the behaviour is in `record.ts`, which is driven directly by tests. This
 * only says where a session, a Space, a clock and a store come from in
 * production, and where a Member goes once the Movement exists.
 *
 * Beside the section and not inside `nuevo/`: recording is one of the three
 * things done here, and the other two belong to `[movementId]/`. A module two
 * screens reach for through `../nuevo/` is a module whose path is lying about
 * what it is.
 */
async function ports(): Promise<MovementPorts> {
  return {
    readSession: async () => {
      const session = await auth();
      return session ? { memberId: session.user.id } : null;
    },
    findSpace: (id, memberId) => findSpaceForMember(database(), id, memberId),
    today: todayOnTheServer,
    save: (recorder, draft) =>
      recordMovementInSpace(database(), recorder, draft),
    amend: (recorder, movementId, changes) =>
      amendMovementInSpace(database(), recorder, movementId, changes),
    strike: (spaceId, movementId, struckBy) =>
      strikeMovementInSpace(database(), spaceId, movementId, struckBy),
  };
}

export async function recordMovementAction(
  _previous: MovementFormState,
  form: FormData,
): Promise<MovementFormState> {
  const spaceId = answer(form, "spaceId");

  const outcome = await handleRecordMovement(await ports(), {
    spaceId,
    categoryId: answer(form, "categoryId"),
    // `Number("")` is 0 and `Number("x")` is NaN, and both are refused by the
    // domain by name. Repairing either here would hide the bug rather than the
    // typo, the way `isCurrencyCode` refuses to repair "ars".
    amount: Number(answer(form, "amount")),
    occurredOn: answer(form, "occurredOn"),
    // The picker's "me" is an empty value, which is the Member recording it
    // and not an identifier nobody has.
    attributedTo: answer(form, "attributedTo") || null,
  });

  report("Recording a Movement", outcome);

  if (outcome.kind === "recorded") {
    // Outside the handler's try on purpose: redirect works by throwing, so
    // catching around it would swallow the navigation.
    //
    // To the month the expense actually landed in, and not to whichever month
    // the server happens to be in. They differ: the day was pre-filled from
    // the browser's clock, so at ten at night on the 30th in Buenos Aires the
    // expense is dated last month and the server is already in this one. A
    // bare redirect would land on a list that does not contain it.
    redirect(monthsList(spaceId, monthOf(outcome.movement.occurredOn)));
  }

  return { error: refusalMessage(outcome) };
}

export async function amendMovementAction(
  _previous: MovementFormState,
  form: FormData,
): Promise<MovementFormState> {
  const spaceId = answer(form, "spaceId");

  const outcome = await handleAmendMovement(
    await ports(),
    spaceId,
    answer(form, "movementId"),
    {
      categoryId: answer(form, "categoryId"),
      amount: Number(answer(form, "amount")),
      occurredOn: answer(form, "occurredOn"),
      attributedTo: answer(form, "attributedTo"),
    },
  );

  report("Correcting a Movement", outcome);

  if (outcome.kind === "recorded") {
    // The corrected day, which a correction is free to have moved.
    redirect(monthsList(spaceId, monthOf(outcome.movement.occurredOn)));
  }

  return { error: refusalMessage(outcome) };
}

export async function strikeMovementAction(
  _previous: MovementFormState,
  form: FormData,
): Promise<MovementFormState> {
  const spaceId = answer(form, "spaceId");

  const outcome = await handleStrikeMovement(
    await ports(),
    spaceId,
    answer(form, "movementId"),
  );

  report("Striking a Movement out", outcome);

  if (outcome.kind === "struck") {
    // The Movement is gone, so it cannot say which month it was in. The form
    // carried it, which is why `StrikeMovement` takes one.
    redirect(monthsList(spaceId, monthInView(answer(form, "mes"))));
  }

  return { error: refusalMessage(outcome) };
}

/**
 * What the server is told when something went wrong that is nobody's typo.
 *
 * The person gets `refusalMessage`, which says nothing about the cause: a
 * dropped connection reported as "the amount is wrong" sends them to correct a
 * field that was never the problem. Written once because three copies of it is
 * three places for one to stop logging.
 */
function report(what: string, outcome: { kind: string; cause?: unknown }): void {
  if (outcome.kind === "failed") {
    console.error(`${what} failed.`, outcome.cause);
  }
}

/** The month's list, said in one place so three redirects cannot drift. */
function monthsList(spaceId: string, month: string): string {
  return `/espacios/${spaceId}/movimientos?mes=${month}`;
}
