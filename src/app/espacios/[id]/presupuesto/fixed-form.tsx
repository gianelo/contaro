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
  /**
   * What the four questions already say, and what nothing chosen looks like
   * for one being planned: a keypad on zero, an empty name, and `null` for the
   * two the person picks from a list rather than fills in -- which is what the
   * day's placeholder and the unchosen chip each read as.
   */
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
 * Planning and correcting are one form, the way they already are for the other
 * kind (#48). Two copies would be two places for the correction to stop being
 * held to the rules the planning was -- and the four questions are the four
 * questions whichever of the two is being asked.
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
        label={t("budget.fixed.name")}
        maxLength={MAX_FIXED_ITEM_NAME_LENGTH}
        defaultValue={initial.name}
        required
      />

      <SelectField
        name="dueDay"
        label={t("budget.fixed.dueDay")}
        choices={choices}
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
