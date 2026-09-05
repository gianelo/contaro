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
   * Given a destination, the row becomes a link and takes a touch target. A
   * row that goes somewhere is a link and not a button for the reason
   * `ButtonLink` is one: it opens in a new tab, and it works before any
   * JavaScript has loaded.
   */
  href?: string;
  /** Given a handler, the row becomes a button and takes a touch target. */
  onClick?: () => void;
  children: ReactNode;
};

export function GroupedListItem({
  leading,
  trailing,
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
        <Link href={href} className={actionable}>
          {inner}
        </Link>
      ) : onClick ? (
        <button type="button" onClick={onClick} className={actionable}>
          {inner}
        </button>
      ) : (
        <div className={styles.row}>{inner}</div>
      )}
    </li>
  );
}
