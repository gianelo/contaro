/**
 * The letter a name is drawn as.
 *
 * `Array.from` and not `name[0]`: a name beginning outside the basic plane is
 * two code units, and half of one is not a letter. Uppercased with the locale's
 * rules so an accent survives — "Ángela" starts with an Á, and drawing her as
 * an A is drawing somebody else.
 *
 * A name that is only spaces has no letter, and this returns none rather than
 * inventing one. It is a row that went wrong upstream; an empty circle says so
 * honestly, and the full name is still on the avatar for anyone listening.
 *
 * On its own and not inside `avatar.tsx`, for the reason `memberColour` is on
 * its own: two different circles are drawn with it now — a Member's, and the
 * one a Category with no icon wears — and a module that only needs the letter
 * should not have to pull a component and a stylesheet in to get it.
 */
export function initialOf(name: string): string {
  return Array.from(name.trim())[0]?.toLocaleUpperCase("es") ?? "";
}
