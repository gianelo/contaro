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

/** One figure, cut in two where the symbol ends and the digits begin. */
export type MoneyParts = {
  /** What says which money this is: "$", "COP", whatever the reader gets. */
  readonly symbol: string;
  /** The digits, with the reader's separators and the currency's decimals. */
  readonly amount: string;
};

/**
 * The two halves of what `formatMoney` writes whole.
 *
 * The entry screen draws one figure at two sizes -- the symbol quiet and small,
 * the digits loud -- because the digits are what a person is watching
 * themselves type and the symbol is not (#37). That is still a figure carrying
 * its symbol, so it is not the bare amount ADR-0007 forbids; it is one figure
 * set in two type sizes.
 *
 * Cut from a single `formatToParts` rather than assembled from two calls. The
 * separators are the reader's and the decimals are the currency's, and two
 * formattings are two chances for the halves to disagree about either -- the
 * same reason `formatMoney` and `formatAmount` share one `written` below.
 *
 * The symbol is whatever the reader's own conventions make it, which is why it
 * is read back out of the formatting rather than kept in a table here: a
 * Colombian Space read by somebody in the United States says "COP" and not
 * "$", because to that reader a bare "$" would say dollars.
 */
export function moneyParts(
  money: Money,
  locales: string | readonly string[],
): MoneyParts {
  const parts = partsOf(money, locales, {
    style: "currency",
    currency: money.currency,
  });

  const symbol = parts
    .filter(({ type }) => type === "currency")
    .map(({ value }) => value)
    .join("");

  // Everything that is not the symbol, in the order it was written, so a
  // locale that puts the symbol at the end or slips a space beside it loses
  // neither its digits nor its separators.
  const amount = parts
    .filter(({ type }) => type !== "currency" && type !== "literal")
    .map(({ value }) => value)
    .join("");

  return { symbol, amount };
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
  money: Money,
  locales: string | readonly string[],
  how: Intl.NumberFormatOptions,
): string {
  return partsOf(money, locales, how)
    .map(({ value }) => value)
    .join("");
}

/**
 * The same figure, before it is joined into a string.
 *
 * `written` is this plus a join, so a screen that needs the halves and a
 * screen that needs the whole are reading one decision about decimals and
 * separators rather than two.
 */
function partsOf(
  { amount, currency }: Money,
  locales: string | readonly string[],
  how: Intl.NumberFormatOptions,
): readonly Intl.NumberFormatPart[] {
  const digits = minorUnits(currency);

  return new Intl.NumberFormat(locales, {
    ...how,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).formatToParts(amount / 10 ** digits);
}
