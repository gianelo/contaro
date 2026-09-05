import styles from "./avatar.module.css";
import { initialOf } from "./initial";
import { cx } from "./cx";

/**
 * The three sizes a person is drawn at: alone at the top of a screen, stacked
 * against whoever else is in the Space, or beside an amount on a row.
 *
 * Named for where they are used rather than for their pixels, so the day the
 * canvas redraws a 28px circle at 26 this stays the same three words.
 */
export type AvatarSize = "lg" | "sm" | "xs";

export type AvatarProps = {
  /** Whose circle this is. Drawn as one letter, said in full. */
  name: string;
  /** The class carrying their ink and ground, from `memberColour`. */
  colour: string;
  size?: AvatarSize;
  /**
   * The ring that lifts this circle off the one behind it, in a stack. Off on
   * a circle standing alone: a ring around nothing is a hairline nobody meant.
   */
  ringed?: boolean;
};

/**
 * The colour the Reader wears where there is no Space to seat them in.
 *
 * Here and not in `member-colour.ts`, because it is not a seat: that module
 * answers "which of this Space's two Members is this", and a screen with no
 * Space has no such question. Keeping it there meant `memberColour`'s own
 * guarantee had an exception living next to it.
 */
export const readerColour: string = styles.reader;

/**
 * A person, as one coloured circle.
 *
 * A labelled image and not a decorative letter, and that is the whole point of
 * it: on the Space list these circles are the *only* thing that says who is in
 * a Space (#38 replaced the row of names the canvas has no room for). A letter
 * left unlabelled would tell a screen reader "G, A", which is nothing.
 *
 * The colour arrives already decided rather than being worked out here. Which
 * of two seats a Member holds is the Space's answer and not a drawing
 * question — see `memberColour` and ADR-0020 — and a component that took a
 * member id would need to be handed the whole Space to answer it.
 */
export function Avatar({ name, colour, size = "lg", ringed }: AvatarProps) {
  return (
    <span
      role="img"
      aria-label={name}
      className={cx(styles.avatar, styles[size], ringed && styles.ringed, colour)}
    >
      {initialOf(name)}
    </span>
  );
}
