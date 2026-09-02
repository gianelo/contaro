"use client";

import { useEffect, useId, type ReactNode } from "react";
import styles from "./bottom-sheet.module.css";
import { cx } from "./cx";
import { hitTarget } from "./hit-target";
import { t } from "@/i18n";

export type BottomSheetProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  /** Buttons pinned to the bottom of the sheet. */
  actions?: ReactNode;
  children: ReactNode;
};

/** The sheet the mockups use for confirmations and pickers. */
export function BottomSheet({
  open,
  title,
  onClose,
  actions,
  children,
}: BottomSheetProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label={t("action.dismiss")}
        data-testid="bottom-sheet-scrim"
        className={cx(hitTarget, styles.scrim)}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={styles.sheet}
      >
        <span className={styles.grabber} aria-hidden="true" />
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        <div className={styles.body}>{children}</div>
        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </div>
    </>
  );
}
