import type { IconName } from "./icon";
import { initialOf } from "./initial";

/**
 * The two tints a mark's circle comes in.
 *
 * Named for their hue, which every other token in this product refuses to do —
 * and that refusal is right everywhere else, because every other token has a
 * job. These do not rank, classify or warn: `design/Movimientos.dc.html` draws
 * three circles across five rows and reuses them, which tells one row from the
 * next at a glance. A job-sounding name on that (`--color-category-important`)
 * would be a promise the screen never keeps.
 */
export type CategoryTint = "green" | "grey";

/**
 * What is drawn inside the circle at the start of a row: an icon, or a letter.
 *
 * Two kinds and not an optional icon, because the letter is not the absence of
 * a mark — it is the other half of it, and the common half at that. Which half
 * a Category gets is decided in `@/i18n/category`, beside the name; this module
 * owns only the shape of the answer, the way `Avatar` owns the circle and
 * `memberColour` decides which colour goes in it.
 */
export type CategoryMark =
  | {
      readonly kind: "icon";
      readonly name: IconName;
      readonly tint: CategoryTint;
    }
  | { readonly kind: "letter"; readonly letter: string; readonly tint: CategoryTint };

/** A mark that is one of the drawings the canvas made. */
export function iconMark(name: IconName, tint: CategoryTint): CategoryMark {
  return { kind: "icon", name, tint };
}

/**
 * A mark that is the Category's own first letter, drawn with `initialOf` — the
 * same function the avatars use, so the product cannot end up with two answers
 * about what the first letter of a word is.
 *
 * A name with no letter in it draws an empty circle rather than inventing one.
 * That is the honest picture for a row whose Category a migration retired: its
 * name is already showing an identifier nobody can read, and the first
 * character of a uuid in a circle beside it would be a second unreadable thing
 * rather than a mark.
 */
export function letterMark(name: string): CategoryMark {
  return { kind: "letter", letter: initialOf(name), tint: "grey" };
}
