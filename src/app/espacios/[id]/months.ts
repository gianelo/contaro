import type { Month } from "@/domain/calendar/month";
import { monthsToPlan } from "@/domain/calendar/month";
import { monthLabel } from "@/i18n/day";

/** One month the pill at the top of a Space's screen offers (#40). */
export type ReadableMonthChoice = {
  month: Month;
  /** The month as a person reads it: "Septiembre", "Enero de 2027". */
  label: string;
  /** Whether it is the month the screen is currently showing. */
  inView: boolean;
};

/**
 * Every month the pill can be moved to, named the way a person reads them.
 *
 * One function and not a map inside each reader, because the two screens that
 * draw the pill have to offer the same months (#61): the plan and the month's
 * list are two readings of one month, and a control that reached different
 * months depending on which tab a thumb is on is a control nobody can predict.
 * Two copies of this map would only promise that; one makes it true.
 *
 * It lives here, a directory above both readers, for the reason `MonthPill`
 * does: the ledger's head importing the Budget's reader to render would make
 * the month's list depend on the plan.
 *
 * The window is `monthsToPlan`'s, forwards included, on both screens. The old
 * `‹ Septiembre ›` walker stopped at the month being lived in because every
 * step forward was a screen load landing on a month guaranteed empty. A picker
 * charges nothing for a row nobody taps, so the bound that made sense for a
 * walker stopped making sense with it (ADR-0039 corrects ADR-0033 on this).
 *
 * `today` is the Reader's month and never the server's: it decides only how a
 * month is *written*, so that the year appears exactly where it is not the
 * year the reader is standing in (ADR-0018).
 */
export function monthChoices(
  inView: Month,
  today: Month,
): readonly ReadableMonthChoice[] {
  return monthsToPlan(inView).map((offered) => ({
    month: offered,
    label: monthLabel(offered, today),
    inView: offered === inView,
  }));
}
