import { createTranslator } from "./translator";
import { es } from "./messages.es";

/** Spanish is the only shipped language (see messages.es.ts). */
export const locale = "es" as const;

/**
 * The locale amounts are formatted in. Argentina, not plain Spanish: "es"
 * prints an ARS amount as "1234,50 ARS" and "es-AR" as "$ 1.234,50", and only
 * the second is a figure a person here reads without stopping. It is separate
 * from `locale` because the copy is Spanish, not Argentine Spanish.
 */
export const numberLocale = "es-AR" as const;

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
