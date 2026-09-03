import type { CurrencyCode } from "./currency";

/**
 * Where a request came from, mapped to the money that country is kept in.
 *
 * This exists to order a picker, never to fill it in: a Space's currency can
 * never be changed (ADR-0001), and geolocation is wrong often enough — a VPN,
 * a holiday, an Argentine in Bogotá — that answering with it would trade an
 * annoyance for a Space thrown away. See ADR-0013.
 *
 * The map is small and it is a decision, not data, exactly like the catalogue
 * it points into (ADR-0012): a country is named here because a currency
 * contaro already offers is the one its money is kept in. It names no country
 * whose currency is missing from the catalogue, which is why a request from
 * Tokyo is not an error — it is a request nothing here has an opinion about.
 *
 * It is not a census either. Adding a country costs nothing once its currency
 * is already offered, so the bar is only that the money there really is that
 * money; it stops at the countries a Member might plausibly open the screen
 * from, and a missing one is a list left alphabetical, not a bug.
 */
const currencyByCountry = {
  AR: "ARS",
  UY: "UYU",
  BR: "BRL",
  CL: "CLP",
  PY: "PYG",
  CO: "COP",
  MX: "MXN",
  CA: "CAD",
  // A currency is not one country. The dollar is the money of Quito, San
  // Salvador and Panama City as much as of Chicago, and a Space created in
  // any of them is created in dollars.
  US: "USD",
  EC: "USD",
  SV: "USD",
  PA: "USD",
  // The euro is the same case at greater length: the twenty countries of the
  // euro area, and the four microstates that mint it by agreement.
  AD: "EUR",
  AT: "EUR",
  BE: "EUR",
  CY: "EUR",
  DE: "EUR",
  EE: "EUR",
  ES: "EUR",
  FI: "EUR",
  FR: "EUR",
  GR: "EUR",
  HR: "EUR",
  IE: "EUR",
  IT: "EUR",
  LT: "EUR",
  LU: "EUR",
  LV: "EUR",
  MC: "EUR",
  MT: "EUR",
  NL: "EUR",
  PT: "EUR",
  SI: "EUR",
  SK: "EUR",
  SM: "EUR",
  VA: "EUR",
} as const satisfies Record<string, CurrencyCode>;

/**
 * Every country this map has an opinion about, as ISO 3166-1 alpha-2 codes.
 *
 * Exported for the guards in `country.test.ts` and nothing else: that every
 * key really is a country code, and that no currency in the catalogue is
 * unreachable from one. Both are cheap to write and impossible to remember.
 */
export const countriesWithACurrency = Object.keys(
  currencyByCountry,
) as (keyof typeof currencyByCountry)[];

/**
 * The currency a country keeps its money in, or nothing.
 *
 * Nothing is the ordinary answer, not a failure: the caller is an edge that
 * copied a string out of an HTTP header, and a country the map does not name —
 * or no country at all — simply leaves the picker in the order it was already
 * in. Which is why this reads case-insensitively where `isCurrencyCode` does
 * not: that one's callers are ours, and a header is not code.
 */
export function currencyOfCountry(
  country: string | null | undefined,
): CurrencyCode | null {
  if (!country) return null;

  const code = country.trim().toUpperCase();
  return Object.hasOwn(currencyByCountry, code)
    ? currencyByCountry[code as keyof typeof currencyByCountry]
    : null;
}
