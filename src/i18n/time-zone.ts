import { calendarDate, type CalendarDate } from "@/domain/calendar/month";

/**
 * Where a Reader is standing when a request says nothing about it.
 *
 * Colombian, because that is where contaro's Members are and a fallback has to
 * be somebody's. It is a last resort and not a default: a request that says
 * where its Reader is is never read with this (ADR-0018).
 *
 * UTC was rejected for the reason ADR-0014 rejected plain "es" — it looks like
 * the neutral choice and is not one. UTC is Greenwich, and choosing it is
 * choosing London with none of the reasons there are for choosing Bogota.
 */
export const fallbackTimeZone = "America/Bogota";

/**
 * The zone a request states its Reader is in, or the one we fall back to.
 *
 * A time zone is the one guess contaro makes that is aimed at the thing it is
 * a guess about: where a body is standing is exactly what a day depends on,
 * which is why ADR-0018 answers with geolocation where ADR-0014 refused to
 * (there, the question was how a person reads, and a header states that).
 *
 * A name `Intl` does not know is dropped rather than thrown, the way a
 * malformed `Accept-Language` is: a header is not code, and a proxy sending
 * junk must not be a screen that will not render.
 */
export function timeZoneFrom(named: string | null | undefined): string {
  const asked = named?.trim();
  if (!asked) return fallbackTimeZone;

  try {
    // Asked of `Intl` rather than matched against a list, because the list of
    // zones is the platform's and a copy of it here would go stale the first
    // time one is renamed. `resolvedOptions` also hands back the canonical
    // spelling, so a zone that has been renamed arrives under one name.
    return new Intl.DateTimeFormat(undefined, { timeZone: asked })
      .resolvedOptions().timeZone;
  } catch {
    return fallbackTimeZone;
  }
}

/**
 * The day it currently is in a zone, as the calendar writes it.
 *
 * The whole point of the exercise: an instant is one thing everywhere and a
 * day is not. Three in the morning UTC is still the night before in Bogota,
 * and it is that earlier day a person there means by "hoy".
 *
 * Assembled from the parts rather than read off a formatted string, because
 * every locale that writes a date writes it in its own order — a formatter
 * asked for a date in `en-US` answers "09/03/2026", and slicing that into
 * `YYYY-MM-DD` is a rule about American punctuation hiding in a date function.
 */
export function dayIn(zone: string, at: Date = new Date()): CalendarDate {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(at);

  const written = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return calendarDate(
    `${written("year")}-${written("month")}-${written("day")}`,
  );
}
