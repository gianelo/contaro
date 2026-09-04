import { describe, expect, it } from "vitest";
import { fallbackNumberLocale, numberLocalesFrom } from "./number-locale";

describe("the locales a reader reads numbers under", () => {
  it("falls back when the request says nothing about the reader", () => {
    expect(numberLocalesFrom(null)).toEqual([fallbackNumberLocale]);
    expect(numberLocalesFrom(undefined)).toEqual([fallbackNumberLocale]);
    expect(numberLocalesFrom("")).toEqual([fallbackNumberLocale]);
    expect(numberLocalesFrom("   ")).toEqual([fallbackNumberLocale]);
  });

  it("puts what the browser asked for ahead of the fallback", () => {
    expect(numberLocalesFrom("es-MX")).toEqual(["es-MX", fallbackNumberLocale]);
  });

  it("always offers the fallback, so there is always an answer", () => {
    // Last, unless the reader named it themselves — then it stays where they
    // ranked it, because they said more about it than we know.
    const headers = [
      "es-MX",
      "en-US,en;q=0.9",
      "*",
      "nonsense",
      "",
      // The reader naming the fallback themselves, which is the case the
      // second half of the comment above is about. It is drilled into below.
      "es-CO,en",
    ];

    for (const header of headers) {
      expect(numberLocalesFrom(header)).toContain(fallbackNumberLocale);
    }

    expect(numberLocalesFrom("en-US,en;q=0.9").at(-1)).toBe(
      fallbackNumberLocale,
    );
    expect(numberLocalesFrom("es-CO,en")).toEqual(["es-CO", "en"]);
  });

  it("reads the browser's order of preference, not the order it wrote them in", () => {
    expect(numberLocalesFrom("es;q=0.5, es-MX;q=0.9")).toEqual([
      "es-MX",
      "es",
      fallbackNumberLocale,
    ]);
  });

  it("treats a tag with no weight as the most wanted one", () => {
    // q defaults to 1, which outranks every tag that bothered to say a number.
    expect(numberLocalesFrom("es-419, es-MX;q=0.9")).toEqual([
      "es-419",
      "es-MX",
      fallbackNumberLocale,
    ]);
  });

  it("keeps the header's own order between tags that want the same thing", () => {
    expect(numberLocalesFrom("es-MX;q=0.8, es-AR;q=0.8, en;q=0.8")).toEqual([
      "es-MX",
      "es-AR",
      "en",
      fallbackNumberLocale,
    ]);
  });

  it("drops a tag the reader explicitly refused", () => {
    expect(numberLocalesFrom("en;q=0, es-MX")).toEqual([
      "es-MX",
      fallbackNumberLocale,
    ]);
  });

  it("drops the wildcard, which names no conventions at all", () => {
    expect(numberLocalesFrom("*")).toEqual([fallbackNumberLocale]);
    expect(numberLocalesFrom("es-MX, *;q=0.1")).toEqual([
      "es-MX",
      fallbackNumberLocale,
    ]);
  });

  it("ignores a tag that is not a language tag, because a header is not code", () => {
    expect(numberLocalesFrom("español, es-MX")).toEqual([
      "es-MX",
      fallbackNumberLocale,
    ]);
    expect(numberLocalesFrom("!!!, ---")).toEqual([fallbackNumberLocale]);
  });

  it("reads a tag however the browser cased and spaced it", () => {
    expect(numberLocalesFrom("  ES-mx ; q=0.9 ,  ES  ")).toEqual([
      "es",
      "es-MX",
      fallbackNumberLocale,
    ]);
  });

  it("names a locale once, however many times the header does", () => {
    expect(numberLocalesFrom("es-MX, ES-MX;q=0.5, es-mx;q=0.1")).toEqual([
      "es-MX",
      fallbackNumberLocale,
    ]);
    expect(numberLocalesFrom("es-CO")).toEqual([fallbackNumberLocale]);
  });

  it("stops reading a header long enough to be an attack", () => {
    const letters = "abcdefghijklmnopqrstuvwxyz";
    const flood = [...letters]
      .flatMap((a) => [...letters].map((b) => `es-${a}${b}`))
      .join(",");

    expect(numberLocalesFrom(flood).length).toBeLessThanOrEqual(11);
  });

  it("keeps a tag whose weight is broken, rather than the reader's answer", () => {
    // The tag is a plain statement about how someone reads. Throwing it away
    // over an unreadable parameter is the silent inversion #24 exists to
    // close, so a `q` nobody can parse is read as one that was never there.
    for (const broken of ["es-MX;q=", "es-MX;q", "es-MX;q=zzz", "es-MX;q="]) {
      expect(numberLocalesFrom(broken)).toEqual([
        "es-MX",
        fallbackNumberLocale,
      ]);
    }

    // A weight that really parses and really is zero still means "not this".
    expect(numberLocalesFrom("es-MX;q=0")).toEqual([fallbackNumberLocale]);

    // And one outside the range it is allowed is pulled back into it rather
    // than let outrank a tag that asked properly.
    expect(numberLocalesFrom("es-MX;q=1.5, es-AR")).toEqual([
      "es-MX",
      "es-AR",
      fallbackNumberLocale,
    ]);
  });

  it("takes the conventions of a tag and never the rest of it", () => {
    // `-u-nu-thai` is a well-formed thing to send and it changes the digits
    // themselves: "ARS ๑,๒๓๔.๕๐". ADR-0014 gives a header the separators and
    // nothing else, so the extension subtags are dropped.
    expect(numberLocalesFrom("es-MX-u-nu-thai")).toEqual([
      "es-MX",
      fallbackNumberLocale,
    ]);
    expect(numberLocalesFrom("es-CO-u-nu-hanidec")).toEqual([
      fallbackNumberLocale,
    ]);
    expect(numberLocalesFrom("es-MX-x-whatever")).toEqual([
      "es-MX",
      fallbackNumberLocale,
    ]);
  });

  it("never returns a locale Intl refuses, whatever the header says", () => {
    const headers = [
      "es-MX",
      "español",
      "*",
      "en-US,en;q=0.9,es;q=0.8",
      "x",
      "-",
      "e".repeat(300),
      "es-MX;q=1.0;extra=nope",
    ];

    for (const header of headers) {
      const locales = numberLocalesFrom(header);
      expect(() => new Intl.NumberFormat(locales)).not.toThrow();
    }
  });
});
