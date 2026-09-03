import { numberLocalesFrom } from "@/i18n/number-locale";

/** What the browser states about the language its reader reads. */
const LANGUAGE_HEADER = "accept-language";

/**
 * The conventions this request's Reader reads numbers under.
 *
 * The seam #24 is proven at, and the same shape #23 uses for the country: the
 * header arrives as a `Headers` rather than being read from Next here, so the
 * whole path — header to locale to the separators on the screen — is driven
 * without a server.
 *
 * Only the separators are the reader's. The currency stays the Space's, which
 * `formatMoney` takes from the `Money` and never from this (ADR-0001).
 */
export function numberLocalesFor(headers: Headers): readonly string[] {
  return numberLocalesFrom(headers.get(LANGUAGE_HEADER));
}
