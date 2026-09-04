# Money is a whole number of minor units, attached to its currency

Every figure in contaro is money, and money in this product is compared against a plan and summed across a month. We considered holding amounts as a decimal number of major units — 1234.50 pesos — which is what a form and a screen both work in.

We decided an amount is a **whole number of minor units** — 123450 centavos — and never a bare number: it always travels with the currency it is in, as `Money`. Binary floating point cannot represent 0.1, so a month of expenses added in `number` drifts, and a budget that disagrees with the sum of its own Movements by a cent is a budget nobody trusts. Carrying the currency alongside the amount is what makes ADR-0001 hold in practice: a figure cannot reach a screen without saying which money it is, so the Space's currency is the only one it can be shown in.

The set of currencies is a closed catalogue in the domain, not a database column, and each entry says how many minor units it divides into: an Argentine peso has 100 centavos, a Chilean peso has none. Formatting takes the locale as an argument and the currency from the `Money`, so the reader's locale decides the separators and never the money. Which locale is passed as that argument was left open here and settled by ADR-0014: it is the reader's own, and it varies per request.

## Consequences

Anything that reads an amount from a person, or writes one for a person, converts at that edge and nowhere else: a keypad in #7 produces minor units before the domain sees them. Adding a currency is a change to the catalogue and a translated name, which is a deliberate decision rather than a row someone inserts. When arithmetic over `Money` arrives with the Movements in #7, adding two currencies has to be a refusal rather than a conversion — there is no rate that makes that sum true, which is the same reason ADR-0001 exists.

## Amendment (#11): one figure may carry the symbol for both its halves

The comparison #11 draws reads `$210.000 / 400.000`, and the second half carries no symbol. That is a real loosening of "a figure cannot reach a screen without saying which money it is", so it is written down here rather than left as a comment.

The loosening is narrow: it is **one figure**, not two. A person reads it as "two hundred and ten of four hundred", and a second `$` would turn one sentence into two amounts standing next to each other. The symbol at the front governs both halves, exactly as it does in "$3 to $5".

`formatAmount` in `src/domain/money/money.ts` is the only way to produce a symbol-less amount, and it takes a `Money` — so the currency is still what decides the decimals, and the reader's locale is still what decides the separators (ADR-0014). Both halves go through the same private `written`, so the two can never disagree about either.

The rule that survives, and the one to hold anything new to: **`formatAmount` is never the whole of a figure.** An amount that reaches a person on its own goes through `formatMoney`. If a screen ever wants a bare amount standing alone, that is not a formatting choice, it is this ADR being reopened.
