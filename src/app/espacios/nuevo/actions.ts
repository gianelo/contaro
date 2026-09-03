"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { database } from "@/db/client";
import { createSpaceForMember } from "@/db/spaces";
import { answer } from "@/app/form";
import {
  handleCreateSpace,
  refusalMessage,
  type NewSpaceState,
} from "./create";

/**
 * All the behaviour is in `create.ts`, which is driven directly by tests. This
 * only says where a session and a store come from in production, and where a
 * Member goes once their Space exists.
 */
export async function createSpaceAction(
  _previous: NewSpaceState,
  form: FormData,
): Promise<NewSpaceState> {
  const outcome = await handleCreateSpace(
    async () => {
      const session = await auth();
      return session ? { memberId: session.user.id } : null;
    },
    (creatorId, draft) => createSpaceForMember(database(), creatorId, draft),
    { name: answer(form, "name"), currency: answer(form, "currency") },
  );

  if (outcome.kind === "failed") {
    // The person is told something went wrong; the server is told what.
    console.error("Creating a Space failed.", outcome.cause);
  }

  if (outcome.kind === "created") {
    // Outside the handler's try on purpose: redirect works by throwing, so
    // catching around it would swallow the navigation.
    redirect(`/espacios/${outcome.space.id}`);
  }

  return { error: refusalMessage(outcome) };
}
