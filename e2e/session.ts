import { encode } from "next-auth/jwt";
import type { BrowserContext } from "@playwright/test";
import { createDatabase, databaseUrl } from "../src/db/connection";
import { memberFromGoogle } from "../src/db/members";
import { createSpaceForMember } from "../src/db/spaces";
import { authSecret } from "./secret";

/**
 * A Google handshake cannot happen in a test, so the run mints the session
 * that a handshake would have produced. Everything downstream of the token —
 * the proxy, the pages, sign-out — is then the real thing.
 */
const SESSION_COOKIE = "authjs.session-token";

export const signedInMember = {
  id: "3f2b0c1e-0000-4000-8000-000000000001",
  name: "Ana Gómez",
  email: "ana@example.com",
};

export async function startSession(
  context: BrowserContext,
  baseURL: string,
  member = signedInMember,
) {
  const token = await encode({
    // Auth.js derives the encryption key from the secret and the cookie name.
    salt: SESSION_COOKIE,
    secret: authSecret,
    token: {
      sub: member.id,
      memberId: member.id,
      name: member.name,
      email: member.email,
    },
  });

  await context.addCookies([
    { name: SESSION_COOKIE, value: token, url: baseURL },
  ]);
}

/**
 * Puts a real Member in the database, the way a first Google sign-in would.
 * The API seam reads the database, so proving a session resolves to its Member
 * needs one that actually exists.
 */
export async function createMember(name: string) {
  const { db, sql } = createDatabase(databaseUrl(), { max: 1 });
  // The database outlives a run, so the account has to be new every time --
  // the address as much as the subject. #9 made that matter: an Invitation is
  // addressed to a mailbox, so two runs' worth of "Uli" sharing one address
  // means the second run reads the first run's invitations as its own.
  const account = `e2e-${process.pid}-${Date.now()}-${nextAccount++}`;
  try {
    return await memberFromGoogle(db, {
      subject: account,
      email: `${account}@example.com`,
      name,
    });
  } finally {
    await sql.end();
  }
}

let nextAccount = 0;

/**
 * A second Member inside a Space, written straight into the table.
 *
 * #9's Invitation is how this really happens, and `invitations.spec.ts` drives
 * that whole path through the product. This stays as the shortcut for the
 * specs that need a shared Space to already exist and are about something
 * else: spending two sessions and four page loads to arrive at a fixture is
 * time paid on every run to prove something another spec already proves.
 */
export async function joinSpace(spaceId: string, memberId: string) {
  const { sql } = createDatabase(databaseUrl(), { max: 1 });
  try {
    await sql`
      INSERT INTO space_members (space_id, member_id) VALUES (${spaceId}, ${memberId})
    `;
  } finally {
    await sql.end();
  }
}

/**
 * A Space belonging to a Member, made the way the product makes one. Building
 * a list of Spaces through the form would spend a page load per row to prove
 * something #4 already proves; these specs are about the list itself.
 */
export async function createSpaceFor(
  memberId: string,
  name: string,
  currency: string,
) {
  const { db, sql } = createDatabase(databaseUrl(), { max: 1 });
  try {
    return await createSpaceForMember(db, memberId, { name, currency });
  } finally {
    await sql.end();
  }
}
