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
  /**
   * Whether the form asks the one question an item's kind is decided by: does
   * this fall due on a day of the month (#80)?
   *
   * Asked when something is being planned, which is the only moment the answer
   * is still open, and never on a correction: an item's kind is settled the
   * moment it is written down, and the domain has nowhere to write a changed
   * one back to -- `BudgetItemAmendment` carries no day and `FixedItemAmendment`
   * carries no way to drop one, both on purpose. A control that could be
   * answered and then refused is worse than no control.
   */
  asksWhetherItFallsDue?: boolean;
  action: (
    previous: BudgetFormState,
    form: FormData,
  ) => Promise<BudgetFormState>;
  submit: string;
  working: string;
};

/**
 * One item of the month's plan: how much, what it is called, what it is filed
 * under, and — when it is being planned — whether it falls due on a day.
 *
 * The one way into the plan (#80). There used to be two, on two routes with
 * two forms and two actions, and a person standing on the Budget screen saw
 * two buttons reading almost the same and had to know what "fijo" meant to
 * choose between them. That was a fair price when the two kinds were asked
 * two different sets of questions; #79 gave every item a name, and the day was
 * the only difference left. One field is not a second screen.
 *
 * The questions, in the order the entry screen asks its own (story 18 in #1):
 * the amount on the keypad, the name, then the Category one tap away from its
 * headings — the same picker the entry screen uses, because asking for a
 * Category is one question (#45) — and last the day, because it is the only
 * one most items never answer.
 *
 * Nobody is asked to pick a kind, and that is the point rather than a saving.
 * `kind` stays in the domain, where it decides whether an item can be marked
 * paid and whether its Category is measured (ADR-0023); it stops being a word
 * a person has to have learnt before they are allowed to write down a number.
 *
 * This is still not the Movement entry screen, and the questions it does not
 * ask are the argument (#66 against #79): there is no attribution, because
 * planning a month is not done standing at a till — a plan is about a month
 * rather than a moment, and the money in a Space is one pot. What the name
 * buys is the one thing #79 says the plan was missing: four weeks of groceries
 * under "Súper" were four identical rows, and a person could read down them
 * but not tell which was the week they meant.
 *
 * There is nothing to mark paid, on either kind. That is a separate act with
 * its own confirmation (#13) — the money comes into existence when somebody
 * says it moved, and never when they wrote down that it would.
 *
 * Planning and correcting are one form, because they are one screen with one
 * set of answers. Two copies would be two places for the correction to stop
 * being held to the rules the planning was. The day question is the one thing
 * only planning asks: see `asksWhetherItFallsDue`.
 */
export function BudgetItemForm({
  spaceId,
  itemId,
  month,
  categories,
  currency,
  locales,
  initial,
  asksWhetherItFallsDue = false,
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

      {asksWhetherItFallsDue ? (
        <SelectField
          name="dueDay"
          label={t("budget.item.due")}
          // Exactly the days this month has, and "No vence" ahead of them.
          // `daysOf` is what knows February is shorter and how much shorter
          // this particular February is; the domain refuses a day past it
          // (`dayOf`), and this is that same rule offered as a list so nobody
          // has to be refused to find out.
          choices={daysOf(month)}
          /*
            The question that used to be a second button on the Budget screen
            (#80), and one control rather than a question and an answer stacked
            under it. Nobody picks a kind: they say whether the thing falls
            due, which is what "fixed" has meant all along.

            "No vence" is a real answer and not a prompt. It carries no value,
            and no value is exactly what "this never falls due" posts -- so
            this picker is never `required`, has no refusal of its own, and
            every state of it is something a person can have meant. That is
            what a `placeholder` cannot usually be, and the reason it can be
            here is the reason this control exists at all: the absence of a day
            *is* the other answer.

            One always-present row, and this was measured rather than drawn.
            The canvas asks the question with two chips and opens the picker
            under them; stacked, the two cost 173px in the state that has a day
            on it, against 87px for this in every state -- which is what the
            Fixed screen this replaces cost for the same four questions. On a
            form already 182px past the fold of an iPhone 13 (#86), a row that
            grows is a row somebody else has to pay for.

            Two chips that swapped themselves for this picker were tried and
            rejected for a worse reason than pixels: a person who tapped
            "Elegir un día" and then saved without touching the wheel had said
            it vences and got an item that does not. There is no such gap here,
            because there is no earlier tap to contradict -- what the row reads
            is what gets filed, at every moment.

            It also answers the objection recorded against merging the two ways
            in, a form whose shape a thumb cannot predict, as completely as it
            can be answered: nothing here ever grows or shrinks. Guardar does
            not move.
          */
          placeholder={t("budget.item.due.never")}
          defaultValue=""
        />
      ) : null}

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
