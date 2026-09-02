import { eq } from "drizzle-orm";
import {
  resolveMember,
  type GoogleIdentity,
  type Member,
} from "@/domain/identity/resolve-member";
import type { Connection } from "./connection";
import { members } from "./schema";

type Database = Connection["db"];

/** Exactly the columns a domain `Member` is made of — `createdAt` is not one. */
const memberColumns = {
  id: members.id,
  googleSubject: members.googleSubject,
  email: members.email,
  name: members.name,
};

/**
 * Turns a verified Google account into the Member it belongs to, creating that
 * Member the first time and keeping the stored profile in step afterwards.
 *
 * The database only fetches and writes; which Member an identity is, and
 * whether the identity is usable at all, is decided by the domain.
 */
export async function memberFromGoogle(
  db: Database,
  identity: GoogleIdentity,
): Promise<Member> {
  const existing = await findByGoogleSubject(db, identity.subject);
  const resolution = resolveMember(identity, existing);

  switch (resolution.kind) {
    case "created": {
      // Two requests can race on a first sign-in and both find nothing. The
      // unique index settles it; whichever loses takes the row that won,
      // rather than failing the sign-in with a constraint violation.
      const [created] = await db
        .insert(members)
        .values(resolution.member)
        .onConflictDoUpdate({
          target: members.googleSubject,
          set: { email: resolution.member.email, name: resolution.member.name },
        })
        .returning(memberColumns);
      if (!created) {
        throw new Error("Inserting the Member returned no row.");
      }
      return created;
    }
    case "refreshed": {
      const [updated] = await db
        .update(members)
        .set({
          email: resolution.member.email,
          name: resolution.member.name,
        })
        .where(eq(members.id, resolution.member.id))
        .returning(memberColumns);
      if (!updated) {
        throw new Error("Updating the Member returned no row.");
      }
      return updated;
    }
    case "unchanged":
      return resolution.member;
  }
}

export async function findMemberById(
  db: Database,
  id: string,
): Promise<Member | null> {
  const [found] = await db
    .select(memberColumns)
    .from(members)
    .where(eq(members.id, id))
    .limit(1);
  return found ?? null;
}

async function findByGoogleSubject(
  db: Database,
  subject: string,
): Promise<Member | null> {
  const [found] = await db
    .select(memberColumns)
    .from(members)
    .where(eq(members.googleSubject, subject))
    .limit(1);
  return found ?? null;
}
