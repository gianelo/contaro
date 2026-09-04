import { describe, expect, it } from "vitest";
import { formatMoney, money } from "@/domain/money/money";
import { fallbackNumberLocale } from "@/i18n/number-locale";
import { dayIn } from "@/i18n/time-zone";
import { numberLocalesFor, readerOf, todayFor } from "./reader";

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

describe("the Reader a request is being read by", () => {
  it("carries both halves of them, and they are separate questions", () => {
    // A Member who reads numbers the Argentine way, sitting in Colombia. The
    // language header states how they read; the zone states where they are.
    // ADR-0014 answers the first and ADR-0018 the second, and neither answers
    // both -- which is exactly why one Reader holds two things.
    // Deliberately not Bogota, which is the zone a request with no header
    // falls through to: an example that happens to equal the fallback proves
    // the header was read only by accident.
    const there = new Headers({
      "accept-language": "es-AR",
      "x-vercel-ip-timezone": "Pacific/Kiritimati",
    });
    const reader = readerOf(there);

    expect(reader.locales[0]).toBe("es-AR");
    expect(reader.today).toBe(dayIn("Pacific/Kiritimati"));
  });

  it("says the same as asking for each half on its own", () => {
    const requested = new Headers({ "accept-language": "es-MX" });
    const reader = readerOf(requested);

    expect(reader.locales).toEqual(numberLocalesFor(requested));
    expect(reader.today).toBe(todayFor(requested));
  });

  it("falls back on both halves when a request says nothing at all", () => {
    // The case the fallbacks exist for: no language and no zone. The
    // separators are Colombian and so is the day (ADR-0014, ADR-0018).
    const reader = readerOf(new Headers());

    expect(reader.locales).toEqual([fallbackNumberLocale]);
    expect(reader.today).toBe(dayIn("America/Bogota"));
  });

  it("is read from a zone no calendar has without failing to render", () => {
    const junk = new Headers({ "x-vercel-ip-timezone": "Mars/Olympus_Mons" });

    expect(readerOf(junk).today).toBe(dayIn("America/Bogota"));
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

  it("is Bogota's day when a request carries no zone", () => {
    // Written out rather than compared to `fallbackTimeZone`, which would be
    // the constant measured against itself and true whatever it held. That the
    // constant is Bogota, and why, is `time-zone.test.ts`.
    expect(todayFor(new Headers())).toBe(dayIn("America/Bogota"));
  });
});
