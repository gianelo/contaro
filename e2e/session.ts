import { encode } from "next-auth/jwt";
import type { BrowserContext } from "@playwright/test";
import { createDatabase, databaseUrl } from "../src/db/connection";
import { memberFromGoogle } from "../src/db/members";
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
  try {
    return await memberFromGoogle(db, {
      subject: `e2e-${process.pid}-${Date.now()}-${nextAccount++}`,
      email: `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
      name,
    });
  } finally {
    await sql.end();
  }
}

let nextAccount = 0;
