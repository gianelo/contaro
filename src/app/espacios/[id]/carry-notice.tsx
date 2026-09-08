"use client";

import { useActionState, useState } from "react";
import { BottomSheet } from "@/ui/bottom-sheet";
import { Button } from "@/ui/button";
import { GroupedList, GroupedListItem } from "@/ui/grouped-list";
import { Icon } from "@/ui/icon";
import { t } from "@/i18n";
import { approveCarryOverAction } from "./actions";
import { nothingWrongYet } from "./carry";
import type { ReadableCarryOver } from "./carried";
import styles from "./carry-notice.module.css";

/**
 * The mark, at the size and weight the close's row and the way into the plan
 * both draw theirs. `rotate` and not an arrow: what this row is about is money
 * coming round again, which is the one drawing in the set that says so.
 */
const MARK = 18;
const MARK_WEIGHT = 2.2;

export type CarryNoticeProps = {
  spaceId: string;
  /** What the month before this one left. Never drawn where it left nothing. */
  carried: ReadableCarryOver;
};

/**
 * What the month before this one left behind, said on the screen whose money it
 * is about (#120, decisions 4, 6 and 11 of #109).
 *
 * **A surplus and a deficit are not the same card with a different number in
 * it.** A surplus is money that still exists, so it is offered: approve, and it
 * comes back as income of this month, attributed to nobody. A deficit is money
 * already spent -- the card it went on is paid this month, and that payment is
 * a real expense of it -- so subtracting it as well would charge one overspend
 * twice. It is stated, and the verb does not survive into that state: there is
 * no button on it for anybody, in any month.
 *
 * **The deficit says why, unasked.** "No se descuenta de este mes" is the one
 * sentence in the product that answers a question a person would otherwise read
 * as a bug, and it is drawn as a second line rather than hidden behind a tap,
 * because somebody who is not told will conclude the arithmetic is wrong.
 *
 * **It states or it offers, never both**, which is the shape the close's row
 * already has (ADR-0053): the invited Member gets the fact and the creator's
 * name, and never a control they cannot press. On a closed month nobody gets
 * the control, because approving writes into the month on screen (ADR-0054).
 *
 * Drawn as the screen's own vocabulary -- a card holding a grouped list -- for
 * the reason `CloseNotice` gives about being the second such card on this
 * screen: a component that shouted differently from everything under it would
 * be a new kind of surface, and the shouting would be the only thing it added.
 */
export function CarryNotice({ spaceId, carried }: CarryNoticeProps) {
  const [asking, setAsking] = useState(false);
  const [state, send, pending] = useActionState(
    approveCarryOverAction,
    nothingWrongYet,
  );

  return (
    <div className={styles.card}>
      <GroupedList label={t("carry.title")} labelHidden>
        <GroupedListItem>
          <span className={styles.sentence}>{sentenceOf(carried)}</span>
        </GroupedListItem>

        {/*
          The rule, on its own row and only where there is a rule to give. A
          surplus needs none: "sobraron $609.000 en septiembre" is complete, and
          where it goes is what the sheet is for.
        */}
        {carried.kind === "deficit" ? (
          <GroupedListItem>
            <span className={styles.why}>{t("carry.deficit.why")}</span>
          </GroupedListItem>
        ) : null}

        {/*
          A button and not a link, for the reason the close's row is one: this
          goes nowhere. It opens a confirmation over the screen somebody is
          already on, because the act brings money into existence in the ledger
          -- which is the same reason a Fixed item confirms before it is paid.

          Drawn only where it is this Reader's to do. Not disabled for the other
          Member: a disabled control answers "why not" with nothing, and the
          sentence above has already answered it by name.
        */}
        {carried.offer ? (
          <GroupedListItem
            leading={
              <span className={styles.mark}>
                <Icon name="rotate" size={MARK} weight={MARK_WEIGHT} />
              </span>
            }
            onClick={() => setAsking(true)}
          >
            <span className={styles.word}>{t("carry.surplus.act")}</span>
          </GroupedListItem>
        ) : null}
      </GroupedList>

      {/* The sheet closes on a redirect, so a refusal has to be readable on the
          screen the person is left standing on — the same shape the close's row
          and the copy offer both take. */}
      {state.error ? (
        <p role="alert" className={styles.error}>
          {state.error}
        </p>
      ) : null}

      {carried.offer ? (
        <BottomSheet
          open={asking}
          title={t("carry.sheet.title", {
            amount: carried.amount,
            month: carried.name,
          })}
          onClose={() => setAsking(false)}
          actions={
            <form action={send} className={styles.confirm}>
              <input type="hidden" name="spaceId" value={spaceId} />
              {/*
                The month the money comes *out of*, which is the month the card
                named — and never one worked out again on the far side. A person
                read "Sobraron $609.000 en septiembre"; a server that re-derived
                "the month before the one on screen" would, on a request that
                crossed midnight on the 1st, carry a different month's figure
                into a month nobody was shown.
              */}
              <input type="hidden" name="mes" value={carried.from} />
              <Button type="submit" disabled={pending}>
                {pending
                  ? t("carry.sheet.working")
                  : t("carry.sheet.confirm")}
              </Button>
              <Button variant="plain" onClick={() => setAsking(false)}>
                {t("carry.sheet.notNow")}
              </Button>
            </form>
          }
        >
          <p className={styles.body}>
            {t("carry.sheet.body", { next: carried.into })}
          </p>
        </BottomSheet>
      ) : null}
    </div>
  );
}

/**
 * The card's one sentence, chosen once rather than assembled from three
 * booleans at the point it is drawn.
 *
 * Four sentences and not one with holes in it. A surplus that is mine, one that
 * is somebody else's, one on a month that has since been closed, and a deficit
 * are four different things to tell a person -- and a single string with a
 * conditional clause in it is a string that reads badly in three of the four.
 */
function sentenceOf(carried: ReadableCarryOver): string {
  if (carried.kind === "deficit") {
    return t("carry.deficit", {
      amount: carried.amount,
      month: carried.name,
    });
  }

  if (carried.waitingOn !== null) {
    return t("carry.surplus.theirs", {
      amount: carried.amount,
      month: carried.name,
      member: carried.waitingOn,
    });
  }

  // Neither offered nor waiting on anybody is the closed month: the control
  // came off with every other control on it, and what is left is the fact
  // (ADR-0054). Said in the past tense, because there is no yet.
  if (!carried.offer) {
    return t("carry.surplus.closed", {
      amount: carried.amount,
      month: carried.name,
    });
  }

  return t("carry.surplus.mine", {
    amount: carried.amount,
    month: carried.name,
  });
}
