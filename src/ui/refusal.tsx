import type { ReactNode } from "react";
import styles from "./refusal.module.css";

export type RefusalProps = {
  /** What has happened, in a few words: "Este mes está cerrado". */
  title: string;
  /** Why that leaves nothing to fill in, in a sentence. */
  body: string;
  /**
   * The way out, where the refusal has one.
   *
   * Absent and not empty on the refusals that have none. A closed month is the
   * one act in the product with no undo (ADR-0002), and a control offering to
   * try would be the unlock that has never existed — where a paid item's
   * refusal is undone by striking the Movement that paid it, and is owed the
   * link to it (ADR-0034).
   */
  children?: ReactNode;
};

/**
 * What a screen has instead of the form it would otherwise show: why there is
 * nothing to fill in, and the one thing that undoes it where anything does.
 *
 * Beside `Notice` and not a variant of it. A notice is a standing statement
 * about a screen that still works — "the currency can never change" — printed
 * in a line above whatever it is about. This one *replaces* a control, carries
 * a heading of its own, and is the only thing in its place, which is why it is
 * a block with a title rather than a paragraph with a stronger ground.
 *
 * Three screens wear it and none of them is the first (#48, #119): a paid
 * Fixed item, an item of a closed month, and a Movement of one. One shape,
 * because a person meeting the second refusal after the first should not have
 * to read a new kind of card to learn the same thing has happened — and one
 * component, because two copies of that shape are two shapes waiting to drift.
 */
export function Refusal({ title, body, children }: RefusalProps) {
  return (
    <div className={styles.refusal}>
      <p className={styles.title}>{title}</p>
      <p className={styles.body}>{body}</p>
      {children}
    </div>
  );
}
