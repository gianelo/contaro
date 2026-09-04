"use client";

import { useActionState, useState } from "react";
import type { CurrencyCode } from "@/domain/money/currency";
import { t } from "@/i18n";
import { Button } from "@/ui/button";
import { ChipField, type Chip } from "@/ui/chip-field";
import { Keypad } from "@/ui/keypad";
import { nothingWrongYet, type BudgetFormState } from "./plan";
import styles from "./form.module.css";

export type BudgetItemFormProps = {
  spaceId: string;
  /** The item being corrected, or nothing at all for a new one. */
  itemId?: string;
  /** The month being planned. Carried, because an item is on one month. */
  month: string;
  categories: readonly Chip[];
  currency: CurrencyCode;
  locales: readonly string[];
  initial: {
    amount: number;
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
 * One item of the month's plan: how much, on what.
 *
 * Two questions and no more, in the order the entry screen asks its first two
 * (story 18 in #1): the amount on the keypad, then the Category one tap away
 * from a flat list. There is no day and no attribution, because a plan has
 * neither — it is about a month, and the money in a Space is one pot.
 *
 * There is nothing to mark paid, and that is the shape of a Variable item
 * rather than a control left out: a Fixed item is a known amount on a known
 * day whose marking paid creates its Movement (#13), and this expects a
 * Category to cost something across a month nobody has spent yet.
 *
 * Planning and correcting are one form, because they are one screen with one
 * set of answers. Two copies would be two places for the correction to stop
 * being held to the rules the planning was.
 */
export function BudgetItemForm({
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
}: BudgetItemFormProps) {
  const [state, send, pending] = useActionState(action, nothingWrongYet);
  const [amount, setAmount] = useState(initial.amount);

  return (
    <form action={send} className={styles.form}>
      {/*
        The Space is carried in the form because the action needs to know whose
        money this is (ADR-0010: the URL names the Space, so there is nowhere
        else to read it from). It is a claim and not a fact, which is why
        `handlePlanBudgetItem` proves membership again before writing.
      */}
      <input type="hidden" name="spaceId" value={spaceId} />
      {itemId ? <input type="hidden" name="itemId" value={itemId} /> : null}
      {/*
        Which month is being planned. A plan has no day to read it off, so it
        is carried; `planItem` refuses one that is not a month rather than
        rounding it to this one.
      */}
      <input type="hidden" name="mes" value={month} />
      {/*
        The keypad is not a text field, so the amount is carried here. Minor
        units, exactly as `BudgetItemDraft` counts them.
      */}
      <input type="hidden" name="amount" value={amount} />

      <Keypad
        value={amount}
        currency={currency}
        locales={locales}
        onChange={setAmount}
      />

      <ChipField
        name="categoryId"
        legend={t("budget.item.category")}
        chips={categories}
        defaultValue={initial.categoryId ?? undefined}
        required
      />

      {state.error ? (
        <p role="alert" className={styles.error}>
          {state.error}
        </p>
      ) : null}

      <div className={styles.save}>
        <Button
          type="submit"
          // Expecting nothing is not a plan, and the domain would refuse it by
          // name. Refusing it here means the ordinary mistake — a thumb on
          // Save before the amount — costs no round trip.
          disabled={pending || amount === 0}
        >
          {pending ? working : submit}
        </Button>
      </div>
    </form>
  );
}
