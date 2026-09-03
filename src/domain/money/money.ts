import { minorUnits, type CurrencyCode } from "./currency";

/**
 * An amount of money, always attached to the currency it is in.
 *
 * The amount is a whole number of minor units — 1234_50 is $1.234,50 — because
 * a budget that drifts by a cent a month is a budget nobody trusts. There is no
 * bare `number` amount anywhere in the domain, so a figure can never arrive on
 * a screen without saying which money it is (ADR-0001).
 */
export type Money = {
  /** Minor units: centavos, cents. Always a whole number. */
  amount: number;
  currency: CurrencyCode;
};

export function money(amount: number, currency: CurrencyCode): Money {
  if (!Number.isInteger(amount)) {
    throw new RangeError(
      `An amount must be a whole number of minor units; got ${amount}.`,
    );
  }
  return { amount, currency };
}

export function zero(currency: CurrencyCode): Money {
  return money(0, currency);
}

/**
 * The one way an amount reaches a person's eyes.
 *
 * The locale decides the separators and where the symbol goes; the currency is
 * the Space's and is never the locale's guess, which is what keeps every figure
 * in a Space denominated in the same money.
 *
 * It is a list because the reader is a list: a browser states its conventions
 * in order of preference and Intl walks down them, so an unknown locale costs
 * a step rather than a wrong answer (ADR-0014). The domain is handed the
 * locales already read and never the request they came in (ADR-0005).
 */
export function formatMoney(
  { amount, currency }: Money,
  locales: string | readonly string[],
): string {
  const digits = minorUnits(currency);

  return new Intl.NumberFormat(locales, {
    style: "currency",
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amount / 10 ** digits);
}
