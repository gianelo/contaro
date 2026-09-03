import { describe, expect, it } from "vitest";
import { currencyCodes } from "./currency";
import { countriesWithACurrency, currencyOfCountry } from "./country";

describe("the currency a country keeps its money in", () => {
  it("answers with the currency of a country it names", () => {
    expect(currencyOfCountry("CO")).toBe("COP");
    expect(currencyOfCountry("MX")).toBe("MXN");
    expect(currencyOfCountry("CA")).toBe("CAD");
    expect(currencyOfCountry("AR")).toBe("ARS");
  });

  it("answers with the euro for a country that keeps its money in euros", () => {
    expect(currencyOfCountry("ES")).toBe("EUR");
    expect(currencyOfCountry("DE")).toBe("EUR");
  });

  it("answers with the dollar for a country that keeps its money in dollars", () => {
    // Not only the United States: a Space created in Quito, San Salvador or
    // Panama City is created in dollars, because that is the money there.
    expect(currencyOfCountry("EC")).toBe("USD");
    expect(currencyOfCountry("SV")).toBe("USD");
    expect(currencyOfCountry("PA")).toBe("USD");
  });

  it("answers nothing for a country whose currency contaro does not offer", () => {
    // Not an error: a Japanese request gets the alphabetical list, which is
    // exactly what it got before anybody looked at where it came from.
    expect(currencyOfCountry("JP")).toBeNull();
  });

  it("answers nothing when the country is unknown", () => {
    expect(currencyOfCountry(null)).toBeNull();
    expect(currencyOfCountry(undefined)).toBeNull();
    expect(currencyOfCountry("")).toBeNull();
  });

  it("reads a country the way a header writes it, in any case and with padding", () => {
    // Unlike `isCurrencyCode`, whose callers are ours: this one's caller is an
    // edge copying a string out of an HTTP header, and a header is not code.
    expect(currencyOfCountry("co")).toBe("COP");
    expect(currencyOfCountry(" CO ")).toBe("COP");
  });

  it("is not fooled by a string that is not a country at all", () => {
    expect(currencyOfCountry("XX")).toBeNull();
    expect(currencyOfCountry("ARGENTINA")).toBeNull();
    expect(currencyOfCountry("toString")).toBeNull();
  });

  it("points only at currencies the catalogue offers", () => {
    // The map points into the catalogue (ADR-0012). A country pointing at a
    // code no Space could ever be created in would be a picker offering it.
    for (const country of countriesWithACurrency) {
      expect(currencyCodes).toContain(currencyOfCountry(country));
    }
  });

  it("names countries and not something shaped like one", () => {
    // The map is keyed by hand, and `satisfies Record<string, CurrencyCode>`
    // checks only the values: "ESP" or "CCO" would typecheck and then match
    // no header ever sent. This is what catches that.
    for (const country of countriesWithACurrency) {
      expect(country).toMatch(/^[A-Z]{2}$/);
    }
  });

  it("names the country of every currency it offers, so no currency is unreachable", () => {
    const reachable = new Set(
      countriesWithACurrency.map((country) => currencyOfCountry(country)),
    );

    expect([...currencyCodes].sort()).toEqual([...reachable].sort());
  });
});
