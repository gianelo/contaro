import { describe, expect, it } from "vitest";
import { formatMoney, money } from "@/domain/money/money";
import { fallbackNumberLocale } from "@/i18n/number-locale";
import { numberLocalesFor } from "./reader";

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
