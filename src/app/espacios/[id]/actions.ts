"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { database } from "@/db/client";
import { budgetItemsInMonth } from "@/db/budget-items";
import { closeMonthInSpace } from "@/db/closed-months";
import { approveCarryOverInSpace, movementsInMonth } from "@/db/movements";
import { findSpaceForMember } from "@/db/spaces";
import { monthAgainstPlan } from "@/domain/budget/budget";
import { isMonth, nextMonth } from "@/domain/calendar/month";
import { answer } from "@/app/form";
import { todayFor } from "@/app/reader";
import { report } from "@/app/report";
import {
  carryRefusalMessage,
  handleApproveCarryOver,
  type CarryFormState,
  type CarryPorts,
} from "./carry";
import {
  closeRefusalMessage,
  handleCloseMonth,
  type CloseFormState,
  type ClosePorts,
} from "./close";

/**
 * The Space's own actions: the monthly close (#117) and, since #120, approving
 * the Carry-over.
 *
 * All the behaviour is in `close.ts` and `carry.ts`, which are driven directly
 * by tests. This only says where a session, a Space and a store come from in
 * production, and where a Member goes once the act has happened.
 *
 * At this level and not under `presupuesto/`, because neither act is the plan's.
 * The close freezes a month's Movements as much as its plan; the carry-over
 * reads a plan and writes a Movement. The screen that offers both is the
 * Budget's, which is a fact about where a thumb is and not about what the acts
 * belong to.
 */
async function ports(): Promise<ClosePorts> {
  const asked = await headers();

  return {
    readSession: async () => {
      const session = await auth();
      return session ? { memberId: session.user.id } : null;
    },
    findSpace: (id, memberId) => findSpaceForMember(database(), id, memberId),
    // The Reader's own day (ADR-0018). Of everything in the product that reads
    // a clock, this is the one that cannot be corrected by the next request: at
    // nine at night on the 30th in Bogota the server is already in October, and
    // a close decided on its answer would permanently freeze a month that, for
    // the person tapping, is still running.
    today: () => todayFor(asked),
    close: (closing, month) => closeMonthInSpace(database(), closing, month),
  };
}

/**
 * The month is closed, and nothing in it changes again (ADR-0002).
 *
 * The month comes off the form and is checked here rather than falling back to
 * the one being lived in, the way every other month in this app does. The
 * difference is that there is no undo: `monthInView` answers "which screen is
 * this" and defaulting is the right answer to that question, but defaulting
 * *this* one would permanently freeze whichever month a broken form happened to
 * land on. A form that carried no month is a screen that is wrong, and the
 * honest answer is to close nothing.
 */
export async function closeMonthAction(
  _previous: CloseFormState,
  form: FormData,
): Promise<CloseFormState> {
  const spaceId = answer(form, "spaceId");
  const asked = answer(form, "mes");

  // A month no calendar has, which is a broken screen rather than a mistyped
  // answer -- nobody types this field. It gets its own refusal rather than
  // "that month has not ended", which would send somebody to wait for
  // something that will never fix it, and rather than a failure, which invites
  // the one retry that cannot help.
  if (!isMonth(asked)) {
    return { error: closeRefusalMessage({ kind: "no-such-month" }) };
  }

  const outcome = await handleCloseMonth(await ports(), spaceId, asked);

  report("Closing a month", outcome);

  // Back to the month that was just closed, and not to the one being lived in.
  // What a person wants to see after closing September is September, now
  // showing what it finally came to.
  if (outcome.kind === "closed") {
    redirect(`/espacios/${spaceId}?mes=${outcome.closed.month}`);
  }

  return { error: closeRefusalMessage(outcome) };
}

/**
 * The same wiring for the second of the creator's two acts (ADR-0051).
 *
 * Its own `ports` and not a field added to the close's, because they are two
 * acts with two different sets of rows behind them and one object holding both
 * would be handed whole to each -- a handler that can close a month sitting
 * inside the one that approves money.
 */
async function carryPorts(): Promise<CarryPorts> {
  const asked = await headers();

  return {
    readSession: async () => {
      const session = await auth();
      return session ? { memberId: session.user.id } : null;
    },
    findSpace: (id, memberId) => findSpaceForMember(database(), id, memberId),
    today: () => todayFor(asked),
    // The month re-measured out of its own rows, by the same function the
    // summary card of that month is drawn from. The figure the card showed is
    // never trusted: a form that carried the amount would be a form that could
    // carry any amount, into a ledger.
    standing: async (space, month) => {
      const db = database();
      const [planned, spending] = await Promise.all([
        budgetItemsInMonth(db, space, month),
        movementsInMonth(db, space, month),
      ]);

      return monthAgainstPlan(planned, spending, space.currency);
    },
    approve: (approved, space) =>
      approveCarryOverInSpace(database(), approved, space),
  };
}

/**
 * A month's surplus approved: one income in the following month, attributed to
 * no Member (ADR-0003).
 *
 * The month on the form is the month the money comes *out of*, which is the one
 * the card named. It is checked here rather than defaulted, for the reason the
 * close's is: this write puts money in a ledger, and a form that lost its month
 * would carry a surplus out of whichever month a broken screen landed on.
 */
export async function approveCarryOverAction(
  _previous: CarryFormState,
  form: FormData,
): Promise<CarryFormState> {
  const spaceId = answer(form, "spaceId");
  const asked = answer(form, "mes");

  if (!isMonth(asked)) {
    return { error: carryRefusalMessage({ kind: "no-such-month" }) };
  }

  const outcome = await handleApproveCarryOver(await carryPorts(), spaceId, asked);

  report("Approving a carry-over", outcome);

  // Onto the month the money landed in, which is where a person can now see it
  // -- and which is the month they were already standing on when they tapped.
  // Named from the form's month rather than from the Movement's day, so the
  // redirect says the same thing the card did.
  if (outcome.kind === "carried") {
    redirect(`/espacios/${spaceId}?mes=${nextMonth(asked)}`);
  }

  return { error: carryRefusalMessage(outcome) };
}
