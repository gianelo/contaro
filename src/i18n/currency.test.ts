import { describe, expect, it } from "vitest";
import { currencyCodes } from "@/domain/money/currency";
import { locale } from "./index";
import { currencyLabel, readableCurrencies } from "./currency";

describe("naming a currency to a person", () => {
  it("puts the code beside the name, because the code is what a Space is stored in", () => {
    expect(currencyLabel("ARS")).toBe("Peso argentino (ARS)");
  });

  it("names every currency the domain offers", () => {
    for (const code of currencyCodes) {
      expect(currencyLabel(code)).not.toContain("currency.");
    }
  });
});

describe("the currencies a picker offers", () => {
  it("offers all of them and nothing else", () => {
    expect(readableCurrencies().map((currency) => currency.code).sort()).toEqual(
      [...currencyCodes].sort(),
    );
  });

  it("orders them by the name a person reads, not by the code", () => {
    const names = readableCurrencies().map((currency) => currency.label);

    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, locale)));
  });

  it("is not the domain's order in disguise", () => {
    const shown = readableCurrencies().map((currency) => currency.code);

    // By code ARS comes first; by name "Euro" comes before "Peso argentino".
    expect(shown.indexOf("EUR")).toBeLessThan(shown.indexOf("ARS"));
  });
});

describe("lifting the currency of the country a request came from", () => {
  it("shows it first", () => {
    const shown = readableCurrencies("COP").map((currency) => currency.code);

    expect(shown[0]).toBe("COP");
  });

  it("leaves everything under it in the order a person reads", () => {
    const rest = readableCurrencies("COP")
      .slice(1)
      .map((currency) => currency.label);

    expect(rest).toEqual([...rest].sort((a, b) => a.localeCompare(b, locale)));
  });

  it("still offers all of them and nothing twice", () => {
    const shown = readableCurrencies("COP").map((currency) => currency.code);

    expect([...shown].sort()).toEqual([...currencyCodes].sort());
  });

  it("changes nothing when the country is unknown", () => {
    // The header is missing, or names a country whose currency we do not
    // offer. Both arrive here as nothing, and nothing is not a failure.
    expect(readableCurrencies(null)).toEqual(readableCurrencies());
  });

  it("does not move a currency that already reads first", () => {
    const alphabetical = readableCurrencies().map((currency) => currency.code);

    expect(readableCurrencies(alphabetical[0]).map((c) => c.code)).toEqual(
      alphabetical,
    );
  });
});
