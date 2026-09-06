# globals.css is the only thing that says how a link is decorated

`globals.css` styled links and stopped one declaration short:

```css
a {
  color: var(--color-accent);
}
```

It said what colour a link is and never said what it is drawn with, so every
anchor in the product kept the browser's default underline. Four stylesheets
noticed and wrote `text-decoration: none` for themselves — five declarations in
all, because the tab bar wrote one for a tab and another for the raised button
— and everything else did not. Whether a row was underlined came down to which
stylesheet happened to sit above it.

That is #58, and it is the same absence ADR-0025 describes about width: a
question nothing answered centrally, answered separately by whoever tripped
over it.

## The decision

`globals.css` says it, on the element, once:

```css
a {
  color: var(--color-accent);
  text-decoration: none;
}
```

and the five local copies are gone.

## Why none, and not the browser's underline

Underline is how a link says it is one *in a document* — a phrase inside a
paragraph, where nothing else marks it out. This product has no such link. Every
anchor in it is a row, a card, a tab, a button, a way out or a step to another
month; each already says it can be tapped by being that shape, sitting on a
surface, wearing the accent, and taking a 44px target (ADR-0027). An underline
under a whole row says nothing the row does not already say, and it draws a line
across a card the canvas draws without one.

Not one of the ten artboards in `design/` writes an underline anywhere. So the
rule is read off the canvas rather than argued for here — the same source
`--gutter` is taken from (ADR-0025), though this one is a decision the canvas
made rather than a number it holds. The ceiling was read off it too until #75
showed that a canvas drawing one width cannot say "and no wider"; it is
`--measure` now and it is argued, not read (ADR-0041).

## The way back in is deliberate

Should a link ever genuinely read as running text, it writes
`text-decoration: underline` where it is written. That is the point of the rule
being a default rather than a ban: the exception costs one line at the site that
needs it, and it is visible as an exception. What the rule forbids is the
opposite — a stylesheet re-saying `none`, which is the same rule in a second
place and the thing that left the seventh screen underlined.

`link.source.test.ts` pins exactly that shape. It reads `globals.css` for the
declaration and then reads every stylesheet under `src/` for a repeat of it, so
a sixth copy fails the suite while a deliberate `underline` passes.

## Where it is said, and what stopped saying it

| Stylesheet | What was compensating |
| --- | --- |
| `ui/tab-bar.module.css` | `.tab` and `.action` — the four destinations and the raised button between them |
| `app/espacios/page.module.css` | `.slot`, the dashed outline of the Space that is not there yet |
| `app/espacios/[id]/movimientos/nuevo/head.module.css` | `.cancel`, the way out of the entry screen |
| `app/espacios/[id]/movimientos/page.module.css` | `.step`, a month either side of the one being read |

Nothing about those four changes on screen: each was already drawing what the
global rule now draws for everything.

## Consequences

The screens that were never compensating are the change. On the Budget screen
every Fixed item's name, its `Vivienda · 1 sep` line, its amount, every row of
the plan, "Agregar un ítem", "Agregar un fijo" and the Miembros row stop being
underlined; so does every row of the month's list.

`GroupedListItem` is where most of them come from. With an `href` it sets
`color: var(--color-text)` on `.row` and never touched the decoration, which is
why those rows read as black underlined text — neither a link nor a row.

## Two seams, because the question has two halves

`link.source.test.ts` reads where the rule is *written*. That is not enough on
its own: `a` is specificity 0,0,1, so any class at all outranks it, and a rule
that is written and then overridden still draws an underline. So
`e2e/link-decoration.spec.ts` measures `textDecorationLine` on every visible
link in a real browser, over a Space seeded with a Fixed item, a Variable one
and a Movement — because the rows #58 is actually about are rows an empty Space
does not draw at all. It pins the link count per screen rather than asking for
more than none, for the reason `hit-targets.spec.ts` pins its counts: "more
than zero" is satisfied by the tab bar alone, so a screen that stopped
rendering its rows would go on passing with nothing left on it to underline.

Reverting the one line in `globals.css` fails both: 40 links underline across
the seven surfaces the spec reads.

It reads six routes and one sheet. Five of the routes are an artboard —
Espacios, CrearEspacio, Presupuesto (`presupuesto/page.tsx` redirects to
`/espacios/{id}`, so that is the Budget screen), Movimientos and CargarGasto;
Miembros has no artboard and is read because #58 names its row. The sheet is
the month pill's (#40), which is the one place in the app that draws links no
address reaches.

Four artboards are deliberately not read, and none of them can fail this. The
sheets `SheetArrastre`, `SheetCerrar` and `SheetPagar` contain no anchor at all
— `movimientos/when.tsx`, `movimientos/[movementId]/strike.tsx` and the pay
sheet in `presupuesto/fixed.tsx` are buttons — so there is nothing on them to
be decorated; `SheetCopiar` has no component yet. `CargarGastoOscuro` is the
dark half of a screen already read, and a decoration does not have a palette.
