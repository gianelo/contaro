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
  money: Money,
  locales: string | readonly string[],
): string {
  return written(money, locales, { style: "currency", currency: money.currency });
}

/**
 * The digits of an amount, without the symbol saying which money it is.
 *
 * Only ever for the second half of a figure whose first half already carries
 * the symbol: "$210.000 / 400.000" is one figure a person reads as "two
 * hundred and ten of four hundred", and a second "$" would make it two
 * amounts standing next to each other. Never on its own — an amount that
 * reaches a person without saying which money it is, is what ADR-0007 exists
 * to prevent, and this narrow exception is written down in its amendment.
 *
 * The separators are the reader's and the minor units are the currency's, so
 * the two halves of the figure are written to the same number of decimals and
 * with the same separators. Anything else and they would not read as one.
 */
export function formatAmount(
  money: Money,
  locales: string | readonly string[],
): string {
  return written(money, locales, { style: "decimal" });
}

/**
 * The one place minor units become the digits a person reads.
 *
 * Written once because the two above differ in exactly one thing — whether
 * the symbol comes along — and a second copy of "the decimals are the
 * currency's, the separators are the reader's" is a second place for the two
 * halves of "$210.000 / 400.000" to start disagreeing about either.
 */
function written(
  { amount, currency }: Money,
  locales: string | readonly string[],
  how: Intl.NumberFormatOptions,
): string {
  const digits = minorUnits(currency);

  return new Intl.NumberFormat(locales, {
    ...how,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amount / 10 ** digits);
}
