import { currencyCodes, type CurrencyCode } from "@/domain/money/currency";
import { inReadingOrder, t } from "./index";

/** A currency's name on its own: "Peso argentino". */
function currencyName(code: CurrencyCode): string {
  return t(`currency.${code}`);
}

/**
 * How a currency is named to a person: "Peso argentino (ARS)".
 *
 * The code is on the screen beside the name because the code is what the Space
 * is stored in, what an amount is printed in, and what a second Member will see
 * when they are invited into it. One decision, one place.
 */
export function currencyLabel(code: CurrencyCode): string {
  return `${currencyName(code)} (${code})`;
}

/** A currency as a picker shows it: the code it is stored as, and its label. */
export type ReadableCurrency = {
  code: CurrencyCode;
  label: string;
};

/**
 * Every currency contaro offers, in the order a person reads them, with one
 * optionally lifted to the top.
 *
 * The order lives here and not in the domain for the same reason
 * `readableCatalogue` sorts Categories here: a currency's name is a
 * translation, and `src/domain/` sees only codes. Alphabetical by the name and
 * not by the label, so the code never reaches the comparator — a list that
 * runs from Ottawa to Asunción is one a thumb can predict the position of.
 *
 * `first` is the currency of the country the request came from, and it only
 * ever sorts: the picker still starts on nothing and the person still chooses
 * (ADR-0013). No `first` — no header, or a country whose currency we do not
 * offer — is the ordinary case, and leaves the list alphabetical.
 */
export function readableCurrencies(
  first?: CurrencyCode | null,
): readonly ReadableCurrency[] {
  const alphabetical = [...currencyCodes].sort((a, b) =>
    inReadingOrder(currencyName(a), currencyName(b)),
  );

  const order = first
    ? [first, ...alphabetical.filter((code) => code !== first)]
    : alphabetical;

  return order.map((code) => ({ code, label: currencyLabel(code) }));
}
