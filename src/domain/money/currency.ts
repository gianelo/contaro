/**
 * The closed set of currencies a Space can be denominated in.
 *
 * A Space's currency is chosen once and never changes (ADR-0001), so the set
 * lives here rather than in a database column a screen could widen by accident:
 * adding a currency is a decision, not data.
 *
 * The set is append-only (ADR-0012). A Space stores its code, `asSpace` throws
 * on a code this file does not offer, and that currency can never be changed —
 * so removing an entry does not tidy the catalogue, it makes every Space
 * denominated in it unreadable. What admits a new one is a Member who keeps
 * their money in it.
 */

export const currencies = {
  ARS: { minorUnits: 2 },
  USD: { minorUnits: 2 },
  EUR: { minorUnits: 2 },
  UYU: { minorUnits: 2 },
  BRL: { minorUnits: 2 },
  CLP: { minorUnits: 0 },
  PYG: { minorUnits: 0 },
  // ISO 4217 gives the Colombian peso 2 minor units; CLDR — which is what Intl
  // follows — gives it 0, because nobody in Colombia types centavos. This
  // number exists so a figure reads the way its reader reads it, not so it
  // cites the standard, so CLDR wins. The first entry where the two disagree.
  COP: { minorUnits: 0 },
  MXN: { minorUnits: 2 },
  CAD: { minorUnits: 2 },
} as const;

export type CurrencyCode = keyof typeof currencies;

/**
 * Every code contaro offers, as a set and in no meaningful order. A picker
 * reads them by name, and a name is a translation this module cannot see, so
 * the order a person reads is decided in `readableCurrencies`.
 */
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
