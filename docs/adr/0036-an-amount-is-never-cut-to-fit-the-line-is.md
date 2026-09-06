# An amount is never cut to fit; the line is

The Budget screen's summary card put "Gastado" and "Presupuestado" on one line
and negotiated nothing between them:

```css
.figures {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.spending,
.plan {
  min-width: 0;
}
```

`min-width: 0` lets a flex item shrink under its own content. Ordinary text
relieves that by wrapping. An amount has nothing to wrap at — `Intl` joins the
symbol to its digits with a non-breaking space, and a digit group has no break
opportunity in it — so the figure kept its width and painted straight out of the
box:

```
Gastado                              Presupuestado
ARS 1,234,567.89ARS 9,999,999.99
                ^^^^ printed on top of the line above's tail
```

Not wrapped, not truncated. Overlapped. Neither figure readable. The VARIABLES
rows had the same shape a little further along.

That is #69.

## Why it was never an edge case

Two dials widen an amount independently, and the product offers both on purpose.

**The currency.** `src/domain/money/currency.ts` holds ten. COP, CLP and PYG take
no minor units; ARS, USD, EUR, UYU, BRL, MXN and CAD take two. `$1.800.000` and
`$1.800.000,00` are three characters apart before anything else happens, and
ADR-0001 makes a Space's currency permanent — nobody can shorten their way out.

**The reader.** ADR-0014 writes an amount the way its reader reads numbers, and
ADR-0018 puts the reader's own locale in charge. A phone set to English looking
at an Argentine Space is told `ARS 1,234,567.89`: the ISO code spelled out rather
than `$`, because to that reader a bare `$` would say dollars. That is not a
broken state. It is exactly what ADR-0014 asks for.

Turn both and the widest figure the product can produce is twenty characters:
`ARS 9,999,999,999.99` — `MAX_BUDGET_ITEM_AMOUNT` minor units of a two-minor-unit
currency, spelled out. The card was measured against the narrowest.

Every screenshot that made the layout look settled was taken in COP or in
`es-AR`, which is how this went unnoticed for four tickets: the shape only
appears when both dials move at once.

## The decision

**An amount is never cut, shrunk, or overprinted to make it fit. The line gives
way instead.**

Three things follow, and they are one rule read at three widths:

1. **No figure may shrink below its own text.** `min-width: 0` is barred from the
   card. At their natural minimum the two columns cannot both fit, and that is
   what makes the line break rather than the box overflow.

2. **When they do not both fit, they take a line each.** `flex-wrap: wrap`, with
   the plan given the leftover width so it reads back from the card's right edge
   on a shared line and on a line of its own alike.

3. **When one figure alone is wider than the line, it breaks —
   `overflow-wrap: break-word`, never `anywhere`.** `anywhere` would drop each
   column's own minimum to a single digit; the line would stop wrapping and the
   pair would go straight back to being squeezed into each other. So the pair
   separates first, and only a figure that cannot fit even alone is ever cut.

The VARIABLES rows are the same pair of figures in a tighter line and carry all
three. Their `spent / planned` pair may break at exactly one place — between the
two halves — because that is where a person would break it. Never inside an
amount, and never between the slash and the number it belongs to. That holds on
a reliance worth naming: `Intl` joins a symbol to its digits with a
non-breaking space, so the half carrying the symbol needs no rule, and the bare
half says `white-space: nowrap` for itself.

## What was ruled out

**Truncating with an ellipsis.** `ARS 1,234,5…` is not a smaller amount; it is a
different one. ADR-0007 exists to stop a figure reaching a person without saying
which money it is, and a figure that reaches them saying the wrong number is
worse than one that says none.

**Sizing the type for the worst case.** "Gastado" is the loudest thing on the
screen because it is the answer to the question the screen exists to ask.
Shrinking it until twenty characters fit makes every ordinary month quieter to
pay for a month nobody has. A fluid size — `clamp`, a viewport or container unit
— is the same trade taken silently, and `summary.source.test.ts` bars it: the
figure is one step of the scale or it is nothing.

**A single measurement of "the widest case".** There is no such number to hold.
`MAX_BUDGET_ITEM_AMOUNT` bounds one item, and "Gastado" is a sum of Movements
with no ceiling of its own; the catalogue can gain a currency; the reader can be
anybody. A layout that survives because somebody measured the longest string
today is a layout waiting for the eleventh currency.

## Where it is held

The rule lives in the two stylesheets and is pinned from two directions, because
neither direction can say the whole of it:

- `summary.source.test.ts` and `variables.source.test.ts` say *why* the figures
  no longer overlap — the line wraps, the figure breaks rather than spills, and
  the type does not follow the box — which no rendered measurement can state.
  One per stylesheet and not one shared: "the meter rows do what the card does"
  is the claim, and a claim held in a single place is a claim only one of the
  two files can break.
- The type not following the box is asked of `tokens.css` as well as of the
  card. A `--text-figure` redefined as a `clamp` would shrink the figure with
  nothing on the card changing, so a test that only read the card would pass
  while the decision broke.
- `e2e/budget.spec.ts` measures the boxes at 390×844 in `en-US` against an ARS
  Space at the ceiling, and says *that* they do not overlap — the two figures
  against each other, and the row's pair against the Category it belongs to. It
  is the only test in the product that does real layout, so it is the only one
  that could have caught this at all.

The gutter those measurements are taken against is read off the shell rather
than written down in the spec (`e2e/layout.ts`), for the reason ADR-0025 gave
the gutter one name: a literal in a test file is the worst second place for a
value to live, because it would keep passing while the app moved.
