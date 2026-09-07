# The canvas is 844px tall and the phone gives 664

#60 says `Guardar` is below the fold on the screen the product rests on, and
that it happens "at 390×844 — the viewport the whole e2e suite runs on". The
first half is right. The second half is the reason nobody caught it earlier.

`devices["iPhone 13"]` is not 390×844:

```
$ node -e "console.log(require('@playwright/test').devices['iPhone 13'].viewport)"
{ width: 390, height: 664 }
```

844 is the height of the *device*. 664 is what is left after Safari's address
bar and toolbar, and it is what the suite has always run on, what `100dvh`
resolves to with the bars showing, and what a thumb at the till actually sees.
The two numbers are 180px apart — a fifth of the screen.

Both artboards this screen is checked against — `design/Main.dc.html` and
`design/CargarGastoOscuro.dc.html`, the two `entry.source.test.ts` reads — draw
their frame `height: 844px`, grow a spacer above the keys to pin them to the
bottom of it, and fit everything with room to spare. Neither was drawing a
phone. Every geometry number ADR-0028 checked against them was checked against
a frame no phone has ever shown.

Measured in the browser, on the worst screen a shipped Space can produce — two
Members, so the head carries the "Compartido con" pill, and nothing added to the
catalogue, so the picker offers all nine headings:

```
   116px  head                       912px of document
    48px  Gasto / Ingreso            664px of viewport
   132px  figure + currency          ---------------------
    65px  Hoy · quién · Cambiar      248px over
   167px  CATEGORÍA (three rows)
   224px  keys
    44px  Guardar
   100px  five gaps of 20px
    16px  the shell's padding
```

248px is not a nudge. It is 27% of the screen, and the entire whitespace budget
between blocks is 100px. #60 offered four ways to give — a pinned foot, a
collapsed picker, a smaller figure, a scrolling screen — and listed them without
this number. Two of them are worth about 40px each.

## A third of it was never a design decision

`p.figure`, `p.currency`, `p.shared` and `p.line` were carrying the browser's
default `margin: 1em 0`. `globals.css` resets `box-sizing` and `html`/`body`,
and stops there. Every one of those paragraphs is laid out by a parent's `gap`,
so the margin was not spacing anybody chose — it was space nobody could see and
nobody had asked for, sized off each element's own font:

| | margin | measured | intended |
| --- | --- | --- | --- |
| `.figure` | 17px × 2 | | |
| `.currency` | 12px × 2 | `.readout` 132px | 74px |
| `.shared` | 13px × 2 | `.head` 116px | 90px |
| `.line` | ~12px × 2 | `.when` 65px | 40px |

**109px.** ADR-0028 says the currency "sits 2px under the figure — the currency
is a caption under the number and not a line of its own — so the keypad's gap
belongs between this and the keys". In the browser they were 31px apart. The
artboard was not being implemented; it was being approximated and then written
down as though it had been followed.

That is worth stating plainly, because it is the trap and not the fix: a
stylesheet that composes with `gap` and a document made of `<p>` will disagree
silently, and the disagreement reads as a design problem. The reset is written
on the four paragraphs rather than as `p { margin: 0 }` in `globals.css`,
because a global reset would move every screen in the app and no test in the
repo covers that.

## The decision

139px left. The blocks that are not negotiable — the head, the toggle, the
figure, the day line, `Guardar`, the shell's padding — come to 312px. The keys
are 224px. That leaves the picker and the whitespace to find it in.

The picker was 167px because nine headings wrap to three rows, and it gets
worse: a Space that adds Categories adds rows. But the picker has a second
state, and it is the one a thumb is in when it reaches for `Guardar`. Measured,
choosing "Comida" gave **154px** — *shorter* than the unchosen 167px, because
the three-row grid collapses to a chosen heading plus what it holds. The
intuition that answering makes the screen taller is wrong, and it is worth
having measured rather than assumed.

Both states have to fit the same budget, and two stacked groups need 146px —
two 23px legends, two 44px rows, and the gap between them. There is no
arrangement of the remaining space that holds 146px twice. So:

**The Category picker is one row, in both states.** Nine headings do not wrap;
they scroll sideways. Choosing one swaps what the row offers for the heading
plus what it holds, with the way back leading it. 67px, always, whatever a
Space's catalogue grows to.

**The keys stay 50px.** They are what a thumb lands on while standing at a till
with one hand on the phone, and 44px would have bought 24px — real, and the
wrong 24px. The whitespace between blocks gave instead: `.form`'s gap goes from
20px to 8px, which is 60px and costs nobody a target.

```
    90px  head                       643px of document
    48px  Gasto / Ingreso            664px of viewport
    74px  figure + currency          ---------------------
    40px  Hoy · quién · Cambiar       21px to spare
    67px  CATEGORÍA (one row)
   224px  keys
    44px  Guardar
    40px  five gaps of 8px
    16px  the shell's padding
```

21px is thin, and it is thin on purpose: the alternative was 45px bought with a
smaller keypad.

**That 21px is spent, and the keypad is what bought the rest (#66, ADR-0048).**
A Movement is called something now, and the field is a seventh block this screen
had no room for: 701px against 664 with the label drawn, 679 with the label off
the screen and still in the accessibility tree. The air gave first, exactly as
this ADR says it should — `.form`'s gap from 8px to 6 — and did not cover it.
So the keys went to 44px, which is `--hit-target` and not a number chosen to make
the screen fit. The table above is the shape of the screen before that block; the
order in which it spends is what survives, and ADR-0048 carries the arithmetic.

## What it costs

A sideways scroll is a worse offer than a wrapped list. Nine headings do not fit
390px, so most of them are behind a swipe, and the scrollbar is hidden — it
would take height the screen does not have — so nothing on the screen says they
continue. That is the price of the row, paid on every Category picker in the
product, and it is named here rather than discovered later.

It also blinds a test. `e2e/movements.spec.ts` asserts this route has no
sideways scroll by reading `documentElement.scrollWidth`. A scroll container
clips its own overflow, so the document never learns about the row: that
assertion does not pass any more so much as it stops being able to fail for this
reason. It still guards every other element on the screen, which is why it
stays.

## Three changes reach beyond this screen

ADR-0028 named two that did, and the same honesty is owed here. Only the pill's
margin (`nuevo/head.module.css`) belongs to this route alone. The rest travel:

- **`.figure` and `.currency`** live in `src/ui/keypad.module.css`, and
  `Keypad` is drawn by `presupuesto/form.tsx` and `presupuesto/fixed-form.tsx`.
  Both budget forms get the 58px back.
- **`.chips` and `.chip`** live in `src/ui/chip-field.module.css`. Every
  Category picker in the product now scrolls sideways instead of wrapping —
  ADR-0022's field "is every screen that picks a Category", and this is that
  sentence being paid.
- **`.form`'s gap** and **`.line`'s margin** land on the screen that corrects a
  Movement, because ADR-0028 shares `MovementForm` with it.

That last one deserves its own number. The correction screen keeps its tab bar
and its Space heading, so it is strictly taller than this one, and it measures
**972px against 664**. The cuts here shorten it by about 243px — the picker, the
gaps, the figure and the line all apply — and it is still 308px over. It was
over before and it is less over now. It is a different route with a different
job, #60 names only `/movimientos/nuevo`, and fixing it is not this change; but
nobody should read this ADR and believe every screen in the app now fits.

**#73 is that number, and ADR-0047 is where it was paid.** It comes to 639px
against 664, with `Guardar los cambios` ending at 571 rather than 750. It did not
come out of the cuts here: nothing was left to cut on that screen with 78px of
tab bar on it, so it leaves the shell the way this one does. The 21px above is
untouched, which was the constraint — `MovementForm` is shared, and a change on
that screen that reached into this one would have failed here silently.

Two things this ADR missed reach back onto this screen, and they are the same
thing twice: a block on it was as tall as somebody's name. The pill whose margin
is zeroed above wraps onto a second line for a long enough name — 30px that 21px
never covered — and the `Hoy · <Member>` line wraps for the same reason, at 14px.
ADR-0047 makes both one line, and the fold test above now seeds names long
enough to prove it. Until then, 643 was a measurement of `Ana Gasta` rather than
of the screen; it is 643 for any Member now.

## Where it is held

`e2e/movements.spec.ts`, in "an expense is recorded on a phone without scrolling
down either" — the vertical companion to the sideways one. It seeds the
two-Member Space and the shipped catalogue on purpose, and asserts the fit
**twice**: once as offered and once after answering, because the second is the
state `Guardar` is pressed in. `app-shell.module.css` is `min-height: 100dvh`
with no `overflow` rule (ADR-0025), so a seventh block on this form grows the
document past the viewport and both assertions fail. That is #60's third
acceptance criterion: the next thing added here fails a test rather than pushing
`Guardar` off the screen.

What it cannot see: an element added *inside* the chip row, and anything
`position: fixed`.

## ADR-0028 is amended, not overturned

Everything ADR-0028 decided about *what this screen is* stands: it leaves the
shell, `Cancelar` lives in the head, the figure is one figure at two sizes,
`Gasto`/`Ingreso` is a segmented control, changing the day is deliberate. The
sentence that is now wrong — "this screen is as tall as what is on it" — is
corrected in ADR-0028 itself rather than only here, because a reader who opens
0028 has to find the reversal there.

ADR-0022's two-step reading survives, and survives where it was always doing the
work: the legend. Offered, the row asks "CATEGORÍA" over nine headings.
Answered, it asks "¿Algo más preciso?" over the chosen heading and what it
holds. The heading is still an honest answer in one tap, what it holds is still
an offer and never a demand, and the way back is still written and not drawn as
a chip. What is gone is only the second legend, which was the part that cost
79px.

Both groups already shared one `name` — they were one radio group drawn as two —
so merging them changes the drawing and not the semantics.

## Consequences

- `ChipField` gains `before`, one slot at the head of the row, which is where
  the way back sits. `.chip` gets `flex: 0 0 auto` so "Restaurantes y delivery"
  keeps its width and the row gives way instead — ADR-0036's rule, on a
  different axis.
- The row's `overflow-x: auto` computes `overflow-y: auto` with it, and clipping
  runs on both axes. A chip's focus ring is `outline: 2px` at `outline-offset:
  2px`, so the row is padded 4px on all four sides and pulled back by the same
  4px of negative margin: the ring is drawn, and the row takes no more room and
  starts no further in. The inline half of that matters more than it looks,
  because the first item in the row is the way back, and at `scrollLeft: 0`
  there is nothing to scroll toward to reveal it.
- A spacing decision on this screen is settled against 664px measured in a
  browser, never against the canvas's column. The six literals ADR-0028 keeps
  are still the artboard's and still checked against it; what the artboard
  cannot be trusted for is the frame they sit in.
