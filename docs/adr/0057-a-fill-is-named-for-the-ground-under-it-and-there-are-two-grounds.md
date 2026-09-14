# A fill is named for the ground under it, and there are two grounds

Issues #102 and #123, which are one bug read from two sides.

`--color-fill` meant "the quiet ground a block sits on". It was one hex, and it
was drawn on two different things: the **page** (`--color-background`) and a
**sheet or card** (`--color-surface`). One hex cannot be a step off both, and it
was equal to each of them in the palette where it mattered:

```
light:  --color-fill #f2f2f7  ==  --color-background #f2f2f7   (#102)
dark:   --color-fill #1c1c1e  ==  --color-surface    #1c1c1e   (#123)
```

Neither theme was "the broken one". In light, every quiet block on the entry
screen — twelve keypad keys, the segmented groove, the entry head's pill, the
`Hoy · <Member> · Cambiar` line, and the card a refusal takes on two other
screens — had a ground that could not be seen to be a ground. In dark, the recap
tray of all three confirmation sheets stopped being a tray while every word in
it stayed perfectly legible, which is the failure hardest to see in a
screenshot.

So the token splits along the only line that decides its value: **what is under
it.**

- `--color-fill` — a step off the **page**. `light-dark(#e9e9ee, #1c1c1e)`
- `--color-fill-on-surface` — a step off a **raised surface**.
  `light-dark(#f2f2f7, #2c2c2e)`

This is the same naming-apart, for the same reason, that the repo already did
once: `--color-disabled` and `--color-disabled-surface` are two names because
one value could not be both the ink on an untyped amount and the ground of a
dead button. `--color-segment-thumb` exists for the third instance of the trap.
Three occurrences is a rule, and this ADR is that rule written down: **a ground
token is named for what it sits on, never for what it looks like.**

## Where the value came from

`design/Main.dc.html` draws the light entry screen on `#FFFFFF` with everything
quiet on it at `#F2F2F7`. That is correct on a white sheet. The app renders that
screen inside `AppShell`, whose ground is `#F2F2F7`. The hex was right and the
context was not — a value lifted out of a place that supplied its own contrast.

Repainting that screen white was considered and rejected: `.refusal` also lives
on the item detail and the movement detail, which are ordinary grey Space
screens the canvas never drew white. The screen was not the thing that was
wrong.

## The direction flips between palettes, and that is not a drift

`--color-fill` goes **down** from the page in light and **up** in dark. That
reads like an inconsistency and is the opposite: it is the only direction each
palette leaves. The light page is near-white, so away-from-it means darker; the
dark page is black, so away-from-it can only mean lighter. "Recessed" and "a
step away" are the same move in dark and opposite moves in light.

Down is also what keeps the rest of the set standing. White (`#ffffff`) is the
stronger boundary — 1.12:1 against the page against 1.08:1 — and it was
rejected, because `--color-segment-thumb` is `#ffffff` in light. A white groove
under a white thumb is exactly the bug that token was named apart to prevent,
moved one theme over. Down leaves the groove below the page and the thumb above
the groove, which is what `segmented-field.module.css` has always claimed it
draws.

What down costs is the margin to `--color-fill-pressed` (`#e3e3e8`), now one
notch rather than two. `tokens.source.test.ts` asserts that margin in both
palettes, so the next hex that moves toward it fails a test rather than a thumb.

Neither candidate reaches WCAG 1.4.11's 3:1, and neither needs to: the keys
carry their own numerals, so the ground carries grouping and target size rather
than meaning.

## The tray goes up too, and does not become a notch

`variables.module.css` hit this trap first and solved it with
`--color-background` — a notch cut through the card down to the screen's own
ground. That precedent is sound where it is, and it is not followed here. On a
**sheet**, `--color-background` is `#000000` in dark: a black slot in a
near-black panel, a heavier line than anything the light theme draws for the
same tray.

`#2c2c2e` instead — the near-black `--color-surface-raised` is already drawn in.
In dark, elevation lightens, so a tray on a `#1c1c1e` sheet reading one shade
above it is what the platform does and what the sheet asks for. In light it
stays `#f2f2f7`, unchanged, because on white that was always right.

## The three trays stay three copies

`way-in.module.css` argues at length for writing the tray out per sheet rather
than sharing it, and closes: *"the day a third sheet wants a tray is the day it
becomes the ui's."* #119 brought the third sheet. Extracting it is a change of
its own and is deliberately not this one — this is a colour bug, and a refactor
riding on a colour bug is how a review stops being able to see either.

What did change is that the repetition is now checked rather than merely
explained: `recap-tray.source.test.ts` reads all three stylesheets and asserts
they draw one ground, one padding, one corner and one gap. It leaves `margin`
alone, which is genuinely different in each — that is where a tray sits in its
sheet, not what a tray is.
