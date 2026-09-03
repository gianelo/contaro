import { test as base } from "@playwright/test";
import { signedInMember, startSession } from "./session";

/**
 * The app is behind a session, so a spec about the app runs signed in as a
 * Member the database does not have. Two kinds of spec import from
 * `@playwright/test` instead: one about signing in itself, and one whose
 * screens read real rows — a Space list, a Space — which needs a session
 * belonging to a Member that really exists.
 */
export const test = base.extend<{ session: void }>({
  session: [
    async ({ context, baseURL }, use) => {
      await startSession(context, baseURL!);
      await use();
    },
    { auto: true },
  ],
});

export { expect, type Page } from "@playwright/test";
export { signedInMember };
