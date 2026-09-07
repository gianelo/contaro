import type { ReactNode } from "react";
import Link from "next/link";
import { cx } from "./cx";
import { hitTarget } from "./hit-target";
import styles from "./entry-head.module.css";

export type EntryHeadProps = {
  /** Where the way out goes: the screen this was opened from. */
  back: string;
  /** What the way out is called, so this component picks no copy of its own. */
  cancel: string;
  /** What the screen calls itself, as its one heading. */
  title: string;
  /**
   * The one line of context the screen needs under its title, where it needs
   * one at all. A slot and not a string: what belongs there is the screen's
   * question, and no two screens have answered it the same way.
   */
  beneath?: ReactNode;
};

/**
 * The head of a screen that is doing one thing.
 *
 * Cancelar sits here rather than at the foot of the page, which is where both
 * entry screens had it: a person who changes their mind is at the top of the
 * screen or at the keypad, and neither is a scroll away from here (ADR-0028).
 *
 * It is what a screen wears instead of the shell. `SpaceScreen` is the head
 * every other screen inside a Space has -- the Space named, the account row,
 * the tab bar -- and an entry screen carries none of them, because a bar
 * offering three other places is three ways to lose what has been typed. Two
 * screens now make that trade, so the head they make it with lives here rather
 * than twice: the centring below is the part a copy would get subtly wrong.
 */
export function EntryHead({ back, cancel, title, beneath }: EntryHeadProps) {
  return (
    <div className={styles.head}>
      <div className={styles.bar}>
        <Link href={back} className={cx(hitTarget, styles.cancel)}>
          {cancel}
        </Link>

        <h1 className={styles.title}>{title}</h1>

        {/*
          The same word again, invisible and unreachable: it is what makes the
          title centred on the screen rather than centred in what is left over
          beside Cancelar. A width would have to be guessed and would be wrong
          in another language.
        */}
        <span aria-hidden="true" className={styles.mirror}>
          {cancel}
        </span>
      </div>

      {beneath}
    </div>
  );
}
