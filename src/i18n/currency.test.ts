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
