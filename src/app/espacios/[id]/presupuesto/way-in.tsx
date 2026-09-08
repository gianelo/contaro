"use client";

import { useActionState, useState } from "react";
import { BottomSheet } from "@/ui/bottom-sheet";
import { Button } from "@/ui/button";
import { GroupedList, GroupedListItem } from "@/ui/grouped-list";
import { Icon } from "@/ui/icon";
import { t } from "@/i18n";
import { copyPlanAction } from "./actions";
import { nothingWrongYet } from "./plan";
import type { ReadableCopyOffer, ReadableTally } from "./budget";
import styles from "./way-in.module.css";

/**
 * The plus, at the size the canvas draws it on a row of words
 * (`design/MasIntacto.dc.html`) and at the weight the way to another Space
 * already asks for (`espacios/page.tsx`) — the same drawing beside the same
 * kind of sentence. The artboard draws the stroke a tenth heavier and is not
 * followed there: the canvas's weights are drawings and not a scale, which is
 * why the screen states a weight rather than deriving one (ADR-0026,
 * `variables.tsx`), and matching the plus the app already draws beside words
 * says more than a tenth of a stroke does.
 */
const PLUS = 18;
const PLUS_WEIGHT = 2.2;

export type WayIntoThePlanProps = {
  spaceId: string;
  /** The month being planned, so the form opens on it and not on today's. */
  month: string;
  /** Whether the month holds no item of either kind (`CONTEXT.md`). */
  nothingPlanned: boolean;
  /**
   * The most recent plan there is to carry into this month, or nothing at all
   * where there is none (#121).
   *
   * Read by the screen and handed in whole, so nothing here decides which
   * month is offered or what it comes to. The row and the sheet name a month
   * and print two figures; which month that is, is a question about rows
   * (`planToCopyForward`).
   */
  copy: ReadableCopyOffer | null;
};

/**
 * The one way into a month's plan (#80), above both of the plan's sections
 * (#81), and — on a month with nothing on it — the offer to carry the last
 * plan there is into it (#121).
 *
 * A row and not the filled button this used to be. The screen is grouped lists
 * from top to bottom since #63, and a filled button pressed against the
 * summary card would be louder than the two figures somebody opened the screen
 * to read (ADR-0043 for the vocabulary, ADR-0045 for this).
 *
 * The empty state rides in the same card rather than in a group of its own
 * above it. Both are hidden groups named "Presupuesto", and two of those in a
 * row is one name a screen reader reads twice with nothing to tell them apart.
 * Together they are the sentence and the answer to it: a month with nothing
 * planned still says so, and still shows the way to plan.
 *
 * The copy offer rides in that same card for the same reason and for one more
 * (decision 21 of #109). A sheet opening by itself would be a second answer to
 * a sentence that already has one, which is exactly what ADR-0045 exists to
 * prevent. So: one card, one sentence, two ordered answers — the plan a person
 * almost certainly wants, and then writing one from nothing.
 *
 * It is a client component since #121, which the two rows do not pay for
 * equally. The way in is still a link and still works before any JavaScript
 * has loaded; only the copy row needs the state, because a sheet is not
 * somewhere a URL can go.
 */
export function WayIntoThePlan({
  spaceId,
  month,
  nothingPlanned,
  copy,
}: WayIntoThePlanProps) {
  const [copying, setCopying] = useState(false);
  const [state, send, pending] = useActionState(
    copyPlanAction,
    nothingWrongYet,
  );

  // Only where there is a plan to carry *and* nothing here to carry it onto.
  // The second half is what keeps a month with the rent on it from being
  // offered August's plan on top of it.
  const offer = nothingPlanned ? copy : null;

  return (
    <div className={styles.card}>
      <GroupedList label={t("nav.budget")} labelHidden>
        {nothingPlanned ? (
          <GroupedListItem>{t("budget.empty")}</GroupedListItem>
        ) : null}

        {/*
          A button and not a link, which is the one place this card departs
          from ADR-0045's rule — and it departs from it by keeping the reason.
          That rule is about rows that *go somewhere*: they open in a new tab
          and they work before JavaScript. This row goes nowhere. It opens a
          confirmation over the screen a person is already on, which is what
          "Marcar pagado" does one card below and for the same reason: a whole
          month's plan arriving on one tap is the thing a confirmation is for.
        */}
        {offer ? (
          <GroupedListItem
            leading={
              <span className={styles.mark}>
                <Icon name="rotate" size={PLUS} weight={PLUS_WEIGHT} />
              </span>
            }
            onClick={() => setCopying(true)}
          >
            <span className={styles.word}>
              {t("budget.plan.copy", { month: offer.name })}
            </span>
          </GroupedListItem>
        ) : null}

        {/*
          A link and never a button, for the reason `GroupedListItem` gives for
          every row that goes somewhere: it opens in a new tab, and it works
          before any JavaScript has loaded. Nothing happens here that a URL
          cannot say — the destination carries the month it was opened from.
        */}
        <GroupedListItem
          href={`/espacios/${spaceId}/presupuesto/nuevo?mes=${month}`}
          /*
            No label on the icon: the words beside it are the message, and a
            screen reader that heard "plus" first would hear the same fact
            twice. Wrapped only to be given a colour — the drawing carries none
            of its own on purpose (`Icon`), and this is the one row on the
            screen that is not written in the ordinary ink. The wrapper is a
            flex box, so it shrink-wraps the drawing and offers no second
            opinion about how wide the start of a row is, which is what
            `GroupedListItem` renders `leading` bare to avoid.
          */
          leading={
            <span className={styles.mark}>
              <Icon name="plus" size={PLUS} weight={PLUS_WEIGHT} />
            </span>
          }
        >
          <span className={styles.word}>{t("budget.plan.new")}</span>
        </GroupedListItem>
      </GroupedList>

      {/* The same shape a refused payment takes, one card below: the sheet
          closes on the redirect, so a refusal has to be readable on the screen
          the person is left standing on. */}
      {state.error ? (
        <p role="alert" className={styles.error}>
          {state.error}
        </p>
      ) : null}

      {/*
        Drawn only where there is an offer, so nothing inside it has to ask
        again whether there is one. `BottomSheet` renders nothing while it is
        closed, so this costs the same and saves the sheet five fallbacks to
        an empty string -- five places a missing month would have reached a
        person as a blank in the middle of a sentence.
      */}
      {offer ? (
        <BottomSheet
          open={copying}
          align="start"
          title={t("budget.plan.copy.title", { month: offer.name })}
          onClose={() => setCopying(false)}
          actions={
            <form action={send} className={styles.confirm}>
              <input type="hidden" name="spaceId" value={spaceId} />
              <input type="hidden" name="mes" value={month} />
              {/*
                The month the row *named*, and not one derived on the far side.
                A person tapped "Copiar el plan de agosto"; if a nearer month
                were planned between that tap and this submission, a server that
                worked out "the previous month with a plan" for itself would copy
                a month nobody was shown.
              */}
              <input type="hidden" name="desde" value={offer.month} />
              <Button type="submit" disabled={pending}>
                {pending
                  ? t("budget.plan.copy.working")
                  : t("budget.plan.copy.confirm", { month: offer.intoName })}
              </Button>
              {/*
                "Empezar de cero" and not "Cancelar" (the artboard). Cancelling
                closes a sheet and leaves a person where they were; this names
                the other thing they can do, which is the plan they came to
                write. The row underneath is what does it, so this only closes.
              */}
              <Button variant="plain" onClick={() => setCopying(false)}>
                {t("budget.plan.copy.scratch")}
              </Button>
            </form>
          }
        >
          <p className={styles.body}>
            {t("budget.plan.copy.body", { month: offer.intoName })}
          </p>

          {/*
            What is about to be copied, counted by kind. A description list,
            because that is what two labels and their two values are — and it is
            what a screen reader reads as pairs, which is the same reasoning the
            payment confirmation's recap is built on.
          */}
          <dl className={styles.recap}>
            <Counted
              label={t("budget.fixed")}
              tally={offer.fixed}
            />
            <Counted
              label={t("budget.variables")}
              tally={offer.variables}
            />
          </dl>

          <p className={styles.reassurance}>{t("budget.plan.copy.reassurance")}</p>
        </BottomSheet>
      ) : null}
    </div>
  );
}

/**
 * One line of the recap: a kind, how many rows it has and what they come to.
 *
 * Nothing at all where the month it copies has none of that kind. The recap
 * says what is about to happen, and "Variables · 0 gastos previstos · $0" is a
 * line about something that is not going to.
 */
function Counted({
  label,
  tally,
}: {
  label: string;
  tally: ReadableTally | null;
}) {
  if (tally === null) return null;

  return (
    <div className={styles.recapRow}>
      <dt>{label}</dt>
      <dd>
        {tally.count === 1
          ? t("budget.plan.copy.tally.one", { total: tally.total })
          : t("budget.plan.copy.tally", {
              count: tally.count,
              total: tally.total,
            })}
      </dd>
    </div>
  );
}
