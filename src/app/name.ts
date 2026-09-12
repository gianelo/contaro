/**
 * The name somebody is called by, out of the name they signed in with.
 *
 * Google hands back a whole name and nobody is greeted with all of it: "Hola,
 * Gian Solo Barboza" is a form letter. The first word is what a person is
 * called, and where there is only one word it is already the answer.
 *
 * Here rather than beside the greeting that used to own it, because the header
 * now says the same name on every screen inside a Space (ADR-0059). Two copies
 * of this would be one person called two things on two screens of one app --
 * and the header would be the copy that got it wrong, being the newer one.
 */
export function firstNameOf(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}
