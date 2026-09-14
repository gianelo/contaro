# An artboard is drawn on the ground the app draws it on

Issue #143, which is the redraw ADR-0061 named and deliberately did not do.

`design/Main.dc.html` and `design/AgregarUnFormulario.dc.html` drew their root
on `--color-surface`. The app draws both of those screens on the page:
`movimientos/nuevo` and `presupuesto/nuevo` render `AppShell` directly — they
skip `SpaceScreen` to drop the tab bar, not the shell — and
`app-shell.module.css`'s `.shell` is `background: var(--color-background)`.

Both roots are now `var(--color-background)`. That is the whole change: one
declaration in each file, and nothing else on either artboard moves.

## Why this is not a matter of taste

The canvas had already decided it and then disagreed with itself in three
places, none of which needed an opinion to read:

- **The same screen, two grounds.** `CargarGastoOscuro.dc.html` is the dark
  half of `Main.dc.html` and draws its root on `--color-background`. One screen
  was drawn on two different surfaces depending on the theme, which is the
  divergence ADR-0028 went looking for and found in the segmented control's
  thumb, sitting in the canvas in a second place.
- **The same keypad, two grounds.** `AgregarUnFormulario.dc.html` has the same
  twelve keys as `CorregirElGastoFijo.dc.html` and
  `CorregirElGastoPrevisto.dc.html`, and those two are drawn on the page. The
  same component was drawn on two grounds across three artboards.
- **Seventeen against two.** Of the nineteen artboards, thirteen draw a page
  ground and six are sheets flattening `--color-scrim` over one. These two were
  the only full screens on a raised surface.

The alternative was real and is written down here rather than assumed away: a
canvas may draw a component in isolation on a neutral ground on purpose. It is
not what these two are. They are whole screens, drawn at 390×844 with the
screen's own head bar, its own call to action and its own fold line — not
components lifted out for study. An isolation ground on a full-screen artboard
is indistinguishable from a mistake, which is exactly how it behaved.

## What it costs, measured

The point of the repaint is that the quiet surfaces get **weaker**, and that is
not a side effect to be softened. It is the finding.

```
                        on #ffffff      on #f2f2f7
--color-fill  #e9e9ee     1.21:1     →    1.08:1     ↓  keys, groove, pills
--color-surface #ffffff   1.00:1     →    1.12:1     ↑  the chips not chosen
--color-segment-thumb     1.21:1     =    1.21:1        against its groove
```

`--color-fill` loses a notch because in the app it never had it. ADR-0057
already settled that this is the app's reading and not a defect to fix there:
repainting the screen white was considered and rejected, because `.refusal`
lives on two other screens the canvas never drew white. What ADR-0057 could not
do from inside a token change was correct the place the wrong value was read
off. This is that.

`--color-surface` is the half nobody had counted. The unchosen category chips
are `--color-surface` with a 1px border, and on a white ground their fill had
**no** contrast at all — 1.00:1, a boundary that is not a boundary, which is
the identical shape of failure `--color-fill` was moved down to escape. Five
44px targets on `Main` and three on `AgregarUnFormulario` existed as outline
only. They are a step up from the page now, which is what `chip-field.module.css`
has always drawn.

`--color-segment-thumb` is untouched: the chosen half contrasts against its
groove, not against the page, and the groove is `--color-fill` either way. What
changes is that the thumb can now be seen to be lifted *out of* something,
rather than floating on the same white the groove was cut into.

## What this does not touch

Nothing in `src/`. Not one token value, not one stylesheet. The app was the half
that was right and stays exactly as it is; the acceptance criterion said so and
there was nothing found that argued against it.

One thing was found while re-reading every quiet surface against the new ground,
and it is deliberately **not** fixed here. `AgregarUnFormulario.dc.html` outlines
its unchosen chips with `--color-separator-strong`; `Main.dc.html` and
`chip-field.module.css` both use `--color-border`. That is a line disagreeing
across three files, it predates this change, the repaint neither causes nor
worsens it, and it is a different kind of claim from the one this ADR makes. It
is filed rather than folded in — a fix riding on a redraw is the same mistake
ADR-0061 refused to make when it left the redraw riding on a colour fix.

## Where it is held

`scripts/design-bundle.test.ts` already pinned the page grounds by name, because
#138 foresaw a careless pass repointing them at `--color-fill`. That list was ten
and is twelve. It is the reason this decision cannot quietly rot: an artboard
that leaves the page ground now fails a test rather than waiting for somebody to
notice a screen looks slightly wrong.

What is still unchecked is the general rule this ADR's title states. A *new*
artboard drawn on `--color-surface` is not caught by a list of twelve names —
the list guards the twelve, not the rule. That check is #143's follow-up and
deliberately not in this diff.
