"use client";

import { useActionState, useState } from "react";
import type { CurrencyCode } from "@/domain/money/currency";
import { lastDayOf, month as asMonth } from "@/domain/calendar/month";
import { MAX_FIXED_ITEM_NAME_LENGTH } from "@/domain/budget/budget";
import { t } from "@/i18n";
import { Button } from "@/ui/button";
import { BranchingChipField, type ChipBranch } from "@/ui/branching-chip-field";
import { SelectField, TextField } from "@/ui/field";
import { Keypad } from "@/ui/keypad";
import { planFixedItemAction } from "./actions";
import { nothingWrongYet } from "./plan";
import styles from "./form.module.css";

export type FixedItemFormProps = {
  spaceId: string;
  /** The month being planned. Carried, because an item is on one month. */
  month: string;
  categories: readonly ChipBranch[];
  currency: CurrencyCode;
  locales: readonly string[];
};

/**
 * A Fixed item planned: how much, what it is called, what it is filed under
 * and which day of the month it falls due (#13).
 *
 * Two questions more than a Variable item asks, and they are the whole
 * difference between the kinds. A name, because a Fixed item is read by it
 * rather than by its Category — three subscriptions under "Suscripciones" are
 * three rows a person has to tell apart. And a day, because that is what makes
 * it fixed.
 *
 * The day is a day *of the month being planned* and never a whole date. The
 * screen already knows which month it is on, so offering a date picker would
 * be offering somebody the chance to contradict it — and the choices stop at
 * the length of that month, so a February plan is never offered a 30th.
 *
 * There is no correction screen for one of these yet, and nothing here
 * pretends otherwise: this form only plans. `readableBudgetItem` refuses a
 * Fixed item outright rather than opening it in the Variable form, which would
 * offer to save a row with its name, its day and its payment left out.
 */
export function FixedItemForm({
  spaceId,
  month,
  categories,
  currency,
  locales,
}: FixedItemFormProps) {
  const [state, send, pending] = useActionState(
    planFixedItemAction,
    nothingWrongYet,
  );
  const [amount, setAmount] = useState(0);

  // Exactly the days this month has. `lastDayOf` is what knows February is
  // shorter and how much shorter this particular February is; the domain
  // refuses a day past it (`dayOf`), and this is that same rule offered as a
  // list so nobody has to be refused to find out.
  const days = Number(lastDayOf(asMonth(month)).slice(8));
  const choices = Array.from({ length: days }, (_, index) => ({
    value: String(index + 1),
    label: String(index + 1),
  }));

  return (
    <form action={send} className={styles.form}>
      {/*
        A claim, not a fact: `handlePlanFixedItem` proves membership again
        before anything is written (ADR-0010).
      */}
      <input type="hidden" name="spaceId" value={spaceId} />
      <input type="hidden" name="mes" value={month} />
      {/* The keypad is not a text field, so its figure is carried here. */}
      <input type="hidden" name="amount" value={amount} />

      <Keypad
        value={amount}
        currency={currency}
        locales={locales}
        onChange={setAmount}
      />

      <TextField
        name="name"
        label={t("budget.fixed.name")}
        maxLength={MAX_FIXED_ITEM_NAME_LENGTH}
        required
      />

      <SelectField
        name="dueDay"
        label={t("budget.fixed.dueDay")}
        choices={choices}
        // Nothing chosen to begin with, so `required` has teeth: a picker
        // that starts on the 1st answers for whoever does not look, and it
        // would answer with a due date they never chose.
        placeholder="—"
        required
      />

      <BranchingChipField
        name="categoryId"
        legend={t("budget.item.category")}
        more={t("chips.more")}
        change={t("chips.change")}
        branches={categories}
        required
      />

      {state.error ? (
        <p role="alert" className={styles.error}>
          {state.error}
        </p>
      ) : null}

      <div className={styles.save}>
        <Button type="submit" disabled={pending || amount === 0}>
          {pending ? t("budget.item.save.working") : t("budget.item.save")}
        </Button>
      </div>
    </form>
  );
}
