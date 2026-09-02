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
