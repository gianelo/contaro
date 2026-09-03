"use client";

import { useActionState, useState, useSyncExternalStore } from "react";
import { isCalendarDate, type CalendarDate } from "@/domain/calendar/month";
import type { CurrencyCode } from "@/domain/money/currency";
import { t } from "@/i18n";
import { dayLabel } from "@/i18n/day";
import { Button } from "@/ui/button";
import { ChipField, type Chip } from "@/ui/chip-field";
import { SelectField, TextField } from "@/ui/field";
import { Keypad } from "@/ui/keypad";
import { cx } from "@/ui/cx";
import { hitTarget } from "@/ui/hit-target";
import { nothingWrongYet, type MovementFormState } from "./record";
import styles from "./form.module.css";

export type MovementFormProps = {
  spaceId: string;
  /** The Movement being corrected, or nothing at all for a new one. */
  movementId?: string;
  categories: readonly Chip[];
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
    categoryId: string;
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
 * home from the till; the Category next, one tap from a flat list; the day and
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
  const day = chosenDay ?? (movementId === undefined ? today : initial.occurredOn);

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

      <details className={styles.when}>
        {/* Composes the one class that owns the 44px, rather than
            restating the rule here: see src/ui/hit-target.ts. */}
        <summary className={cx(hitTarget, styles.summary)}>
          <span className={styles.said}>
            {t("movements.when", {
              day: readableDay(day, today),
              member: attributedTo?.label ?? "",
            })}
          </span>
          <span className={styles.change}>{t("movements.change")}</span>
        </summary>

        <div className={styles.changes}>
          <TextField
            type="date"
            name="occurredOn"
            label={t("movements.day")}
            value={day}
            onChange={(event) => setChosenDay(event.target.value)}
            required
          />

          {/*
            Offered only where there is somebody else to choose. In a personal
            Space the question has one answer, and asking it is asking nothing.
            The field is absent rather than disabled, so the form carries no
            attribution at all and `recordMovement` fills in the recorder.
          */}
          {members.length > 1 ? (
            <SelectField
              name="attributedTo"
              label={t("movements.attributedTo")}
              choices={members}
              value={attributedTo?.value}
              onChange={(event) => setChosenMember(event.target.value)}
            />
          ) : null}
        </div>
      </details>

      <ChipField
        name="categoryId"
        legend={t("movements.category")}
        chips={categories}
        defaultValue={initial.categoryId || undefined}
        empty={t("movements.category.none")}
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

/** Whatever the date field currently holds, named the way a person says it. */
function readableDay(day: string, today: CalendarDate): string {
  return isCalendarDate(day) ? dayLabel(day, today) : day;
}
