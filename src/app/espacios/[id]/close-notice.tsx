"use client";

import { useActionState, useState } from "react";
import { BottomSheet } from "@/ui/bottom-sheet";
import { Button } from "@/ui/button";
import { GroupedList, GroupedListItem } from "@/ui/grouped-list";
import { Icon } from "@/ui/icon";
import { Notice } from "@/ui/notice";
import { t } from "@/i18n";
import { closeMonthAction } from "./actions";
import { nothingWrongYet } from "./close";
import type { AnnouncedClose, ClosingTally } from "./waiting";
import styles from "./close-notice.module.css";

/**
 * The lock, at the size and weight the way into the plan draws its plus
 * (`way-in.tsx`): the same drawing beside the same kind of sentence, one card
 * further up. There is no lock in the set, and this is the closest thing the
 * product has to one — the calendar with a day marked on it, which is what a
 * month being finished with actually looks like.
 */
const MARK = 18;
const MARK_WEIGHT = 2.2;

export type CloseNoticeProps = {
  spaceId: string;
  /** The close this Space is waiting on. Never drawn where there is none. */
  waiting: AnnouncedClose;
};

/**
 * The month that ended, said on the Budget screen until somebody closes it —
 * and, exactly once, said by a sheet that opens on its own (#118).
 *
 * **The pair covers each other's failure** (decision 12 of #109). The sheet can
 * be missed at no cost, because this row is still here afterwards; the row
 * never has to interrupt, because the sheet already said it once. The sheet
 * alone would train dismissal by reflex on the one irreversible button in the
 * product. The row alone would never announce that the month ended, and a month
 * ending is news.
 *
 * **It is the first notice at the top of a Space screen.** `dueNotice` is
 * per-row inside `FixedItems` and `Notice` has only ever lived inside forms and
 * sheets, so this is drawn as the screen's own vocabulary instead: a card
 * holding a grouped list, which is what every other section here has been since
 * #63, and what `WayIntoThePlan` is one card below. A component that shouted
 * differently from everything under it would be a fifth kind of surface on a
 * screen that has four.
 *
 * **It states or it offers, never both.** The invited Member gets one row and
 * no tap (decision 14, ADR-0051). That is the first capability asymmetry in the
 * product: every existing one — the "Activo" badge, the greeting, the paid-item
 * recap — says *this one is you*, and none has ever had to say *this one is not
 * yours to do*. It is said by naming who it is waiting on rather than by
 * greying out a button, because a disabled control is a thing a person keeps
 * pressing to find out why.
 */
export function CloseNotice({ spaceId, waiting }: CloseNoticeProps) {
  /*
   * The one sheet in the product that opens without being asked, and the server
   * is what decides it does. `useState`'s initial value and not an effect: an
   * effect would open it a frame after the screen painted, which reads as the
   * app interrupting somebody who had already started looking. Whether this
   * render is the first since the month ended is a question about a row, and it
   * has been answered before any of this is sent (`firstOpeningSince`).
   */
  const [asking, setAsking] = useState(waiting.announces);
  const [state, send, pending] = useActionState(
    closeMonthAction,
    nothingWrongYet,
  );

  const mine = waiting.waitingOn === null;

  return (
    <div className={styles.card}>
      <GroupedList label={t("close.waiting.title")} labelHidden>
        <GroupedListItem>
          <span className={styles.sentence}>
            {mine
              ? t("close.waiting.mine", { month: waiting.name })
              : t("close.waiting.theirs", {
                  month: waiting.name,
                  member: waiting.waitingOn ?? "",
                })}
          </span>
        </GroupedListItem>

        {/*
          A button and not a link, for the reason the copy offer one card below
          is one: this row goes nowhere. It opens a confirmation over the screen
          somebody is already on, and the act behind it is the one act in
          contaro that nothing undoes.

          Drawn only for the creator. Not disabled for the other Member —
          disabled is a control that answers "why not" with nothing, and the
          sentence above already answered it by name.
        */}
        {mine ? (
          <GroupedListItem
            leading={
              <span className={styles.mark}>
                <Icon
                  name="calendar-day"
                  size={MARK}
                  weight={MARK_WEIGHT}
                />
              </span>
            }
            onClick={() => setAsking(true)}
          >
            <span className={styles.word}>
              {t("close.waiting.act", { month: waiting.name })}
            </span>
          </GroupedListItem>
        ) : null}
      </GroupedList>

      {/* The same shape a refused copy takes one card below: the sheet closes
          on a redirect, so a refusal has to be readable on the screen the
          person is left standing on. */}
      {state.error ? (
        <p role="alert" className={styles.error}>
          {state.error}
        </p>
      ) : null}

      {mine ? (
        <BottomSheet
          open={asking}
          title={t("close.sheet.confirm", { month: waiting.name })}
          onClose={() => setAsking(false)}
          actions={
            <form action={send} className={styles.confirm}>
              <input type="hidden" name="spaceId" value={spaceId} />
              {/*
                The month the sheet *named*, and never one worked out again on
                the far side. A person read "Cerrar septiembre"; a server that
                re-derived "the month before this one" would, on a request that
                crossed midnight on the 1st, freeze a month nobody was shown —
                and there is no second close to correct it on.
              */}
              <input type="hidden" name="mes" value={waiting.month} />
              <Button type="submit" variant="destructive" disabled={pending}>
                {pending
                  ? t("close.sheet.working")
                  : t("close.sheet.confirm", { month: waiting.name })}
              </Button>
              <Button variant="plain" onClick={() => setAsking(false)}>
                {t("close.sheet.notYet")}
              </Button>
            </form>
          }
        >
          <p className={styles.body}>
            {t("close.sheet.body", { month: waiting.name })}
          </p>

          {/*
            The block the artboard sets apart from the paragraph above, in the
            component built for exactly this: a standing statement about a
            consequence that cannot be taken back. It is the one rule a person
            would otherwise meet in October without ever having been told
            (ADR-0002) -- a September ticket found late is October's expense.
          */}
          <Notice variant="warning">
            {t("close.sheet.late", {
              month: waiting.name,
              next: waiting.nextName,
            })}
          </Notice>

          {waiting.tally ? <Holdings tally={waiting.tally} /> : null}
        </BottomSheet>
      ) : null}
    </div>
  );
}

/**
 * What the month about to be frozen holds: how much is in it, and whether
 * anything in it is still waiting.
 *
 * A description list, because that is what two labels and their two values are,
 * and because it is what a screen reader reads as pairs — the same reasoning
 * the payment confirmation's recap and the copy offer's tray are both built on.
 *
 * The pending line is written as a state and not as a count on its own: "Nada
 * pendiente" where there is nothing, which is a person being told they are
 * finished rather than being shown a zero to interpret.
 */
function Holdings({ tally }: { tally: ClosingTally }) {
  return (
    <dl className={styles.recap}>
      <div className={styles.recapRow}>
        <dt>{t("close.sheet.movements")}</dt>
        <dd>{tally.movements}</dd>
      </div>
      <div className={styles.recapRow}>
        <dt>{t("close.sheet.pending")}</dt>
        {/*
          The one figure on this sheet somebody can still act on, so it is the
          one drawn in a colour when it is not zero. `--color-warning-text` and
          not the destructive ink: an unpaid Fixed item is something to look at
          before closing, not something wrong.
        */}
        <dd className={tally.unpaid > 0 ? styles.pending : undefined}>
          {tally.unpaid === 0
            ? t("close.sheet.pending.none")
            : tally.unpaid === 1
              ? t("close.sheet.pending.one")
              : t("close.sheet.pending.many", { count: tally.unpaid })}
        </dd>
      </div>
    </dl>
  );
}
