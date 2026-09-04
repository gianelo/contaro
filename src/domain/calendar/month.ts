/**
 * The calendar, as much of it as contaro needs: a day, and the month a day
 * falls in.
 *
 * A Movement happens on a *day*, not at an instant. "3 de septiembre" is what
 * a person remembers about an expense and what a month's list groups by; the
 * hour it was typed in is a fact about the typing and not about the money. So
 * the day is held as the calendar writes it and never as a `Date`, which is an
 * instant and would drag a timezone into every comparison.
 */

declare const day: unique symbol;

/**
 * One day, written `YYYY-MM-DD`.
 *
 * Branded, because every wrong value here looks exactly like a right one: a
 * plain string type would let "2026-02-30" or "hoy" travel all the way to a
 * Postgres `date` column and fail there, a request and a stack trace away from
 * the person who typed it. `calendarDate` is the only way to make one.
 */
export type CalendarDate = string & { readonly [day]: true };

declare const monthBrand: unique symbol;

/**
 * One month, written `YYYY-MM`. The unit a Budget and a list are read in.
 *
 * Branded for the reason `CalendarDate` is: a month arrives from a URL, every
 * wrong one looks exactly like a right one, and every reader of one goes on to
 * build days out of it. `month` and `isMonth` are the only ways to make one,
 * so `firstDayOf` cannot be handed something that is not a month at all.
 */
export type Month = string & { readonly [monthBrand]: true };

// A month is only ever twelve of them, so this is exact about which twelve.
const MONTH_WRITTEN = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * Whether a string from outside names a month.
 *
 * It exists because a month arrives from a URL, which carries any string at
 * all, and every reader of one goes straight on to build days out of it —
 * `firstDayOf("septiembre")` throws. A screen asked for a month nobody has
 * should show the month it would have shown anyway, not a stack trace.
 */
export function isMonth(value: string): value is Month {
  return MONTH_WRITTEN.test(value);
}

/** A month, or a refusal. The one way a `Month` comes into existence. */
export function month(value: string): Month {
  if (!isMonth(value)) throw new UnreadableMonthError(value);
  return value;
}

/**
 * Thrown when a string is offered as a month and is not one. Same reasoning as
 * `UnreadableDateError`: rounding to a month that exists would be a guess.
 */
export class UnreadableMonthError extends Error {
  constructor(value: string) {
    super(`"${value}" is not a month on any calendar; a month is written YYYY-MM.`);
    this.name = "UnreadableMonthError";
  }
}

/**
 * Thrown when a string is offered as a day and is not one. It means a caller
 * handed us something no calendar has, so the only honest answer is to refuse
 * rather than round it to a day that does exist.
 */
export class UnreadableDateError extends Error {
  constructor(value: string) {
    super(`"${value}" is not a day on any calendar; a day is written YYYY-MM-DD.`);
    this.name = "UnreadableDateError";
  }
}

// Deliberately exact about the leading zeros. `Date` takes "2026-9-3" and so
// does Postgres, and one shape written down is what makes two days a day apart
// sort as two days a day apart -- a list ordered by a text column is ordered by
// the calendar only while every row is written the same way.
const WRITTEN = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Whether a string from outside — a form field, a database row — is a day.
 *
 * A shape that parses is not enough: "2026-02-30" is written correctly and is
 * not a day. It is checked by building the day and asking whether it came back
 * the same, which is the one question `Date` answers honestly (it rolls a
 * February 30th over into March rather than refusing it).
 */
export function isCalendarDate(value: string): value is CalendarDate {
  const parts = WRITTEN.exec(value);
  if (!parts) return false;

  const [, year, month, dayOfMonth] = parts as unknown as [
    string,
    string,
    string,
    string,
  ];

  // UTC, so the answer never depends on where this runs. Nothing about a day
  // is a moment in time; this is arithmetic wearing a `Date`.
  const built = new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(dayOfMonth)),
  );

  return written(built) === value;
}

/** A day, or a refusal. The one way a `CalendarDate` comes into existence. */
export function calendarDate(value: string): CalendarDate {
  if (!isCalendarDate(value)) throw new UnreadableDateError(value);
  return value;
}

/** The month a day falls in: `2026-09-03` is in `2026-09`. */
export function monthOf(date: CalendarDate): Month {
  // A `CalendarDate` is always YYYY-MM-DD, so its first seven characters are
  // always a month. Asked rather than cast, so the one place this could be
  // wrong is the one place that checks.
  return month(date.slice(0, 7));
}

export function firstDayOf(month: Month): CalendarDate {
  return calendarDate(`${month}-01`);
}

/**
 * The last day of a month, whichever length it happens to be.
 *
 * Day zero of the next month, which is the day before its first — so February
 * ends on the 29th exactly in the years it has one, and December does not
 * spill into January. Nothing here knows what a leap year is; `Date` does.
 */
export function lastDayOf(month: Month): CalendarDate {
  const first = firstDayOf(month);
  const [year, index] = [Number(first.slice(0, 4)), Number(first.slice(5, 7))];

  return calendarDate(written(new Date(Date.UTC(year, index, 0))));
}

/**
 * A given day of a month: the 22nd of `2026-09` is `2026-09-22`.
 *
 * The one way a Fixed item's due date comes into existence, and the reason it
 * is held as a day of the month rather than as a date somebody typed. An item
 * is planned *on* a month, so a date carrying its own month could disagree
 * with the plan it sits on; a day of the month cannot, and this is where it
 * becomes a day the rest of the code already trusts.
 *
 * It refuses a day the month does not have rather than rounding to the last
 * one it does. February is the case: the 30th is not a late February, it is a
 * day that will not arrive, and moving a due date back two days behind
 * somebody's back is worse than telling them the plan cannot be written.
 */
export function dayOf(of: Month, dayOfMonth: number): CalendarDate {
  if (!Number.isInteger(dayOfMonth) || dayOfMonth < 1) {
    throw new UnreadableDateError(`${of}-${dayOfMonth}`);
  }

  // Padded here rather than by the caller, so the one shape everything else is
  // written in is not something each screen has to remember (`WRITTEN`).
  // `calendarDate` is what refuses a 31st of September: it builds the day and
  // asks whether it came back the same.
  return calendarDate(`${of}-${String(dayOfMonth).padStart(2, "0")}`);
}

/**
 * How many days it is from one day to another, negative going backwards.
 *
 * What lets a Fixed item say whether it falls due soon, and — by the sign
 * alone — whether it is already past its day. Arithmetic in UTC on two days
 * that are days rather than instants, so no zone ever shortens the answer by
 * one: both ends parse as the same hour, and the difference divides exactly.
 */
export function daysBetween(from: CalendarDate, to: CalendarDate): number {
  const A_DAY = 24 * 60 * 60 * 1000;

  return (
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / A_DAY
  );
}

/** The month before this one: `2026-01` comes after `2025-12`. */
export function previousMonth(of: Month): Month {
  return stepped(of, -1);
}

/** The month after this one: `2026-12` is followed by `2027-01`. */
export function nextMonth(of: Month): Month {
  return stepped(of, 1);
}

/** Where a screen reading one month can go from it. */
export type MonthsAround = {
  previous: Month;
  /** The month after, or nothing where there is nothing yet to read. */
  next: Month | null;
};

/**
 * The months either side of the one being read, as far as there is anything to
 * read in them.
 *
 * Backwards is unbounded: a Space has a first month, this does not know which,
 * and an empty month behind you is an honest answer to "what did I spend in
 * March". Forwards stops at the month being lived in, because a Movement is
 * money that has already moved (`recordMovement` refuses a day that has not
 * happened) — so every month past this one is guaranteed empty, and offering
 * them is offering a corridor of blank screens with month names on them.
 *
 * Written `YYYY-MM`, so `>=` compares months the way a calendar orders them.
 */
export function monthsAround(inView: Month, today: Month): MonthsAround {
  return {
    previous: previousMonth(inView),
    next: inView >= today ? null : nextMonth(inView),
  };
}

/**
 * The months either side of the one a plan is being read in — both of them,
 * always.
 *
 * The mirror image of `monthsAround`, and the difference is the whole point.
 * That one stops at the month being lived in because a Movement is money that
 * has already moved, so every month past this one is guaranteed empty. A
 * Budget is the opposite kind of thing: it is what a Space expects to spend,
 * the month after this one is exactly the month a person plans on the 28th,
 * and a plan screen that could not go forwards would be a plan screen you can
 * only use for the month you are already inside.
 *
 * Backwards is unbounded for the same reason it is there: a Space has a first
 * month, this does not know which, and an empty plan behind you is an honest
 * answer to "what did I mean to spend in March".
 */
export function monthsToPlan(inView: Month): MonthsToPlan {
  return { previous: previousMonth(inView), next: nextMonth(inView) };
}

/**
 * Where a screen reading one month's plan can go. Its own type and not
 * `MonthsAround`, because `next` is never nothing here — and a screen made to
 * check for a null that cannot happen is a screen carrying a branch nobody can
 * ever reach or test.
 */
export type MonthsToPlan = { previous: Month; next: Month };

/**
 * A month a given number of months away, which is only ever one either way.
 *
 * Arithmetic on a `Date` in UTC rather than on the two numbers, so December to
 * January carries the year without this having to know that a year has twelve
 * months. `Date.UTC(2026, 12, 1)` is January 2027 and `Date.UTC(2026, -1, 1)`
 * is December 2025; the rollover is the platform's rule and not a second copy
 * of it written here.
 */
function stepped(of: Month, by: number): Month {
  const [year, index] = [Number(of.slice(0, 4)), Number(of.slice(5, 7))];
  const at = new Date(Date.UTC(year, index - 1 + by, 1));

  return month(written(at).slice(0, 7));
}

/** A `Date` written the way a calendar writes it, in UTC. */
function written(date: Date): string {
  return date.toISOString().slice(0, 10);
}
