"use client";

import { useActionState, useState } from "react";
import { t } from "@/i18n";
import { Button } from "@/ui/button";
import { BottomSheet } from "@/ui/bottom-sheet";
import { Notice } from "@/ui/notice";
import { nothingWrongYet } from "../record";
import { strikeMovementAction } from "../actions";
import styles from "./strike.module.css";

/**
 * Striking a Movement out, behind a confirmation.
 *
 * It confirms because it destroys something: the expense stops counting
 * towards the month, and every figure that included it changes underneath a
 * person who only meant to scroll (#1: actions that destroy data confirm
 * first). The sheet says what will happen and that it will be written down
 * whose doing it was, because in a shared Space the other Member is owed that.
 */
export function StrikeMovement({
  spaceId,
  movementId,
  month,
}: {
  spaceId: string;
  movementId: string;
  /** Where to land afterwards: the list this Movement was opened from. */
  month: string;
}) {
  const [asking, setAsking] = useState(false);
  const [state, send, pending] = useActionState(
    strikeMovementAction,
    nothingWrongYet,
  );

  return (
    <div className={styles.strike}>
      <Button variant="destructive" onClick={() => setAsking(true)}>
        {t("movements.strike")}
      </Button>

      {state.error ? (
        <p role="alert" className={styles.error}>
          {state.error}
        </p>
      ) : null}

      <BottomSheet
        open={asking}
        title={t("movements.strike.title")}
        onClose={() => setAsking(false)}
        actions={
          <form action={send} className={styles.confirm}>
            <input type="hidden" name="spaceId" value={spaceId} />
            <input type="hidden" name="movementId" value={movementId} />
            <input type="hidden" name="mes" value={month} />
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending
                ? t("movements.strike.working")
                : t("movements.strike.confirm")}
            </Button>
            <Button variant="plain" onClick={() => setAsking(false)}>
              {t("action.cancel")}
            </Button>
          </form>
        }
      >
        <Notice variant="warning">{t("movements.strike.body")}</Notice>
      </BottomSheet>
    </div>
  );
}
