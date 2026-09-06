"use client";

import { useActionState, useState } from "react";
import type { CurrencyCode } from "@/domain/money/currency";
import { MAX_BUDGET_ITEM_NAME_LENGTH } from "@/domain/budget/budget";
import { t } from "@/i18n";
import { Button } from "@/ui/button";
import { BranchingChipField, type ChipBranch } from "@/ui/branching-chip-field";
import { TextField } from "@/ui/field";
import { Keypad } from "@/ui/keypad";
import { nothingWrongYet, type BudgetFormState } from "./plan";
import styles from "./form.module.css";

export type BudgetItemFormProps = {
  spaceId: string;
  /** The item being corrected, or nothing at all for a new one. */
  itemId?: string;
  /** The month being planned. Carried, because an item is on one month. */
  month: string;
  categories: readonly ChipBranch[];
  currency: CurrencyCode;
  locales: readonly string[];
  /**
   * What the three questions already say, and what nothing answered looks like
   * for one being planned: a keypad on zero, an empty name, and `null` for the
   * one the person picks from a list rather than fills in.
   */
  initial: {
    amount: number;
    name: string;
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
 * One item of the month's plan: how much, what it is called, and what it is
 * filed under.
 *
 * Three questions, in the order the entry screen asks its own (story 18 in
 * #1): the amount on the keypad, the name, then the Category one tap away from
 * its headings — the same picker the entry screen uses, because asking for a
 * Category is one question (#45). The name sits where the Fixed form puts it,
 * between the two, so the two ways into the plan are one form with one
 * question more on it rather than two shapes a thumb has to learn.
 *
 * This is still not the Movement entry screen, and the questions it does not
 * ask are the argument (#66 against #79): there is no day and no attribution,
 * because planning a month is not done standing at a till — a plan is about a
 * month rather than a moment, and the money in a Space is one pot. What the
 * name buys is the one thing #79 says the plan was missing: four weeks of
 * groceries under "Súper" were four identical rows, and a person could read
 * down them but not tell which was the week they meant.
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

      <TextField
        name="name"
        label={t("budget.item.name")}
        maxLength={MAX_BUDGET_ITEM_NAME_LENGTH}
        defaultValue={initial.name}
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
