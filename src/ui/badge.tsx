import type { ReactNode } from "react";
import styles from "./badge.module.css";
import { cx } from "./cx";

/**
 * Which of two things the badge is about: something that has happened, or
 * something still to.
 *
 * Named for what it means and not for its colour, the way `ButtonVariant` is:
 * a variant called "green" is a variant that cannot be restyled, and one
 * called "accent" survives a palette that changes its mind at night.
 */
export type BadgeVariant = "accent" | "muted";

export type BadgeProps = {
  variant: BadgeVariant;
  /** The words. Never empty: the colour is not allowed to be the whole state. */
  children: ReactNode;
};

/**
 * A small word at the end of a row, saying what state that row is in.
 *
 * The words are required rather than optional, and that is the component
 * rather than a caller's manners: #13 asks that a Fixed item say whether it is
 * pending or paid, and a badge that could be drawn empty is a badge that says
 * it in colour alone -- to nobody who cannot tell the two grounds apart.
 */
export function Badge({ variant, children }: BadgeProps) {
  return <span className={cx(styles.badge, styles[variant])}>{children}</span>;
}
