import { describe, expect, it } from "vitest";
import { formatAmount, formatMoney, money, moneyParts, zero } from "./money";

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

  it("shows a Colombian peso without centavos, because nobody there types them", () => {
    expect(readable(formatMoney(money(1_234_567, "COP"), "es-AR"))).toBe(
      "COP 1.234.567",
    );
  });

  it("shows a Mexican peso with its centavos", () => {
    expect(readable(formatMoney(money(1234_50, "MXN"), "es-AR"))).toBe(
      "MXN 1.234,50",
    );
  });

  it("tells the two dollars apart without extra copy", () => {
    const canadian = readable(formatMoney(money(1234_50, "CAD"), "es-AR"));

    expect(canadian).toBe("CAD 1.234,50");
    expect(canadian).not.toBe(readable(formatMoney(money(1234_50, "USD"), "es-AR")));
  });

  it("shows nothing spent as nothing, rather than as an empty screen", () => {
    expect(readable(formatMoney(zero("ARS"), "es-AR"))).toBe("$ 0,00");
  });

  it("keeps the sign of money that went the other way", () => {
    expect(readable(formatMoney(money(-500, "ARS"), "es-AR"))).toContain("-");
  });
});

describe("formatting an amount for a reader who could be anywhere", () => {
  it("takes the first of the reader's locales it knows how to write", () => {
    // Intl walks the list, so an unknown locale costs nothing but a step.
    expect(readable(formatMoney(money(1234_50, "MXN"), ["zz-ZZ", "es-MX"]))).toBe(
      "$1,234.50",
    );
  });

  it("writes one amount two ways for two readers, and never two amounts", () => {
    const rent = money(1234_50, "MXN");

    expect(readable(formatMoney(rent, ["es-MX"]))).toBe("$1,234.50");
    expect(readable(formatMoney(rent, ["es-AR"]))).toBe("MXN 1.234,50");
  });
});

describe("the half of a figure that carries no symbol", () => {
  // "$210.000 / 400.000" is one figure and not two: the symbol in front of it
  // says which money both halves are in, and repeating it would read as two
  // separate amounts sitting next to each other.
  it("writes the amount in the reader's separators and nothing else", () => {
    expect(formatAmount(money(400_000_00, "ARS"), "es-AR")).toBe("400.000,00");
  });

  it("keeps the same number of minor units the figure beside it has", () => {
    // Chilean pesos have none. A trailing ",00" here would be two decimals
    // the amount in front of it does not have.
    expect(formatAmount(money(400_000, "CLP"), "es-CL")).toBe("400.000");
  });

  it("is written the way its reader reads numbers, as every amount is", () => {
    expect(formatAmount(money(400_000_00, "ARS"), "en-US")).toBe("400,000.00");
  });
});

/**
 * The entry screen writes one figure at two sizes: the symbol quiet, the
 * digits loud (#37). That is still one figure carrying its symbol, which is
 * what ADR-0007 asks of anything a person reads -- but only if the two halves
 * are cut from the same formatting.
 */
describe("a figure split into the symbol and the digits", () => {
  it("hands back both halves of what formatMoney writes whole", () => {
    const { symbol, amount } = moneyParts(money(1_284_00, "ARS"), "es-AR");

    expect(symbol).toBe("$");
    expect(amount).toBe("1.284,00");
  });

  it("cuts both halves from one formatting, so they cannot disagree", () => {
    // The separators are the reader's and the decimals are the currency's. Two
    // calls could drift apart on either; one call cannot.
    const whole = formatMoney(money(1_284_00, "ARS"), "en-US");
    const { symbol, amount } = moneyParts(money(1_284_00, "ARS"), "en-US");

    expect(whole).toContain(symbol);
    expect(whole).toContain(amount);
  });

  it("gives a currency with no minor units none in either half", () => {
    const { symbol, amount } = moneyParts(money(400_000, "CLP"), "es-CL");

    expect(symbol).toBe("$");
    expect(amount).toBe("400.000");
  });

  it("says which money it is even where the symbol is more than a sign", () => {
    // A reader whose own money is also written "$" is told whose this is.
    const { symbol } = moneyParts(money(1_284_00, "COP"), "en-US");

    expect(symbol).toBe("COP");
  });
});
