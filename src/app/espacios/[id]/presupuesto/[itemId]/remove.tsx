"use client";

import { useActionState } from "react";
import { t } from "@/i18n";
import { Button } from "@/ui/button";
import { nothingWrongYet } from "../plan";
import { removeBudgetItemAction } from "../actions";
import styles from "./remove.module.css";

/**
 * Taking an item off the plan.
 *
 * No confirmation, unlike striking a Movement out. That one destroys a record
 * of money that moved: every figure that included it changes, and in a shared
 * Space the other Member is owed a note of whose doing it was. This removes a
 * line from a plan — nothing moved, nothing downstream was measured against
 * it, and the way back is to plan it again in two taps. A sheet in front of
 * that is a sheet a person learns to dismiss without reading, which is how a
 * confirmation stops protecting the one that matters.
 */
export function RemoveBudgetItem({
  spaceId,
  itemId,
  month,
}: {
  spaceId: string;
  itemId: string;
  /** Where to land afterwards: the plan this item was opened from. */
  month: string;
}) {
  const [state, send, pending] = useActionState(
    removeBudgetItemAction,
    nothingWrongYet,
  );

  return (
    <div className={styles.remove}>
      {state.error ? (
        <p role="alert" className={styles.error}>
          {state.error}
        </p>
      ) : null}

      <form action={send}>
        <input type="hidden" name="spaceId" value={spaceId} />
        <input type="hidden" name="itemId" value={itemId} />
        <input type="hidden" name="mes" value={month} />
        <Button type="submit" variant="destructive" disabled={pending}>
          {pending ? t("budget.item.remove.working") : t("budget.item.remove")}
        </Button>
      </form>
    </div>
  );
}
