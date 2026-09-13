# An artboard names a token, not a colour

Issue #138, and the seventh instance of one class.

`src/ui/tokens.css` is the single place a colour is decided. `design/*.dc.html`
never read it. Measured across all nineteen artboards the day this was written:
**699 hexes and one `rgba()`, and not one `var(--`.** Every colour on the canvas
was a hex typed next to the thing it painted.

Classified against `tokens.css` as it stood, which is the count this issue asked
for and the reason the ten correct artboards could be told from the thirty-six
wrong ones:

| | |
| --- | --- |
| Matched no token in `tokens.css` at all | **33** — `#C7C7CC`×19, `#E7E7EC`×5, `#6E6E73`×6, `#F7F7FA`×2, `#E4E4E9`×1 |
| …of those, genuine canvas staging | 6 (the flattened scrim; a seventh case, the heading showing through it, was found in review) |
| …of those, drift with a token to go to | 27 |
| Matched *a* token's value for its palette | **666** |
| …of those, matching the **wrong** token for their surface | 36 (the keypad keys) |
| …already correct, spelling aside | 630 |

The middle row is the whole argument. Six hundred and sixty-six hexes matched a
live token's value, and thirty-six of them were still wrong — a keypad key at
`#F2F2F7` matches `--color-background` to the byte. **A check that compares
hexes to `tokens.css` would have passed every one of those thirty-six.** Value
equality cannot classify a surface, which is why the rule had to be about
`var()` and not about hexes, and why this number is worth writing down: it is
the measurement that ruled out the cheaper check.

That is not a tidiness complaint. It is the reason ADR-0057 shipped a fix that
the canvas went on contradicting. `--color-fill` moved off `#f2f2f7` because it
was the same hex as the page under it, which left twelve 44px keypad keys with a
ground that could not be seen to be a ground (#102). The code moved. The
artboards did not. So thirty-six keypad keys across `AgregarUnFormulario`,
`CorregirElGastoPrevisto` and `CorregirElGastoFijo` were still drawn at the
retired value — and on the two correction artboards the page is *also* `#F2F2F7`,
so twenty-four of those keys were invisible against their own ground, on the
canvas, as the product's official picture of itself, for as long as the fix had
been merged.

## The class this is filed against, not the instance

Six issues have been this same shape, and each was fixed as its own ticket: a
modal that did not look like the canvas (#37), centavos the artboards never show
(#62), a name the two halves disagreed about (#64), three artboards drawing
features the product does not have (#67), correction screens on no artboard at
all (#68), a bundle that had not seen the folder since #63 (#95).

`pnpm check:design` already verifies that the exported bundle answers for the
folder — that was #95's fix and it holds. Nothing verified the step before it:
that the folder answers for `src/`. So the drift was always found by a person
noticing, which is a detector with no schedule.

The seventh instance is the last one filed against itself.

## Why banning the hex would have been the wrong check

`#F2F2F7` is simultaneously one **retired** value and two **current** ones:

```
--color-background:      light-dark(#f2f2f7, #000000)   ← ten page grounds, correct
--color-fill:             light-dark(#e9e9ee, #1c1c1e)   ← moved off it (#102)
--color-fill-on-surface:  light-dark(#f2f2f7, #2c2c2e)   ← a tray on a sheet, correct
```

A rule that bans the hex fails the ten artboards that are right. A rule that
allows it cannot see the thirty-six that are wrong. The hex carries no
information about which of the three it is — only the surface does. So the check
cannot be about hexes at all: **the surface has to say which token it stands
for**, and then the hex is nobody's business but `tokens.css`'s.

That is the whole decision, and everything below is how it is made true.

## The palette is generated into the artboard, from tokens.css

Every `.dc.html` already has a `<helmet><style>` block. It now carries a fenced,
generated copy of `tokens.css`'s `--color-*` and `--shadow-*` declarations —
forty-four of them, **verbatim**, `light-dark()` and all — inside one `:root`
rule whose first line is `color-scheme`:

```
/* BEGIN generated palette — from src/ui/tokens.css, do not hand-edit … */
:root {
  color-scheme: light;
  --color-background: light-dark(#f2f2f7, #000000);
  …
}
/* END generated palette */
```

**Verbatim rather than resolved** is what makes the value single-sourced. The
artboards draw one theme each — `CargarGastoOscuro.dc.html` is the only dark one
— and resolving each palette here would mean this script deciding which half of
every token an artboard gets. `light-dark()` already answers that, and
`color-scheme` is the one line that picks the half. The browser does the
resolving, which is exactly what it does for the running app.

**Generated rather than hand-declared** is what makes it one place rather than
nineteen. A palette copied into nineteen helmets by hand is the same drift with
more steps: it would be correct on the day it was typed and would rot the next
time a hex moved, which is the sentence this ADR exists to stop being true.
`pnpm build:design` writes it; `pnpm check:design` fails when it is stale. That
is not new machinery — it is the `--write`/check pair `scripts/design-bundle.js`
already uses for the bundle, pointed one level up at the sources.

Ordering between the two is load-bearing: the artboards are normalised **first**
and the bundle rebuilt from them **after**, because the bundle serializes their
bytes. Rebuilding first would embed the un-normalised artboards and then report
the folder as having moved on, which is a check disagreeing with itself.

### Shadows are in the palette, and they are the one thing not read from `:root`

A palette of colours would have left `Main.dc.html`'s segmented control with
nowhere to go: the shadow on its chosen half is `--shadow-raised`'s value
spelled out, and a shadow value contains `rgb()`, so the check flags it as a
colour wherever it sits. The two candidate homes were both wrong. `--canvas-*`
is for staging something a static artboard cannot composite, and a shadow is not
that — it is an ordinary token an artboard legitimately draws with. Leaving it
hardcoded would have meant the rule holding for colour and quietly not holding
for the one property that carries a colour inside it.

So `--shadow-*` joins the palette. That costs one thing, and it is the one thing
`tokens.css` warns about in its own words: *"Shadows are not colours, so
`light-dark()` cannot hold them."* Their dark values are re-declared, in a
`prefers-color-scheme` query and in `[data-theme="dark"]`, and **`color-scheme`
reaches neither.** It tells `light-dark()` which half to resolve and nothing
else; it is not a media feature, so declaring it does not satisfy
`prefers-color-scheme`.

A block that copied `:root` alone would therefore hand the dark artboard the
*light* shadow under a dark palette — `--shadow-raised` at 12% black where the
running app draws `none`, on the one artboard whose whole job is to show what
dark looks like, certified correct by the check written to catch exactly this.
So the dark block takes its shadows from `[data-theme="dark"]`, which is the
**forced** dark set and therefore the right one: a dark artboard is a drawing
that is dark regardless of the machine it is opened on. The override is applied
by token name, never wholesale, so a colour appearing in that rule would still
be carried as its own `light-dark()` pair — resolving a half is the one thing
this generator must leave to the browser.

### Why not a shared stylesheet the artboards link

The obvious answer — one `design/tokens.css`, nineteen `<link>`s — does not
survive contact with either consumer. The canvas editor renders artboards out of
a serialized file map (`orderedSources` carries `.dc.html` and `canvas.json` and
nothing else), so a relative href resolves to nothing there. And an artboard
opened straight off disk in a browser is how these are actually read; a linked
palette that the editor drops would draw two different pictures depending on
where you looked at it, which is a fidelity problem invented by the fidelity
fix. A generated block is bigger on disk and correct in both places.

## `var()` does not work in an SVG presentation attribute

Ninety-six of the seven hundred occurrences were `stroke="#6C6C70"` or
`fill="#0E7C66"` on a `<path>`, `<circle>` or `<svg>`. A presentation attribute
is parsed against its property's own grammar rather than as a CSS declaration,
so `var()` is never substituted there: `stroke="var(--color-text-secondary)"`
renders as **no stroke at all**, and nothing errors. Every icon on the canvas
would have quietly vanished, which would have been this ADR shipping the exact
failure it is about.

So those ninety-six moved into CSS — `style="stroke: var(--color-text-secondary)"`
— merged into whatever `style` the element already had. It is written down here
because the mistake is invisible in a diff and invisible in a passing check: the
colours would have been named, the rule satisfied, and the drawing gone.

`fill="none"` is not a colour and is untouched.

## Canvas staging is named, not banned

Six sheet artboards paint their whole page `#6E6E73`. No token has that value
and none should: it is `--color-scrim` composited over the page, flattened,
because a static artboard cannot composite a translucent overlay the way a
browser does. It is a picture of a screen and not a colour the product owns.

A rule of "no hex anywhere" would have to either lie about this or force a fake
token for it. Instead a raw colour may live in exactly one place — a `--canvas-*`
custom property in the helmet, with a comment saying why — which makes
canvas-only colour **countable** rather than excused. The classification report
prints the three buckets separately for that reason: generated, canvas,
hardcoded. A number nobody can account for is how seven hundred hexes accumulated
without anybody deciding to have them.

The same sheets have a second half of the same illusion, and the first pass got
it wrong in the most instructive way available. Behind the sheet the name of the
covered screen shows through, and it was drawn `#FFFFFF` — so it became
`var(--color-surface)`, which resolves to exactly that white. Every check in this
change passed it: it is a `var()`, the token is real, the pixel is identical. It
was still wrong, because `--color-surface` is what a sheet is drawn **on** and
this is **ink** — and the running app draws that heading in `--color-text`, dark,
then lays `--color-scrim` over it, which makes it *darker* rather than lighter.
The light heading is not the product's colour at all. It is the other half of the
staging, and it is named as such.

That is the limit of this whole rule, stated plainly: **naming a token is not the
same as naming the right one, and no automated colour check can tell the
difference.** A ground standing in for ink passes every mechanical test that can
be written, because value equality is all a machine can see — the same finding as
the 666-of-699 row above, arrived at from the other end. So the six sheets have
their two `--canvas-*` declarations pinned by count and by name in
`design-bundle.test.ts`, which is a person's judgement written down where the
next pass will trip over it, rather than a check pretending to have made it.

## What this catches, and what it still does not

This is a **colour** check, and colour is now closed: a token change lands in
`tokens.css` and propagates, and an artboard that disagrees with it fails.

It reaches nothing else. ADR-0060 already named the next gap and left it here:
`CrearEspacio.dc.html` draws an entry-head bar — `Cancelar` / `Nuevo espacio` /
`Crear` — and `espacios/nuevo/page.tsx` draws an `<h1>` with `Cancelar` at the
foot. Both are the same screen and they are not the same screen, and no amount
of correctly-named colour notices. `scripts/design-bundle.test.ts` partitions the
nineteen artboards on header presence (ADR-0059) and now on colour; structure
past that is still unchecked, and the next instance of this class will be a
structural one.

Two artboards carry a related question this deliberately does not answer.
`Main.dc.html` and `AgregarUnFormulario.dc.html` are drawn on `#FFFFFF`, and the
app draws both of those screens on the grey page ground. ADR-0057 already
identified that mismatch as the reason `--color-fill` was read off wrong in the
first place — "the hex was right and the context was not". Renaming those grounds
`--color-surface` records what the artboard draws; it does not claim the artboard
draws the right thing. Repainting them is a redraw, not a rename, and a redraw
riding on a colour fix is how a review stops being able to see either.

## Where it is held

- `scripts/design-palette.js` — the palette read out of `tokens.css`, the block
  generated from it, the forced-dark override the shadows need, and the
  classification of every colour on an artboard into generated / canvas /
  hardcoded. Pure functions over text, the way `design-bundle.js`'s are, so none
  of it needs a design folder to test.
- `scripts/design-palette.test.ts` — those functions at their own seam,
  including that `withPalette` is idempotent, that `#105` in prose is not a
  colour, and that the dark block's shadows are `none` while the light block's
  are not.
- `scripts/design-bundle.test.ts` — the fidelity assertions in the
  `*.source.test.ts` idiom this repo already uses more than ten times: every
  artboard carries the palette `tokens.css` generates today, no artboard
  hardcodes a colour outside a `--canvas-*` declaration, and — named separately
  because it is the one thing a careless future pass would break — the ten page
  grounds still resolve to `#f2f2f7` rather than being quietly repointed at
  `--color-fill`.
- `scripts/check-design-bundle.js` — the report and the failure, in the voice the
  bundle check already fails in, telling a person which file, which line, and to
  run `pnpm build:design`.
