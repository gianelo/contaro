import { describe, expect, it } from "vitest";
import { formatMoney, money } from "@/domain/money/money";
import { fallbackNumberLocale } from "@/i18n/number-locale";
import { dayIn, fallbackTimeZone } from "@/i18n/time-zone";
import { numberLocalesFor, timeZoneFor, todayFor } from "./reader";

const from = (acceptLanguage?: string) =>
  new Headers(acceptLanguage ? { "accept-language": acceptLanguage } : {});

/**
 * Intl separates the symbol from the digits with a non-breaking space, which
 * is invisible in a diff. Normalising it keeps these expectations readable
 * without pretending the character is not there.
 */
const readable = (text: string) => text.replace(/[\u00a0\u202f]/g, " ");

describe("the conventions a request is read under", () => {
  it("takes them from the language the browser asked for", () => {
    expect(numberLocalesFor(from("es-MX,es;q=0.9"))[0]).toBe("es-MX");
  });

  it("falls back when a request says nothing about its reader", () => {
    expect(numberLocalesFor(from())).toEqual([fallbackNumberLocale]);
  });

  it("does not ask where the request came from, only how it reads", () => {
    // ADR-0013 keeps geolocation to ordering a picker. A VPN or a holiday
    // that reorders a list is an annoyance; one that inverts the separators
    // of every figure is the silent error this ticket exists to close.
    const travelling = new Headers({
      "accept-language": "es-AR",
      "x-vercel-ip-country": "MX",
    });

    expect(numberLocalesFor(travelling)[0]).toBe("es-AR");
  });
});

describe("what two Members of one Space are shown", () => {
  const rent = money(12_345_50, "MXN");

  it("writes the same amount the way each of them reads numbers", () => {
    const mexican = readable(
      formatMoney(rent, numberLocalesFor(from("es-MX"))),
    );
    const argentine = readable(
      formatMoney(rent, numberLocalesFor(from("es-AR"))),
    );

    expect(mexican).toBe("$12,345.50");
    expect(argentine).toBe("MXN 12.345,50");
  });

  it("never lets one reader see two currencies written the same way", () => {
    // ADR-0001: only the separators are the reader's, never the money. Intl
    // spells a currency that is not the reader's own with its code, so the
    // bare symbol can only mean the one money that reader would read it as.
    const readers = ["es-MX", "es-AR", "es-419", "en-US", "pt-BR", "es-ES"];

    for (const reader of readers) {
      const locales = numberLocalesFor(from(reader));
      const shown = new Set(
        (["MXN", "ARS", "USD", "CAD"] as const).map((currency) =>
          formatMoney(money(12_345_50, currency), locales),
        ),
      );

      expect(shown.size, `${reader} cannot tell them apart`).toBe(4);
    }
  });
});

describe("where a request says its Reader is standing", () => {
  it("takes the zone the edge states", () => {
    const fromBogota = new Headers({ "x-vercel-ip-timezone": "America/Bogota" });

    expect(timeZoneFor(fromBogota)).toBe("America/Bogota");
  });

  it("falls back to where the Members are when a request says nothing", () => {
    // The case the fallback exists for. A request with no zone on it is read
    // as Colombian, which is the one answer that is right for the people
    // actually using this (ADR-0018).
    expect(timeZoneFor(new Headers())).toBe(fallbackTimeZone);
    expect(timeZoneFor(new Headers())).toBe("America/Bogota");
  });

  it("still names the Reader's day, and not Greenwich's, with no header at all", () => {
    // Ten at night in Bogota on the 3rd, which UTC already calls the 4th. The
    // fallback has to carry that or it is a fallback in name only.
    const atNight = new Date("2026-09-04T03:00:00Z");

    expect(dayIn(timeZoneFor(new Headers()), atNight)).toBe("2026-09-03");
  });

  it("drops a zone no calendar has rather than failing to render", () => {
    const junk = new Headers({ "x-vercel-ip-timezone": "Mars/Olympus_Mons" });

    expect(timeZoneFor(junk)).toBe(fallbackTimeZone);
  });

  it("reads the zone and the separators as two separate questions", () => {
    // A Member who reads numbers the Argentine way, sitting in Colombia. The
    // header states how they read; the zone states where they are. ADR-0014
    // answers the first and ADR-0018 the second, and neither answers both.
    const there = new Headers({
      "accept-language": "es-AR",
      "x-vercel-ip-timezone": "America/Bogota",
    });

    expect(numberLocalesFor(there)[0]).toBe("es-AR");
    expect(timeZoneFor(there)).toBe("America/Bogota");
  });
});

describe("the day a request's Reader is standing in", () => {
  const inZone = (zone: string) =>
    new Headers({ "x-vercel-ip-timezone": zone });

  it("really reads the header, whatever hour it is run at", () => {
    // Kiritimati is UTC+14 and Midway is UTC-11, twenty-five hours apart, so
    // there is no instant at which the two are on the same day. A `todayFor`
    // that ignored the header would answer both the same and fail here at
    // every hour rather than at some of them.
    expect(todayFor(inZone("Pacific/Kiritimati"))).not.toBe(
      todayFor(inZone("Pacific/Midway")),
    );
  });

  it("names a day the calendar has", () => {
    expect(todayFor(new Headers())).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("is the fallback zone's day when a request carries no zone", () => {
    expect(todayFor(new Headers())).toBe(dayIn(fallbackTimeZone));
  });
});
