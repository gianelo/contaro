import type { CalendarDate } from "@/domain/calendar/month";
import { numberLocalesFrom } from "@/i18n/number-locale";
import { dayIn, timeZoneFrom } from "@/i18n/time-zone";

/** What the browser states about the language its reader reads. */
const LANGUAGE_HEADER = "accept-language";

/** What the edge states about where the request came from. */
const TIME_ZONE_HEADER = "x-vercel-ip-timezone";

/**
 * The conventions this request's Reader reads numbers under.
 *
 * The seam #24 is proven at, and the same shape #23 uses for the country: the
 * header arrives as a `Headers` rather than being read from Next here, so the
 * whole path — header to locale to the separators on the screen — is driven
 * without a server.
 *
 * Only the separators are the reader's. The currency stays the Space's, which
 * `formatMoney` takes from the `Money` and never from this (ADR-0001).
 */
export function numberLocalesFor(headers: Headers): readonly string[] {
  return numberLocalesFrom(headers.get(LANGUAGE_HEADER));
}

/**
 * The zone this request's Reader is standing in, which is what decides what
 * day they mean by "hoy".
 *
 * Beside the language read above and in the same shape: the header arrives as
 * a `Headers` here and the deciding is done by a pure function, so the whole
 * path -- header to zone to the word at the top of a list -- is driven with no
 * server, and the domain never sees a request (ADR-0005).
 *
 * It is geolocation answering something, which ADR-0013 appears to forbid.
 * ADR-0018 records why it does not: what ADR-0013 forbids is a guess making a
 * decision nobody can undo, and a heading is corrected by the next request.
 */
function timeZoneFor(headers: Headers): string {
  return timeZoneFrom(headers.get(TIME_ZONE_HEADER));
}

/**
 * The day it is where this request's Reader is standing: what they mean by
 * "hoy", and what every screen that names a day is measured against.
 *
 * The two halves above are separate because they answer separate questions,
 * and this is the one every caller actually asks. Four screens wanted the zone
 * only to turn it straight into a day, and four copies of that turn is four
 * places for one of them to reach for the server's clock again.
 */
export function todayFor(headers: Headers): CalendarDate {
  return dayIn(timeZoneFor(headers));
}

/**
 * The person a screen is being written for, and the two things about them a
 * screen needs to know.
 *
 * `CONTEXT.md` has named this since ADR-0014 and it named the day too once
 * ADR-0018 landed; the code carried the two as unrelated arguments that
 * happened to travel together everywhere. One term in the glossary and two
 * parameters in the code is a gap that only ever widens, because the third
 * thing that turns out to be the Reader's gets added as a third argument.
 *
 * What is deliberately *not* here: the currency, which is the Space's and
 * never the Reader's (ADR-0001), and the bound on how late a day may be, which
 * stays on the server's clock for the reason ADR-0018 gives. Both are about a
 * screen and neither belongs to the person reading it.
 */
export type Reader = {
  /** The separators an amount is written with, most wanted first. */
  locales: readonly string[];
  /** The day they are standing in, which is what they mean by "hoy". */
  today: CalendarDate;
};

/** The Reader a request is being read by, from what the request says. */
export function readerOf(headers: Headers): Reader {
  return { locales: numberLocalesFor(headers), today: todayFor(headers) };
}
