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
  /**
   * Whether it has been closed, and so behaves differently once opened (#119).
   *
   * The second per-row state this list has ever carried, and it is not a
   * variation on the first: `inView` is about where the reader is standing,
   * this is about what they will find when they land. A person sent into a
   * closed month unwarned discovers the missing controls by reaching for one.
   */
  closed: boolean;
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
/**
 * The earliest month the pill offers, and so how far back a screen has to ask
 * about closed ones (#119).
 *
 * Here rather than worked out inside each reader, for the same reason
 * `monthChoices` is one function: the question and the list it marks have to
 * cover the same stretch. A reader that asked over a shorter one would leave
 * the top of the sheet unmarked, and unmarked in that list reads as open.
 */
export function earliestOffered(inView: Month): Month {
  const [earliest] = monthsToPlan(inView);

  // `monthsToPlan` returns fourteen months and never none, so this is the
  // window's first and not a fallback anybody is meant to reach.
  return earliest ?? inView;
}

export function monthChoices(
  inView: Month,
  today: Month,
  closed: ReadonlySet<string>,
): readonly ReadableMonthChoice[] {
  return monthsToPlan(inView).map((offered) => ({
    month: offered,
    label: monthLabel(offered, today),
    inView: offered === inView,
    // A set of plain strings and not of `Month`s, which is what
    // `closedMonthsFrom` hands back and for the reason it gives: a
    // `Set<Month>` is a set nothing can look a month up in without a cast.
    closed: closed.has(offered),
  }));
}
