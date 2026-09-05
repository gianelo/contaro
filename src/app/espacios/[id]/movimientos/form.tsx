"use client";

import { useActionState, useState, useSyncExternalStore } from "react";
import { isCalendarDate, type CalendarDate } from "@/domain/calendar/month";
import type { CurrencyCode } from "@/domain/money/currency";
import type { MovementDirection } from "@/domain/movement/movement";
import { t } from "@/i18n";
import { Button } from "@/ui/button";
import { BranchingChipField, type ChipBranch } from "@/ui/branching-chip-field";
import { SegmentedField } from "@/ui/segmented-field";
import { Keypad } from "@/ui/keypad";
import { When } from "./when";
import { nothingWrongYet, type MovementFormState } from "./record";
import styles from "./form.module.css";

export type MovementFormProps = {
  spaceId: string;
  /** The Movement being corrected, or nothing at all for a new one. */
  movementId?: string;
  categories: readonly ChipBranch[];
  members: readonly { value: string; label: string }[];
  currency: CurrencyCode;
  locales: readonly string[];
  /** The day the server thinks it is. See `serverDay` below. */
  serverDay: CalendarDate;
  /**
   * The month this form is working in, carried so that striking a Movement out
   * lands back on the list it was opened from. Recording and correcting do not
   * need it — the saved Movement says which month it is in — but a struck one
   * is gone by the time there is anywhere to go.
   */
  month?: string;
  initial: {
    amount: number;
    /**
     * Which way the money went. A correction opens on the direction the
     * Movement has and can never leave it (`DirectionIsImmutableError`); a new
     * Movement opens on an expense, which is what nearly every one of them is.
     */
    direction: MovementDirection;
    categoryId: string | null;
    occurredOn: CalendarDate;
    attributedTo: string;
  };
  action: (
    previous: MovementFormState,
    form: FormData,
  ) => Promise<MovementFormState>;
  submit: string;
  working: string;
};

/**
 * The screen the whole product rests on: the amount on a keypad, the Category
 * one tap away, save.
 *
 * The order down the page is the order a person answers in (story 18 in #1):
 * the amount first, because it is the only part they might forget on the way
 * home from the till; the Category next, one tap from its headings, with what
 * a heading holds offered after it and demanded of nobody (#45); the day and
 * the attribution last and folded away, because in the ordinary case they are
 * already right and asking about them would be asking nothing.
 *
 * Recording and correcting are one form, because they are one screen with one
 * set of answers. The only difference is which action it submits to and what
 * it starts filled in with — and two copies of this would be two places for
 * the correction to stop being held to the rules the recording was.
 */
export function MovementForm({
  spaceId,
  movementId,
  categories,
  members,
  currency,
  locales,
  serverDay,
  month,
  initial,
  action,
  submit,
  working,
}: MovementFormProps) {
  const [state, send, pending] = useActionState(action, nothingWrongYet);
  const [amount, setAmount] = useState(initial.amount);
  const [chosenDay, setChosenDay] = useState<string | null>(null);
  const [chosenMember, setChosenMember] = useState<string | null>(null);

  // Controlled, because the rest of the form depends on it: income carries no
  // Category (#8), so choosing it takes the picker off the screen rather than
  // leaving a question with no answer that could be right.
  //
  // Offered only on a new Movement. A correction cannot change it — which way
  // the money went is what kind of Movement this is, not a field on one — so
  // a toggle there would be a control whose only outcome is a refusal.
  const [direction, setDirection] = useState<MovementDirection>(
    initial.direction,
  );
  const correcting = movementId !== undefined;

  // What day it is, answered by the server while it renders and by the browser
  // once the browser is the one asking.
  //
  // They disagree, and the disagreement matters. The server's day is UTC, so
  // for a few hours of every evening in Buenos Aires it is already tomorrow —
  // an expense recorded at ten at night would be dated the 4th and the line
  // above the keypad would read "4 de septiembre" on a day the person calls
  // the 3rd. It is the person's own day that is wanted here.
  //
  // `useSyncExternalStore` and not an effect: the two answers are two
  // snapshots of something outside React, which is exactly what it is for, and
  // it gets the hydration right instead of re-rendering to correct itself.
  const today = useSyncExternalStore(
    subscribeToNothing,
    // A browser whose clock says something no calendar has falls back to the
    // server's day, which is at least a real one. The bound on how late a day
    // may be is the domain's either way.
    () => browserDay() ?? serverDay,
    () => serverDay,
  );

  // A correction opens on the day the Movement says — that is the whole point
  // of opening it — and a new one opens on today, until a thumb says otherwise.
  const day = chosenDay ?? (correcting ? initial.occurredOn : today);

  // Controlled, for the same reason the day is: the line above the keypad
  // names whoever this is attributed to, and an uncontrolled picker would
  // leave that line naming the Member who was chosen before the change. The
  // form would save the right person and the screen would say the wrong one,
  // which is the worse half of the two to get wrong.
  const attributedTo =
    members.find(
      (member) => member.value === (chosenMember ?? initial.attributedTo),
    ) ?? members[0];

  return (
    <form action={send} className={styles.form}>
      {/*
        The Space is carried in the form because the action needs to know whose
        money this is (ADR-0010: the URL names the Space, so there is nowhere
        else to read it from). It is a claim and not a fact, which is why
        `handleRecordMovement` proves membership again before writing.
      */}
      <input type="hidden" name="spaceId" value={spaceId} />
      {movementId ? (
        <input type="hidden" name="movementId" value={movementId} />
      ) : null}
      {month ? <input type="hidden" name="mes" value={month} /> : null}
      {/*
        The keypad is not a text field, so the amount is carried here. Minor
        units, exactly as `MovementDraft` counts them.
      */}
      <input type="hidden" name="amount" value={amount} />

      <Keypad
        value={amount}
        currency={currency}
        locales={locales}
        onChange={setAmount}
      />

      {/*
        Under the keypad, not above it. Story 18 in #1 puts the amount first
        because it is the only part a person might forget on the way home from
        the till, and a question above it is a question between them and the
        number. It sits above the Category because it decides whether there is
        a Category to ask about at all.

        A correction cannot change it -- which way the money went is what kind
        of Movement this is, not a field on one -- so there is no control
        there, only the hidden field that carries the answer back. Carried and
        not dropped: `amendMovementAction` reads it, so a form that came back
        with the other one is refused rather than half-saved.
      */}
      {correcting ? (
        <input type="hidden" name="direction" value={direction} />
      ) : (
        <SegmentedField
          name="direction"
          legend={t("movements.direction")}
          options={[
            { value: "expense", label: t("movements.direction.expense") },
            { value: "income", label: t("movements.direction.income") },
          ]}
          value={direction}
          onChange={(chosen) =>
            setDirection(chosen === "income" ? "income" : "expense")
          }
          required
        />
      )}

      <When
        day={day}
        today={today}
        members={members}
        attributedTo={attributedTo}
        onDayChange={setChosenDay}
        onMemberChange={setChosenMember}
      />

      {/*
        Absent and not disabled when the money is coming in, so the form
        carries no Category at all — which is exactly what `filing` in the
        domain and the check in migration 0005 both require of income.
      */}
      {direction === "expense" ? (
        <BranchingChipField
          name="categoryId"
          legend={t("movements.category")}
          more={t("chips.more")}
          change={t("chips.change")}
          branches={categories}
          defaultValue={initial.categoryId ?? undefined}
          empty={t("movements.category.none")}
          required
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
          // Nothing typed is nothing to record, and the domain would refuse it
          // by name. Refusing it here means the ordinary mistake — a thumb on
          // Save before the amount — costs no round trip.
          disabled={pending || amount === 0}
        >
          {pending ? working : submit}
        </Button>
      </div>
    </form>
  );
}

/**
 * Nothing to subscribe to: the day is read once per render and never pushes.
 *
 * A day does turn over while a screen is open, and this will not notice. That
 * is the right trade for a screen a person is on for ten seconds: waking a
 * timer at every midnight to correct a field somebody is typing into would
 * change an answer under their thumb.
 */
const subscribeToNothing = () => () => {};

/**
 * The day the browser thinks it is. Local and not UTC: it is the person's own
 * day that is wanted.
 *
 * The same string every call, which is what `useSyncExternalStore` needs —
 * it compares snapshots by identity, and two equal strings are one value.
 */
function browserDay(): CalendarDate | null {
  const now = new Date();
  const written = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  return isCalendarDate(written) ? written : null;
}

const pad = (value: number) => String(value).padStart(2, "0");
