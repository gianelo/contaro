import type { ReactNode } from "react";
import styles from "./notice.module.css";
import { cx } from "./cx";

export type NoticeVariant = "info" | "warning";

/**
 * A standing statement about the screen it is on: not an error, not a thing
 * that happened, but something true whatever the person does next — "this
 * cannot be undone", "the currency can never change".
 *
 * A warning is the stronger of the two and is for a consequence that cannot be
 * taken back.
 */
export function Notice({
  variant = "info",
  children,
}: {
  variant?: NoticeVariant;
  children: ReactNode;
}) {
  return (
    <p role="note" className={cx(styles.notice, styles[variant])}>
      {children}
    </p>
  );
}
