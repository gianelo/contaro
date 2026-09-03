/**
 * The secret the e2e run signs its own session cookies with.
 *
 * Shared by `playwright.config.ts`, which hands it to the server it starts,
 * and by `session.ts`, which mints the cookie. It grants nothing: it exists so
 * a run does not depend on a developer's `.env.local`, and never leaves
 * localhost.
 *
 * A constant, and never read from the environment. The config imports this
 * module before it loads `.env.local`, so an environment-derived secret would
 * be the fallback in the process that starts the server and the developer's own
 * secret in the workers that sign the cookies -- two different secrets, and a
 * whole suite failing with "no matching decryption secret".
 */
export const authSecret = "playwright-e2e-only-not-a-real-secret";
