import { createTranslator } from "./translator";
import { es } from "./messages.es";

/** Spanish is the only shipped language (see messages.es.ts). */
export const locale = "es" as const;

export const t = createTranslator(es);

export type { SpanishMessages } from "./messages.es";
