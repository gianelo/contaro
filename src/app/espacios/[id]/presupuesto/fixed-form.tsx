"use client";

import { useActionState, useState } from "react";
import type { CurrencyCode } from "@/domain/money/currency";
import { MAX_BUDGET_ITEM_NAME_LENGTH } from "@/domain/budget/budget";
import { t } from "@/i18n";
import { Button } from "@/ui/button";
import { BranchingChipField, type ChipBranch } from "@/ui/branching-chip-field";
import { SelectField, TextField } from "@/ui/field";
import { Keypad } from "@/ui/keypad";
import { daysOf } from "./days";
import { nothingWrongYet, type BudgetFormState } from "./plan";
import styles from "./form.module.css";

export type FixedItemFormProps = {
  spaceId: string;
  /** The item being corrected, or nothing at all for a new one. */
  itemId?: string;
  /** The month being planned. Carried, because an item is on one month. */
  month: string;
  categories: readonly ChipBranch[];
  currency: CurrencyCode;
  locales: readonly string[];
  /** What the four questions already say about the item being corrected. */
  initial: {
    amount: number;
    name: string;
    dueDay: number | null;
    categoryId: string | null;
  };
  action: (
    previous: BudgetFormState,
    form: FormData,
  ) => Promise<BudgetFormState>;
  submit: string;
  working: string;
};

/**
 * A Fixed item corrected: how much, what it is called, what it is filed under
 * and which day of the month it falls due (#48).
 *
 * Correcting only, since #80. Planning happens on the one form both kinds are
 * planned with, where the day is asked of everything and answering it is what
 * makes an item Fixed. This stays because a correction is a different
 * question: the item's kind is already settled, so the day is asked outright
 * and there is no way to say it never falls due — that would be changing the
 * kind, which the domain has no operation for and this screen must therefore
 * not appear to offer.
 *
 * One question more than correcting a Variable item asks, and it is the whole
 * difference between the kinds: a day, because that is what makes it fixed.
 *
 * The name is no longer part of that difference (#79). It is asked here and on
 * the other form out of one key, because it was never about the kind — three
 * subscriptions under "Suscripciones" are three rows a person has to tell
 * apart, and so are four weeks of groceries under one Category.
 *
 * The day is a day *of the month being corrected* and never a whole date. The
 * screen already knows which month it is on, so offering a date picker would
 * be offering somebody the chance to contradict it — and the choices stop at
 * the length of that month, so a February plan is never offered a 30th.
 *
 * Nothing here asks whether the item is paid. That refusal is the domain's
 * (`amendFixedItem`, ADR-0034) and the screen above decides whether to render
 * a form at all: a control that could be typed into and then refused is worse
 * than no control, and a second copy of the rule here would be a second place
 * for it to drift.
 */
export function FixedItemForm({
  spaceId,
  itemId,
  month,
  categories,
  currency,
  locales,
  initial,
  action,
  submit,
  working,
}: FixedItemFormProps) {
  const [state, send, pending] = useActionState(action, nothingWrongYet);
  const [amount, setAmount] = useState(initial.amount);

  return (
    <form action={send} className={styles.form}>
      {/*
        A claim, not a fact: `handleAmendFixedItem` proves membership again
        before anything is written (ADR-0010).
      */}
      <input type="hidden" name="spaceId" value={spaceId} />
      {itemId ? <input type="hidden" name="itemId" value={itemId} /> : null}
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
        label={t("budget.item.name")}
        maxLength={MAX_BUDGET_ITEM_NAME_LENGTH}
        defaultValue={initial.name}
        required
      />

      <SelectField
        name="dueDay"
        label={t("budget.fixed.dueDay")}
        // Exactly the days this month has, out of the one place that knows
        // February is shorter -- the same list the plan's entry screen offers.
        choices={daysOf(month)}
        // Nothing chosen to begin with, so `required` has teeth: a picker
        // that starts on the 1st answers for whoever does not look, and it
        // would answer with a due date they never chose. A correction opens on
        // the day the item already has, which is an answer somebody did give.
        placeholder="—"
        defaultValue={initial.dueDay === null ? "" : String(initial.dueDay)}
        required
      />

      <BranchingChipField
        name="categoryId"
        legend={t("budget.item.category")}
        more={t("chips.more")}
        change={t("chips.change")}
        branches={categories}
        defaultValue={initial.categoryId ?? undefined}
        required
      />

      {state.error ? (
        <p role="alert" className={styles.error}>
          {state.error}
        </p>
      ) : null}

      <div className={styles.save}>
        <Button type="submit" disabled={pending || amount === 0}>
          {pending ? working : submit}
        </Button>
      </div>
    </form>
  );
}
