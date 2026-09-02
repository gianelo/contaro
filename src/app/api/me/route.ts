import { auth } from "@/auth";
import { database } from "@/db/client";
import { findMemberById } from "@/db/members";
import { handleMeRequest } from "./handler";

/**
 * All the behaviour is in `handler.ts`, which is driven directly by tests.
 * This file only says where a session and a Member come from in production.
 */
export async function GET() {
  return handleMeRequest(
    async () => {
      const session = await auth();
      return session ? { memberId: session.user.id } : null;
    },
    (id) => findMemberById(database(), id),
  );
}
