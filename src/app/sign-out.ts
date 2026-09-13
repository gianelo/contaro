"use server";

import { signOut } from "@/auth";

/**
 * Ending the session, as something a client component can be handed.
 *
 * Its own module because the control that calls it is a client component now:
 * the way out lives inside a menu behind a sheet (ADR-0059), and the inline
 * `"use server"` the old account row used only works inside a server
 * component. What it does is unchanged, landing included -- a Member who signs
 * out is put back on the screen that signs them in, and not on a Space they no
 * longer have a session for.
 */
export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/ingresar" });
}
