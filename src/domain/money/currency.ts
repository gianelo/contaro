/**
 * The closed set of currencies a Space can be denominated in.
 *
 * A Space's currency is chosen once and never changes (ADR-0001), so the set
 * lives here rather than in a database column a screen could widen by accident:
 * adding a currency is a decision, not data.
 */

export const currencies = {
  ARS: { minorUnits: 2 },
  USD: { minorUnits: 2 },
  EUR: { minorUnits: 2 },
  UYU: { minorUnits: 2 },
  BRL: { minorUnits: 2 },
  CLP: { minorUnits: 0 },
  PYG: { minorUnits: 0 },
} as const;

export type CurrencyCode = keyof typeof currencies;

/** In the order a picker should offer them: the ones nearest home first. */
export const currencyCodes = Object.keys(currencies) as CurrencyCode[];

/**
 * Whether a string from outside — a form field, a database row — is one of the
 * codes we offer. Deliberately exact: a caller that sends "ars" has a bug, and
 * quietly repairing it here would hide the bug rather than the typo.
 */
export function isCurrencyCode(value: string): value is CurrencyCode {
  return Object.hasOwn(currencies, value);
}

/**
 * How many minor units the currency divides into: 100 centavos to a peso, and
 * nothing at all to a Chilean peso. Amounts are held in minor units, so this
 * is what turns one into a figure a person reads.
 */
export function minorUnits(currency: CurrencyCode): number {
  return currencies[currency].minorUnits;
}
