import { describe, expect, it } from "vitest";
import { readableCurrencies } from "@/i18n/currency";
import { currencyChoicesFor } from "./currencies";

const from = (country?: string) =>
  new Headers(country ? { "x-vercel-ip-country": country } : {});

const alphabetical = readableCurrencies().map((currency) => currency.code);
const codesOf = (choices: readonly { value: string }[]) =>
  choices.map((choice) => choice.value);

describe("the currencies the creation screen offers", () => {
  it("puts the currency of the country the request came from first", () => {
    expect(codesOf(currencyChoicesFor(from("CO")))[0]).toBe("COP");
  });

  it("leaves the list alphabetical when the request carries no country", () => {
    expect(codesOf(currencyChoicesFor(from()))).toEqual(alphabetical);
  });

  it("leaves the list alphabetical for a country whose currency we do not offer", () => {
    expect(codesOf(currencyChoicesFor(from("JP")))).toEqual(alphabetical);
  });

  it("names each one the way the picker names it", () => {
    const choice = currencyChoicesFor(from("CO"))[0];

    expect(choice).toEqual({ value: "COP", label: "Peso colombiano (COP)" });
  });
});
