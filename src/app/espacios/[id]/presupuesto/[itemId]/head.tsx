"use client";

import { useActionState } from "react";
import { t } from "@/i18n";
import { cx } from "@/ui/cx";
import { EntryHead } from "@/ui/entry-head";
import { hitTarget } from "@/ui/hit-target";
import { Icon } from "@/ui/icon";
import { nothingWrongYet } from "../plan";
import { removeBudgetItemAction } from "../actions";
import styles from "./head.module.css";

export type BudgetItemCorrectionHeadProps = {
  /** Where Cancelar goes: the month this item was opened from. */
  back: string;
  /** What the screen calls itself, as its one heading. */
  title: string;
  spaceId: string;
  itemId: string;
  /** Where to land after taking the item off the plan. */
  month: string;
};

/**
 * The head both correction forms wear: Cancelar, the screen's own title, and
 * taking the item off the plan altogether -- carried in the slot that used to
 * hold nothing but an invisible copy of Cancelar (#105, Option C+).
 *
 * `RemoveBudgetItem` used to be its own block at the foot of the page, one
 * `Sacar del plan` gap under `Guardar`. CI measured the Fixed form's document
 * 57px past the fold even after every gap on this route had already given up
 * what it had, with that block the thing still hanging off the bottom
 * (ADR-0047 amended). The head's trailing slot was dead space by
 * construction -- an invisible mirror, present only to centre the title --
 * so putting a real control there costs this screen nothing vertical at all.
 *
 * Only where a form is actually offered: the closed-month and paid-Fixed-item
 * branches call `EntryHead` directly, with no `trailing`, because neither
 * screen offers a way to correct the item and removing it is refused for the
 * same reason (#119, ADR-0034). A destructive control on a screen that is
 * supposed to refuse would be the one thing worse than the fold it fixed.
 *
 * This head owns a mutation, which `MovementCorrectionHead` does not: that one
 * takes props and draws a pill, and nothing it renders can change anything.
 * The divergence is deliberate and it is the action's, not the head's -- the
 * control has to sit in the head because that is where the free slot is, and a
 * `useActionState` cannot be handed down from the server component above. What
 * moved here is `RemoveBudgetItem`'s logic unchanged, not new behaviour, so the
 * head is a mutation-owner only for as long as the control lives in it (#137).
 *
 * The icon and not the words: `Sacar del plan` is still what a screen reader
 * hears, in the `aria-label` the words used to be, but there was no room
 * beside Cancelar to spell it out and no reason to shrink the words instead
 * of drawing the same thing every trash can already draws. #137 is where the
 * removal flow this stands in for eventually goes; this is the bridge and not
 * the destination.
 */
export function BudgetItemCorrectionHead({
  back,
  title,
  spaceId,
  itemId,
  month,
}: BudgetItemCorrectionHeadProps) {
  const [state, send, pending] = useActionState(
    removeBudgetItemAction,
    nothingWrongYet,
  );

  return (
    <EntryHead
      back={back}
      cancel={t("action.cancel")}
      title={title}
      trailing={
        <form action={send} className={styles.form}>
          {/* A claim, not a fact: `handleRemoveBudgetItem` proves membership
              again before anything is written (ADR-0010). */}
          <input type="hidden" name="spaceId" value={spaceId} />
          <input type="hidden" name="itemId" value={itemId} />
          <input type="hidden" name="mes" value={month} />
          <button
            type="submit"
            disabled={pending}
            aria-label={
              pending
                ? t("budget.item.remove.working")
                : t("budget.item.remove")
            }
            className={cx(hitTarget, styles.trailing)}
          >
            <Icon name="trash" />
          </button>
        </form>
      }
      beneath={
        state.error ? (
          <p role="alert" className={styles.error}>
            {state.error}
          </p>
        ) : undefined
      }
    />
  );
}
