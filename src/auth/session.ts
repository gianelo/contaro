/**
 * The Member a session claims to belong to, or no session at all.
 *
 * Every seam that needs to know who is asking takes one of these rather than
 * calling `auth()` itself, which is what lets those seams be driven by tests
 * with no server and no Google account. Kept apart from `./index.ts` so
 * importing the type does not drag Auth.js in with it.
 */
export type ReadSession = () => Promise<{ memberId: string } | null>;
