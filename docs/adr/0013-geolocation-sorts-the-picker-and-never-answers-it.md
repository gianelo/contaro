# Geolocation sorts the currency picker and never answers it

The currency picker offers ten choices and preselects none (ADR-0012). Where a request comes from is already known — Vercel sends `x-vercel-ip-country` on every request — so #23 asked whether to use it.

We decided it **orders the list and nothing else**. The field still opens empty and the person still chooses.

The reason is that the cost of being wrong is asymmetric. Geolocation is wrong often enough to matter: a VPN, a holiday, an Argentine visiting Bogotá, a corporate egress in another country. A badly ordered list is an annoyance; a Space denominated in the wrong money is permanent, because ADR-0001 says its currency can never be changed and there is no rate at which a history could be converted. And the gain is the same either way — the currency a person wants is one tap from the top whether it is preselected or merely first.

This is what ADR-0012 left open. It said a curated order ("nearest home first") was one somebody has to maintain, and at ten currencies spanning Ottawa to Asunción there was no home to be near. That is still true of a *written* order. It is not true of one derived per request: there is a home, the request says where it is, and nobody maintains a list.

## Consequences

The map from a country to its currency lives in `src/domain/money/country.ts`, beside the catalogue it points into and for the same reason (ADR-0012): which money a country keeps is a rule, not data, and it is driven directly by tests. It names no country whose currency the catalogue does not offer, so a country it does not name is the ordinary case and not an error — the list simply stays alphabetical, which is what it was before anybody looked at where the request came from.

It is not one country per currency, and it is not a census either. A currency is the money of every country that keeps it: the dollar belongs to Quito, San Salvador and Panama City as much as to Chicago, and the euro to twenty-four places at once. Once a currency is in the catalogue, naming another country that uses it costs nothing, so the only bar is that the money there really is that money. The map stops at the countries a Member might plausibly open the screen from, and a country it does not reach is a list left alphabetical.

Adding a country is one edit, and the reverse — adding a currency — now requires one too, because `country.test.ts` fails the build if a currency in the catalogue has no country pointing at it. That is a constraint this decision puts on ADR-0012, which is why ADR-0012's Consequences were amended rather than left to disagree: without it, the eleventh currency would ship with this feature quietly not working for it.

The header is read at the edge, in `src/app/espacios/nuevo/currencies.ts`, which takes a `Headers` rather than calling Next itself. The domain sees a country string and never a request (ADR-0005), and the whole path — header to country to currency to the order on the screen — is driven in milliseconds with no server.

`currencyOfCountry` reads case-insensitively and trims, where `isCurrencyCode` deliberately does neither. The difference is who calls them: `isCurrencyCode`'s callers are ours, so a sloppy code there is a bug worth surfacing, while this one's caller is an edge copying a string out of an HTTP header, and a header is not code.

Reading the header opts `/espacios/nuevo` into per-request rendering. That screen is behind a session and renders a form, so there was nothing there worth caching.

`CF-IPCountry` is deliberately not read. `gianbarboza.com` uses Cloudflare nameservers in DNS-only mode: it resolves the name and steps aside, nothing is proxied, and that header never arrives. Turning the proxy on to get it would add a hop in front of Vercel and another thing to break.
