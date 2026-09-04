"use server";

import { headers } from "next/headers";
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
import { todayFor } from "@/app/reader";
import { report } from "@/app/report";
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
    // Passed through raw, the way the day and the amount are: which way the
    // money went is a claim the form makes, and `recordMovement` is where a
    // claim becomes a fact. Repairing a missing one into "expense" here would
    // file somebody's salary as a purchase and say nothing about it.
    direction: answer(form, "direction"),
    // Absent from the form when the money is coming in, and null is what the
    // domain requires income to carry.
    categoryId: answer(form, "categoryId") || null,
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
    // is being lived in. This was written to work around the server and the
    // browser disagreeing about the date, and ADR-0018 has since closed that
    // gap -- but it survives it, because the two are not the same rule. A
    // Movement dated three months back should be read where it belongs, and a
    // redirect to "this month" would land on a list that does not contain it.
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
      categoryId: answer(form, "categoryId") || null,
      amount: Number(answer(form, "amount")),
      occurredOn: answer(form, "occurredOn"),
      attributedTo: answer(form, "attributedTo"),
      // Read and not ignored, so the rule that refuses it is reachable from
      // the screen and not only from a test. The correction screen carries it
      // back unchanged, so the ordinary correction passes; a form that carried
      // the other one is refused by `DirectionIsImmutableError` rather than
      // quietly saving the four answers it did understand.
      direction: answer(form, "direction"),
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
    // carried it, which is why `StrikeMovement` takes one. The Reader's day is
    // what the fallback lands on for a form that somehow carried no month, and
    // it is the same month their list is already open on (ADR-0018).
    redirect(
      monthsList(
        spaceId,
        monthInView(answer(form, "mes"), todayFor(await headers())),
      ),
    );
  }

  return { error: refusalMessage(outcome) };
}


/** The month's list, said in one place so three redirects cannot drift. */
function monthsList(spaceId: string, month: string): string {
  return `/espacios/${spaceId}/movimientos?mes=${month}`;
}
