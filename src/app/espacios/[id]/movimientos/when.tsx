"use client";

import { useState } from "react";
import {
  isCalendarDate,
  monthOf,
  type CalendarDate,
} from "@/domain/calendar/month";
import { t } from "@/i18n";
import { dayLabel, monthLabel } from "@/i18n/day";
import { BottomSheet } from "@/ui/bottom-sheet";
import { Button } from "@/ui/button";
import { SelectField, TextField } from "@/ui/field";
import { Icon } from "@/ui/icon";
import { cx } from "@/ui/cx";
import { hitTarget } from "@/ui/hit-target";
import styles from "./when.module.css";

/** What the canvas draws the two icons on this line at. */
const LINE_ICON = 15;

export type WhenProps = {
  /** The day the Movement is on, as the form currently holds it. */
  day: string;
  /** The reader's own day, so "Hoy" means theirs and not the server's. */
  today: CalendarDate;
  members: readonly { value: string; label: string }[];
  attributedTo: { value: string; label: string } | undefined;
  onDayChange: (day: string) => void;
  onMemberChange: (member: string) => void;
  /**
   * The Space's closed months, as the plain `YYYY-MM` the column holds (#119).
   *
   * An array and not a `Set`, because these props cross from a server
   * component into a client one and what crosses has to be something the RSC
   * payload carries plainly.
   *
   * It reaches as far back as the pill the screens above this one wear, which
   * is fourteen months. A day older than that is possible here and unwarned,
   * and it still meets `refuseAClosedMonth` on the way in -- late, and never
   * wrong. What this closes is the gap a person can actually walk into: the
   * month that ended a fortnight ago and was closed on Monday.
   */
  closedMonths: readonly string[];
};

/**
 * When the money moved and whose it was, as one line that states them rather
 * than two fields that ask.
 *
 * In the ordinary case both answers are already right — it is today, and it is
 * the person typing — so the screen says so and gets out of the way. Putting a
 * date picker and a name picker between the amount and Save would be charging
 * every expense for a question almost none of them have.
 *
 * Changing them opens a sheet, which is what makes it a deliberate act rather
 * than something a thumb does on the way past. The sheet is not in the DOM
 * while it is shut, so what it edits cannot be what the form submits: the two
 * answers ride along in hidden fields, and the sheet only moves the state
 * behind them.
 */
export function When({
  day,
  today,
  members,
  attributedTo,
  onDayChange,
  onMemberChange,
  closedMonths,
}: WhenProps) {
  const [changing, setChanging] = useState(false);
  // The month a day just picked fell in, where the picker would not take it.
  const [refused, setRefused] = useState<string | null>(null);
  const shared = members.length > 1;

  /*
   * The picker refusing a day inside a closed month (#119, decision 20).
   *
   * A refusal and not a disabled control anywhere. Decision 16 is the whole
   * rule -- "no greying, no disabling" -- and a Save button that had gone
   * quiet because of the day above it would be exactly the greyed-out control
   * the product has never had. The day simply does not become that day: the
   * field is controlled by what the form holds, so declining to move it is
   * what puts the old one back on the screen.
   *
   * It never has to fight an initial value. A Movement already in a closed
   * month has no form at all -- its screen shows the record and the card that
   * says why -- so the only way a closed day reaches this is a thumb choosing
   * one, which is the moment the sentence is owed.
   */
  const chooseDay = (picked: string) => {
    const shut = closedMonthOf(picked, closedMonths, today);

    if (shut !== null) {
      setRefused(shut);
      return;
    }

    setRefused(null);
    onDayChange(picked);
  };

  return (
    <div className={styles.when}>
      <input type="hidden" name="occurredOn" value={day} />
      {/*
        Absent and not empty in a Space of one: the form carries no attribution
        at all and `recordMovement` fills in whoever is recording.
      */}
      {shared && attributedTo ? (
        <input type="hidden" name="attributedTo" value={attributedTo.value} />
      ) : null}

      <p className={styles.line}>
        {/* Neither icon names itself: the words beside them do. */}
        <Icon name="calendar" size={LINE_ICON} />
        <span>{readableDay(day, today)}</span>
        <span aria-hidden="true" className={styles.dot}>
          ·
        </span>
        <Icon name="person" size={LINE_ICON} />
        {/*
          The one thing on this line whose length is somebody else's: a Member
          named at length wraps it onto a second line, and a second line is
          14px neither entry screen can spare (#73, ADR-0047). It is a span of
          its own already, so the name is what is cut and the day, the dot and
          both icons stay whole.
        */}
        <span className={styles.who}>{attributedTo?.label ?? ""}</span>
      </p>


      <button
        type="button"
        onClick={() => setChanging(true)}
        /*
          Named more fully than it is written. The word on the canvas is
          "Cambiar", and the Category picker's way back is also "Cambiar" --
          both deliberately, because in each place the word is unambiguous to
          somebody looking at it. To somebody hearing it they are two buttons
          with one name. The name starts with the visible word, the way
          `ChipField`'s qualifier does, so anybody driving this screen by voice
          still says what they can see.
        */
        aria-label={t("movements.when.change")}
        className={cx(hitTarget, styles.change)}
      >
        {t("movements.change")}
      </button>

      <BottomSheet
        open={changing}
        title={t("movements.when.title")}
        align="start"
        onClose={() => setChanging(false)}
        actions={
          <Button type="button" onClick={() => setChanging(false)}>
            {t("action.done")}
          </Button>
        }
      >
        <div className={styles.changes}>
          {/*
            No `name` on either: the hidden fields above are what the form
            submits, and a second field of the same name would send two answers
            for one question.
          */}
          <TextField
            type="date"
            label={t("movements.day")}
            value={day}
            onChange={(event) => chooseDay(event.target.value)}
          />

          {/*
            Why the day did not move (#119). Inside the sheet and under the
            field it is about, because the sheet is open at the moment it is
            said and the line outside can never carry it -- the day out there
            is the one that was kept, and a sentence about a day nobody can see
            explains nothing.

            `role="alert"`, for the reason the form's own errors carry one: it
            appears in answer to something a thumb just did, and a field that
            silently ignored a tap is a field somebody taps again.
          */}
          {refused ? (
            <p role="alert" className={styles.refused}>
              {t("movements.when.closed", { month: refused })}
            </p>
          ) : null}

          {shared ? (
            <SelectField
              label={t("movements.attributedTo")}
              choices={members}
              value={attributedTo?.value}
              onChange={(event) => onMemberChange(event.target.value)}
            />
          ) : null}
        </div>
      </BottomSheet>
    </div>
  );
}

/**
 * The month a chosen day falls in, named, where that month has been closed --
 * and nothing at all otherwise (#119).
 *
 * Named against the Reader's own month for the reason every other month on
 * these screens is: the year is written exactly where it is not the year they
 * are standing in (ADR-0018).
 */
export function closedMonthOf(
  day: string,
  closedMonths: readonly string[],
  today: CalendarDate,
): string | null {
  if (!isCalendarDate(day)) return null;

  const of = monthOf(day);

  return closedMonths.includes(of) ? monthLabel(of, monthOf(today)) : null;
}

/** Whatever the date field currently holds, named the way a person says it. */
function readableDay(day: string, today: CalendarDate): string {
  return isCalendarDate(day) ? dayLabel(day, today) : day;
}
