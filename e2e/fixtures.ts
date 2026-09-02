import { test as base } from "@playwright/test";
import { signedInMember, startSession } from "./session";

/**
 * The app is behind a session, so a spec about the app runs signed in. A spec
 * about signing in itself imports from `@playwright/test` instead.
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
