"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { database } from "@/db/client";
import { closeMonthInSpace } from "@/db/closed-months";
import { findSpaceForMember } from "@/db/spaces";
import { isMonth } from "@/domain/calendar/month";
import { answer } from "@/app/form";
import { todayFor } from "@/app/reader";
import { report } from "@/app/report";
import {
  closeRefusalMessage,
  handleCloseMonth,
  type CloseFormState,
  type ClosePorts,
} from "./close";

/**
 * The Space's own actions: for now, the monthly close (#117).
 *
 * All the behaviour is in `close.ts`, which is driven directly by tests. This
 * only says where a session, a Space and a store come from in production, and
 * where a Member goes once the month is closed.
 *
 * At this level and not under `presupuesto/`, because the close is not the
 * plan's: it freezes a month's Movements as much as its plan. The screen that
 * offers it is the Budget's (#118), which is a fact about where a thumb is and
 * not about what the act belongs to.
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
