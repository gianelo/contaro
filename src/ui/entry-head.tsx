import type { AriaRole, ReactNode } from "react";
import Link from "next/link";
import { cx } from "./cx";
import { hitTarget } from "./hit-target";
import { Icon, type IconName } from "./icon";
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
  /**
   * What stands where an invisible copy of `cancel` stands by default,
   * balancing the row so the title centres against something of about the
   * same weight rather than against nothing.
   *
   * Optional and additive, and every screen that does not pass it gets the
   * mirror exactly as before -- three do (#105). The fourth is the screen
   * that corrects a plan item, which puts a real control there instead of
   * spending the room on a control nobody can reach: taking the item off the
   * plan altogether, moved here from the foot of the form because CI proved
   * there was no other place left to put it (#105, ADR-0047 amended).
   */
  trailing?: ReactNode;
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
export function EntryHead({
  back,
  cancel,
  title,
  beneath,
  trailing,
}: EntryHeadProps) {
  return (
    <div className={styles.head}>
      <div className={styles.bar}>
        <Link href={back} className={cx(hitTarget, styles.cancel)}>
          {cancel}
        </Link>

        <h1 className={styles.title}>{title}</h1>

        {trailing ?? (
          /*
            The same word again, invisible and unreachable: it is what makes
            the title centred on the screen rather than centred in what is
            left over beside Cancelar. A width would have to be guessed and
            would be wrong in another language.
          */
          <span aria-hidden="true" className={styles.mirror}>
            {cancel}
          </span>
        )}
      </div>

      {beneath}
    </div>
  );
}

/** What the canvas draws the pill's icon at. */
const PILL_ICON = 13;

export type EntryPillProps = {
  /** The shape beside the words, which say what it is. */
  icon: IconName;
  /**
   * What this line is to a screen reader, where it is more than the words.
   * The screen decides, because the pill is the shape two screens share and
   * not the thing they are: one is a note about the Movement being corrected
   * and the other is context about the Space being spent from.
   *
   * Typed as React's own `AriaRole` and not a `string`, which would take
   * "nte" as readily as "note" -- everywhere else in `src/` a role is a
   * literal, and the type is what keeps this one as honest as those.
   */
  role?: AriaRole;
  children: ReactNode;
};

/**
 * The one quiet line an entry screen puts under its title.
 *
 * Two screens now say something there -- which Space an expense is about to be
 * attributed in, and who typed in the Movement being corrected -- and the pill
 * is the part that had to not be copied. What it says, which shape it says it
 * with and whether it is said at all are each screen's own argument, which is
 * why they are handed in rather than picked here (ADR-0046).
 */
export function EntryPill({ icon, role, children }: EntryPillProps) {
  return (
    <p role={role} className={styles.pill}>
      <Icon name={icon} size={PILL_ICON} />
      {/*
        A span rather than the words loose in the pill, because `text-overflow`
        has nothing to act on in a flex container: the line has to be an
        element before it can be the thing that gives (ADR-0036, ADR-0047).
      */}
      <span className={styles.words}>{children}</span>
    </p>
  );
}
