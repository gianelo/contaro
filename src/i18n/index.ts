import { createTranslator } from "./translator";
import { es } from "./messages.es";

/** Spanish is the only shipped language (see messages.es.ts). */
export const locale = "es" as const;

export const t = createTranslator(es);

export type { SpanishMessages } from "./messages.es";

/**
 * Two names in the order a person reads them.
 *
 * The reader's language decides where the accents and the ñ fall, which plain
 * string comparison gets wrong in exactly the alphabet this product ships in.
 * Every list named to a person — Categories, currencies — is ordered by this.
 */
export function inReadingOrder(a: string, b: string): number {
  return a.localeCompare(b, locale);
}
