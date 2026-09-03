# Money is a whole number of minor units, attached to its currency

Every figure in contaro is money, and money in this product is compared against a plan and summed across a month. We considered holding amounts as a decimal number of major units — 1234.50 pesos — which is what a form and a screen both work in.

We decided an amount is a **whole number of minor units** — 123450 centavos — and never a bare number: it always travels with the currency it is in, as `Money`. Binary floating point cannot represent 0.1, so a month of expenses added in `number` drifts, and a budget that disagrees with the sum of its own Movements by a cent is a budget nobody trusts. Carrying the currency alongside the amount is what makes ADR-0001 hold in practice: a figure cannot reach a screen without saying which money it is, so the Space's currency is the only one it can be shown in.

The set of currencies is a closed catalogue in the domain, not a database column, and each entry says how many minor units it divides into: an Argentine peso has 100 centavos, a Chilean peso has none. Formatting takes the locale as an argument and the currency from the `Money`, so the reader's locale decides the separators and never the money.

## Consequences

Anything that reads an amount from a person, or writes one for a person, converts at that edge and nowhere else: a keypad in #7 produces minor units before the domain sees them. Adding a currency is a change to the catalogue and a translated name, which is a deliberate decision rather than a row someone inserts. When arithmetic over `Money` arrives with the Movements in #7, adding two currencies has to be a refusal rather than a conversion — there is no rate that makes that sum true, which is the same reason ADR-0001 exists.
