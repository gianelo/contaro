import { currencyOfCountry } from "@/domain/money/country";
import { readableCurrencies } from "@/i18n/currency";
import type { Choice } from "@/ui/field";

/**
 * The header Vercel puts the requesting country in, as an ISO 3166-1 alpha-2
 * code. Cloudflare's `CF-IPCountry` is deliberately not read: this project's
 * DNS is Cloudflare in DNS-only mode, so nothing is proxied and that header
 * never arrives. A header nobody sets is a country nobody knows.
 */
const COUNTRY_HEADER = "x-vercel-ip-country";

/**
 * The currency picker as this screen offers it: every currency, named, with
 * the one the request's country keeps its money in lifted to the top.
 *
 * The seam ticket #23 is proven at. The country arrives as a `Headers` rather
 * than being read from Next here, so the whole path — header to country to
 * currency to the order on the screen — is driven without a server, and the
 * domain stays a place no request reaches (ADR-0005).
 *
 * It sorts and it never preselects: the picker still opens on nothing and the
 * person still chooses (ADR-0013).
 */
export function currencyChoicesFor(headers: Headers): readonly Choice[] {
  const country = headers.get(COUNTRY_HEADER);

  return readableCurrencies(currencyOfCountry(country)).map((currency) => ({
    value: currency.code,
    label: currency.label,
  }));
}
