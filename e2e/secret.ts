/**
 * The secret the e2e run signs its own session cookies with.
 *
 * Shared by `playwright.config.ts`, which hands it to the server it starts,
 * and by `session.ts`, which mints the cookie. It grants nothing: it exists so
 * a run does not depend on a developer's `.env.local`, and never leaves
 * localhost.
 */
export const authSecret =
  process.env.AUTH_SECRET ?? "playwright-e2e-only-not-a-real-secret";
