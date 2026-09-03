# The currency catalogue is append-only, and a Member's money is what admits a currency to it

contaro offers a closed set of currencies a Space can be denominated in, held as code in `src/domain/money/currency.ts` (ADR-0007). Adding COP, MXN and CAD (#22) raised the question nobody had answered: what happens when one comes off the list.

We decided **nothing ever comes off it**. The catalogue only grows.

The reason is not tidiness, it is that removal is destructive and silent about it. A Space stores its currency as a code, that code is checked on the way out of the database — `asSpace` in `src/db/spaces.ts` throws on a code the domain does not offer — and ADR-0001 says the Space can never be moved to another currency. So deleting an entry does not shrink a list: it makes every Space denominated in that currency unopenable, with no migration that could rescue them, because there is no correct rate to convert a history at. A currency is safe to remove exactly when no Space has ever used it, and nothing in the code can tell us that.

**What admits a currency is a Member who keeps their money in it.** Not a market we might enter, not completeness against ISO 4217, not a country a Member visited. That bar is deliberately low to clear and deliberately concrete: the list is short because the reasons are real, and a picker of one hundred and eighty codes is a worse picker for everyone.

## Consequences

Adding a currency is three edits that must land together: an entry in `currencies` with its `minorUnits`, a `currency.<code>` message in `src/i18n/messages.es.ts`, and — since ADR-0013 — at least one country in `src/domain/money/country.ts` that keeps its money in it. It was two until a currency gained a country; it is still not four, because nothing else knows the set — every list of currencies on a screen or in a test is derived from `currencyCodes`, so a further place to edit is a bug in that derivation. `src/i18n/currency.test.ts` fails the build if a code has no name, and `src/domain/money/country.test.ts` fails it if a code has no country.

`minorUnits` follows CLDR, which is what `Intl` follows, and not ISO 4217 where the two disagree. COP is the first entry where they do: ISO says 2, CLDR says 0, and a Colombian reads a figure with no centavos. The number exists so an amount reads the way its reader reads it.

The picker is ordered alphabetically by the name on the screen, decided in `src/i18n/currency.ts` because a name is a translation the domain cannot see — the same reason `readableCatalogue` sorts Categories there. A curated order ("nearest home first") is one somebody has to maintain, and at ten currencies spanning Ottawa to Asunción there was no home to be near. ADR-0013 later found one that nobody maintains: the request itself says which country it came from, and that currency is lifted to the top of the same alphabetical list.

The picker offers no currency until one is chosen. A default answers, for whoever does not read the screen, a question ADR-0001 says can never be asked again; the cost of not defaulting is one tap, and the cost of defaulting wrongly is a Space thrown away.
