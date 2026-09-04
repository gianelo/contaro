"use client";

import { useActionState, useState } from "react";
import { Badge } from "@/ui/badge";
import { BottomSheet } from "@/ui/bottom-sheet";
import { Button } from "@/ui/button";
import { GroupedList, GroupedListItem } from "@/ui/grouped-list";
import { t } from "@/i18n";
import { payFixedItemAction } from "./actions";
import { nothingWrongYet } from "./plan";
import type { ReadableFixedItem } from "./budget";
import styles from "./fixed.module.css";

export type FixedItemsProps = {
  spaceId: string;
  month: string;
  items: readonly ReadableFixedItem[];
  /** The Space's name, for the recap: which pot the money lands in. */
  spaceName: string;
  /** The signed-in Member's name. Both halves of the recap are them. */
  memberName: string;
};

/**
 * The FIJOS section: what the month owes on days it already knows about, and
 * whether each one has been paid (#13).
 *
 * Above the Variables, because it is read first and for a different question.
 * A Variable item asks "how much is left"; a Fixed one asks "have I paid it",
 * and the answer is a badge rather than a meter.
 *
 * A pending row is a button and a paid one is not. There is exactly one thing
 * to do to a Fixed item, so the row is that thing — and a paid row has nothing
 * left to do, which is why it stops being tappable rather than opening a sheet
 * that would only refuse.
 */
export function FixedItems({
  spaceId,
  month,
  items,
  spaceName,
  memberName,
}: FixedItemsProps) {
  // Which item the confirmation is about, and null while it is closed. The
  // item and not a boolean beside an id: the sheet writes its name, its
  // amount and its Category, and holding those apart from "which row" is
  // holding one fact in two places.
  const [paying, setPaying] = useState<ReadableFixedItem | null>(null);
  const [state, send, pending] = useActionState(
    payFixedItemAction,
    nothingWrongYet,
  );

  // A month with no Fixed items has no section. An empty heading over nothing
  // is a promise the plan has not made yet, and the Variables below say in
  // words that the month is unplanned.
  if (items.length === 0) return null;

  return (
    <>
      <GroupedList label={t("budget.fixed")}>
        {items.map((item) => (
          <GroupedListItem
            key={item.id}
            onClick={item.paid ? undefined : () => setPaying(item)}
            trailing={
              <span className={styles.end}>
                <span className={styles.amount}>{item.amount}</span>
                <Badge variant={item.paid ? "accent" : "muted"}>
                  {t(item.paid ? "budget.fixed.paid" : "budget.fixed.pending")}
                </Badge>
              </span>
            }
          >
            <span className={styles.name}>{item.name}</span>
            {/*
              The Category and the day, and — when the day is near — what that
              means, on one line. `due` is words and not only the amber it is
              written in: somebody who cannot tell the two greys apart still
              reads that the day is close, which is the whole point of it.
            */}
            <span className={item.due === null ? styles.beneath : styles.near}>
              {item.due === null ? item.beneath : `${item.beneath} · ${item.due}`}
            </span>
          </GroupedListItem>
        ))}
      </GroupedList>

      {state.error ? (
        <p role="alert" className={styles.error}>
          {state.error}
        </p>
      ) : null}

      {/*
        The confirmation, because marking one paid brings money into existence
        in the ledger (#1: an action that creates or destroys data confirms
        first). The recap is the point of it: it names the Space the money
        lands in and whose it will be, which are exactly the two things a
        stray tap would get wrong.
      */}
      <BottomSheet
        open={paying !== null}
        align="start"
        title={t("budget.fixed.pay.title", { name: paying?.name ?? "" })}
        onClose={() => setPaying(null)}
        actions={
          <form action={send} className={styles.confirm}>
            <input type="hidden" name="spaceId" value={spaceId} />
            <input type="hidden" name="itemId" value={paying?.id ?? ""} />
            <input type="hidden" name="mes" value={month} />
            <Button type="submit" disabled={pending}>
              {pending
                ? t("budget.fixed.pay.working")
                : t("budget.fixed.pay")}
            </Button>
            <Button variant="plain" onClick={() => setPaying(null)}>
              {t("action.cancel")}
            </Button>
          </form>
        }
      >
        <p className={styles.body}>
          {t("budget.fixed.pay.body.lead")}{" "}
          {/*
            The amount out of the grey and into the ordinary ink. It is the one
            figure being confirmed, and the sentence around it is context.
          */}
          <strong className={styles.figure}>{paying?.amount}</strong>{" "}
          {t("budget.fixed.pay.body.rest", { category: paying?.category ?? "" })}
        </p>

        <dl className={styles.recap}>
          <div className={styles.recapRow}>
            <dt>{t("budget.fixed.pay.space")}</dt>
            <dd>{spaceName}</dd>
          </div>
          <div className={styles.recapRow}>
            <dt>{t("budget.fixed.pay.recordedBy")}</dt>
            <dd>{memberName}</dd>
          </div>
          {/*
            The same Member, said twice on purpose. Attribution defaults to
            whoever is recording (`paymentFor` hands the ledger no answer, and
            `recordMovement` reads that as them), and the recap's job is to
            state what will be written rather than to be short.
          */}
          <div className={styles.recapRow}>
            <dt>{t("budget.fixed.pay.attributedTo")}</dt>
            <dd>{memberName}</dd>
          </div>
        </dl>
      </BottomSheet>
    </>
  );
}
