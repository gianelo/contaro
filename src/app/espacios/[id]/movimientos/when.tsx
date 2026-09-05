"use client";

import { useState } from "react";
import { isCalendarDate, type CalendarDate } from "@/domain/calendar/month";
import { t } from "@/i18n";
import { dayLabel } from "@/i18n/day";
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
}: WhenProps) {
  const [changing, setChanging] = useState(false);
  const shared = members.length > 1;

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
        <span>{attributedTo?.label ?? ""}</span>
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
            onChange={(event) => onDayChange(event.target.value)}
          />

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

/** Whatever the date field currently holds, named the way a person says it. */
function readableDay(day: string, today: CalendarDate): string {
  return isCalendarDate(day) ? dayLabel(day, today) : day;
}
