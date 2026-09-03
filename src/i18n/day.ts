import type { CalendarDate } from "@/domain/calendar/month";
import { locale, t } from "./index";

/**
 * How a day is named to a person.
 *
 * In the interface's language and not the reader's, unlike the separators an
 * amount is written with (ADR-0014). Those two are different questions: the
 * separators decide whether a figure is read correctly, and getting them wrong
 * is a silent error of three orders of magnitude, while the month's name is
 * copy — and contaro's copy is Spanish (story 43 in #1).
 *
 * `timeZone: "UTC"` because a `CalendarDate` is a day and not an instant.
 * "2026-01-01" parses as midnight UTC, and formatted in any zone west of it a
 * naive read prints the 31st of December — the day before the one it says.
 */
const sameYear = new Intl.DateTimeFormat(locale, {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

const otherYear = new Intl.DateTimeFormat(locale, {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export function dayLabel(date: CalendarDate, today: CalendarDate): string {
  // What a person calls the day they are standing in. It is the ordinary case
  // on the entry screen and the top of every month's list.
  if (date === today) return t("movements.when.today");

  const at = new Date(`${date}T00:00:00Z`);

  // The year is printed only when it is not the one being read, so the
  // ordinary row is short and a row from another year cannot be misread.
  return date.slice(0, 4) === today.slice(0, 4)
    ? sameYear.format(at)
    : otherYear.format(at);
}
