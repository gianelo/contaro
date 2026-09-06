"use client";

import Link from "next/link";
import { useId, type ReactNode } from "react";
import styles from "./grouped-list.module.css";
import { cx } from "./cx";
import { hitTarget } from "./hit-target";

export type GroupedListProps = {
  /** The heading above the group, e.g. "HOY". Also names the group for a11y. */
  label: string;
  /**
   * Takes the heading off the screen while it still names the group.
   *
   * For the screen that is one list and whose own title already says what the
   * list is: printing the word twice is noise, and dropping the heading
   * altogether leaves a group nobody can name or skip to.
   */
  labelHidden?: boolean;
  children: ReactNode;
};

/** The iOS-style grouped list the mockups are built from. */
export function GroupedList({
  label,
  labelHidden = false,
  children,
}: GroupedListProps) {
  const labelId = useId();

  return (
    <div className={styles.group} role="group" aria-labelledby={labelId}>
      <h2
        id={labelId}
        className={labelHidden ? styles.hiddenLabel : styles.label}
      >
        {label}
      </h2>
      <ul className={styles.list}>{children}</ul>
    </div>
  );
}

export type GroupedListItemProps = {
  /**
   * What stands before the row's text: the circle a Movement's Category wears
   * (#39). Rendered bare and with no class of its own, unlike `trailing`,
   * because whatever is put here is one shape that already knows its own size
   * -- a wrapper would be a second opinion about how wide the start of a row
   * is, and the row's own gap already says.
   */
  leading?: ReactNode;
  trailing?: ReactNode;
  /**
   * The row's right-hand end, next to the row and not inside it: laid out as
   * one column, flush right. A second thing to do to the same line lives here
   * -- marking a Fixed item paid on a row that opens it (#48) -- and so does
   * whatever is drawn above it, such as that item's amount (#59).
   *
   * Outside the link or button rather than in `trailing`, because `trailing`
   * is inside it -- and a button inside a link is not a control a keyboard or
   * a screen reader can reach, whatever it looks like. The row keeps its own
   * whole tap; this takes its own beside it.
   *
   * Whole column and not only its lower half: a column does not straddle the
   * link, so an amount that must sit over a reachable badge comes out here
   * with it. `trailing` stays for the row whose end is one thing on one line.
   */
  beside?: ReactNode;
  /**
   * What tapping that end does, when the end is a control and not a reading.
   *
   * The whole column, never a part of it: a finger needs 44px and the shapes
   * drawn at the end of a row are smaller than that, so the tap is the column
   * or it is undersized. Given here rather than as a button the caller puts
   * inside `beside`, because the column is this component's layout -- a caller
   * that had to be the column would have to redraw it (#59).
   *
   * The label is what tapping does and not what the column says: a screen
   * reader hears "Marcar Arriendo como pagado" while eyes read the amount and
   * the state it is in.
   *
   * One object rather than two props so a label cannot arrive without a
   * handler, or a handler without a name.
   */
  besideAction?: { label: string; onClick: () => void };
  /**
   * Given a destination, the row becomes a link and takes a touch target. A
   * row that goes somewhere is a link and not a button for the reason
   * `ButtonLink` is one: it opens in a new tab, and it works before any
   * JavaScript has loaded.
   */
  href?: string;
  /**
   * Given a handler and no destination, the row becomes a button and takes a
   * touch target.
   *
   * Given one *beside* an `href`, it is what the row also does on its way:
   * the month picker closes its own sheet as a month is chosen, because a
   * client-side navigation leaves the picker mounted and its sheet would
   * otherwise stay open across the screen it just opened.
   */
  onClick?: () => void;
  children: ReactNode;
};

export function GroupedListItem({
  leading,
  trailing,
  beside,
  besideAction,
  href,
  onClick,
  children,
}: GroupedListItemProps) {
  const inner = (
    <>
      {leading}
      <span className={styles.content}>{children}</span>
      {trailing ? <span className={styles.trailing}>{trailing}</span> : null}
    </>
  );

  const actionable = cx(hitTarget, styles.row, styles.actionable);

  return (
    <li className={styles.item}>
      {href !== undefined ? (
        <Link href={href} onClick={onClick} className={actionable}>
          {inner}
        </Link>
      ) : onClick ? (
        <button type="button" onClick={onClick} className={actionable}>
          {inner}
        </button>
      ) : (
        <div className={styles.row}>{inner}</div>
      )}
      {beside === undefined ? null : besideAction === undefined ? (
        <span className={styles.beside}>{beside}</span>
      ) : (
        <button
          type="button"
          className={cx(hitTarget, styles.beside, styles.besideActionable)}
          aria-label={besideAction.label}
          onClick={besideAction.onClick}
        >
          {beside}
        </button>
      )}
    </li>
  );
}
