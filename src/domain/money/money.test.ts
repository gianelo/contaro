import { describe, expect, it } from "vitest";
import { formatMoney, money, zero } from "./money";

/**
 * Intl separates the symbol from the digits with a non-breaking space, which
 * is invisible in a diff. Normalising it keeps these expectations readable
 * without pretending the character is not there.
 */
const readable = (text: string) => text.replace(/[\u00a0\u202f]/g, " ");

describe("money", () => {
  it("is an amount in minor units, in one currency", () => {
    expect(money(123_45, "ARS")).toEqual({ amount: 123_45, currency: "ARS" });
  });

  it("refuses an amount that is not a whole number of minor units", () => {
    expect(() => money(10.5, "ARS")).toThrow(/whole/i);
  });

  it("refuses an amount that is not a number at all", () => {
    expect(() => money(Number.NaN, "ARS")).toThrow();
    expect(() => money(Number.POSITIVE_INFINITY, "ARS")).toThrow();
  });

  it("starts a currency at nothing", () => {
    expect(zero("ARS")).toEqual({ amount: 0, currency: "ARS" });
  });
});

describe("formatting an amount", () => {
  it("shows it in the currency it is in", () => {
    expect(readable(formatMoney(money(1234_50, "ARS"), "es-AR"))).toBe(
      "$ 1.234,50",
    );
  });

  it("tells two currencies apart, so a number never means two things", () => {
    const shown = readable(formatMoney(money(1234_50, "USD"), "es-AR"));

    expect(shown).toBe("US$ 1.234,50");
    expect(shown).not.toBe(readable(formatMoney(money(1234_50, "ARS"), "es-AR")));
  });

  it("shows a currency with no minor units without decimals", () => {
    expect(readable(formatMoney(money(1235, "CLP"), "es-AR"))).toBe("CLP 1.235");
  });

  it("shows nothing spent as nothing, rather than as an empty screen", () => {
    expect(readable(formatMoney(zero("ARS"), "es-AR"))).toBe("$ 0,00");
  });

  it("keeps the sign of money that went the other way", () => {
    expect(readable(formatMoney(money(-500, "ARS"), "es-AR"))).toContain("-");
  });
});
