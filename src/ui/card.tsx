import type { ReactNode } from "react";
import styles from "./card.module.css";

/**
 * A raised surface holding a stack of things, centred. The empty state on the
 * home screen and the sign-in screen are both one; they differ in what they
 * put inside it, not in what it is.
 */
export function Card({ children }: { children: ReactNode }) {
  return <section className={styles.card}>{children}</section>;
}
