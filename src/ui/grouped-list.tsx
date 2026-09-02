"use client";

import { useId, type ReactNode } from "react";
import styles from "./grouped-list.module.css";
import { cx } from "./cx";
import { hitTarget } from "./hit-target";

export type GroupedListProps = {
  /** The heading above the group, e.g. "HOY". Also names the group for a11y. */
  label: string;
  children: ReactNode;
};

/** The iOS-style grouped list the mockups are built from. */
export function GroupedList({ label, children }: GroupedListProps) {
  const labelId = useId();

  return (
    <div className={styles.group} role="group" aria-labelledby={labelId}>
      <h2 id={labelId} className={styles.label}>
        {label}
      </h2>
      <ul className={styles.list}>{children}</ul>
    </div>
  );
}

export type GroupedListItemProps = {
  leading?: ReactNode;
  trailing?: ReactNode;
  /** Given a handler, the row becomes a button and takes a touch target. */
  onClick?: () => void;
  children: ReactNode;
};

export function GroupedListItem({
  leading,
  trailing,
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

  return (
    <li className={styles.item}>
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          className={cx(hitTarget, styles.row, styles.actionable)}
        >
          {inner}
        </button>
      ) : (
        <div className={styles.row}>{inner}</div>
      )}
    </li>
  );
}
