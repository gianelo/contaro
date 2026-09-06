# The ceiling is a measure and never a phone

#75 reports that on any phone wider than 390px the app draws itself as a 390px
column with dead background down both sides, and that the tab bar stops short
of both edges — read on the device as *double padding*: first the dead bar the
ceiling leaves, then the 16px `--gutter` inside it. Two insets where the design
draws one.

The arithmetic is small and it is the whole bug. On an iPhone 16 Pro Max the
screen is 440px and the ceiling is 390, so the bar starts at `(440 - 390) / 2`
— **25px in from each edge**. That number is not a reading of the stylesheet;
it is what Playwright measures with the old ceiling in place, and the two tests
this change adds fail on exactly it.

## One token was answering two questions

`--column: 390px` answered "what width does the canvas draw at?" and "how wide
may the app grow before it stops?" with a single number. The first is a fact
about `design/canvas.json`. The second is a decision about screens the canvas
has never drawn.

ADR-0025's proudest heading — _"the numbers are read off the canvas, not chosen
here"_ — is where the two got welded. It is right about the gutter: 16px down
both sides of a list is a drawing decision and reading it off the drawing is
correct. It is wrong about the ceiling, and it could not have been right. A
canvas that draws every artboard at one width has said *"here is a phone"*. It
has not said *"and no wider"*, because a maximum is a claim about everything
outside the frame. Reading `--column` off `390` did not read a ceiling off the
canvas; it **promoted a drawing width into one**, and the promotion was
invisible because at 390px the drawing width and the ceiling are the same
number.

Four device generations is what the welding cost. Every iPhone since the 13 and
every Pixel is wider than 390.

## Why the suite could not see it

`playwright.config.ts` runs one project, `devices["iPhone 13"]`, at 390px —
*exactly the cap*, the one width in the whole range where the bug cannot
appear. `e2e/width.spec.ts` pinned the width twice and both pins landed
somewhere safe: at 390, `viewport.width - gutter` and the column edge are the
same number, so no assertion can tell them apart; at 1280, centring is what is
wanted. Nothing ran between 391 and 1279, and every phone lives there.

This is ADR-0037's lesson on the other axis. There the canvas drew an 844px
frame no phone has ever shown and every vertical number was checked against it.
Here the canvas draws a 390px frame and the ceiling was read off it. Same
mistake, same cause: **a canvas has a frame as well as values, and the frame is
not evidence about anything outside itself.**

## Raising the number would have been the same mistake

The obvious repair is to move the cap to the widest phone. It is one number and
a one-line diff, and it is wrong for the reason the bug is instructive: 390 was
"one 2021 phone", and 448 is "one 2025 phone". The day a wider handset ships,
this issue reopens with a bigger number in it.

Worse, the device list does not stop where #75 says it does. Its table ends at
448px (Pixel 8 Pro, Pixel 9 Pro XL), and Playwright 1.62.1 also ships a
**Galaxy A55 at 480px** and a **Galaxy Z Fold 6 Cover at 484px**. A cap set at
the issue's own widest phone would have shipped this bug again, 32px narrower,
to the two handsets the table missed.

The other option — filling to some breakpoint and capping above it — only
differs from a plain `max-width` if the breakpoint sits above the cap, and then
a window growing from 449px to 500px makes the content *shrink* from 449 to
390. Content narrowing as the screen widens is not defensible.

## The decision

**The ceiling is a reading measure, not a device width.** `--column` is gone;
`--measure: 512px` replaces it, and `app-shell.module.css` and
`bottom-sheet.module.css` read it exactly where they read the old one.

Nothing else about ADR-0025 moves. The ceiling still belongs on `.shell` rather
than on `.content`, because the tab bar is a sibling of the content and its
`border-top` is the line that says how wide the app is. The gutter still
belongs on what the shell wraps. There is still no `overflow` rule. The two
things the shell cannot reach still answer for themselves. **The rule was right
all along; only its number was a phone.**

`max-width` is a ceiling and not a width, which is the property that makes one
declaration serve both screens: on a phone it never binds, so the shell is as
wide as the glass and the bar reaches both edges; on a monitor it binds, and
`margin-inline: auto` centres what is left. #36 does not regress — a laptop
still gets a centred column and not a stretched one.

## Where 512 comes from

Not from a handset, which is the point. It is chosen as the width past which
one column of 17px text stops reading as the thing that was drawn, and then
constrained by a property the device list *can* answer: it has to stand in the
empty band between the widest phone held upright and the narrowest tablet.

In Playwright 1.62.1 that band is **484px to 599px** — 484 is the Galaxy Z Fold
6 Cover, 600 is the Blackberry PlayBook and the Nexus 7. 512 sits inside it
with 28px of clearance below and 88px above.

"Phone held upright" needs saying out loud, because the list contains two
screens it does not mean. The **Galaxy Z Fold 6 at 928px** and the **Fold 7 at
984px** are `isMobile`, are upright, and are wider than every iPad in the
catalogue. Unfolded, they are a phone by hardware and a tablet by screen — and
a ceiling answers screens. So they belong on the far side of the band with the
tablets, they get a centred column, and that is correct rather than tolerated.
Naming it matters because the alternative is a constant called
`widestHandset` quietly meaning "widest handset except the two that would break
it", which is how the 390px ceiling survived: not by being defended, but by
never being stated. The constant is `widestPhoneShaped` and the test comment
says which screens it excludes and why.

The number was then checked the way ADR-0037 requires a width decision to be
checked: **measured in a browser, never against the canvas.** `/espacios/{id}`
rendered at 390, 440, 484, 512 and 900. At 512 the summary card widens and
`Gastado`/`Presupuestado` get more room, which is ADR-0036's problem eased
rather than aggravated; nothing wraps that did not wrap before, and no row
reads as a label stranded from its value. At 900 the column caps and centres
and the bar is bounded by it.

## What guards it

`src/ui/width.source.test.ts` no longer pins the ceiling to the canvas, because
that coupling is what this ADR severs. What replaced it reads the device list
and asserts three things:

- the band is still empty — no mobile viewport upright between 484 and 600;
- the ceiling does not cap a phone (`>= 484`);
- the ceiling does not stretch a tablet (`< 600`).

Both edges, because a ceiling can be wrong in two directions: too low and it
caps a phone, which is this bug; too high and it stretches a tablet, which is
#36 coming back. Probed against the token, the test passes on 484 through 599
and fails on 483 and on 600. The first assertion is the one that matters most
over time: **the day a handset ships into the band, the test fails and the
measure gets decided again with that screen on the table** — rather than a
suite quietly passing, which is what the 390px one did for four generations.

`e2e/width.spec.ts` gains the viewport that was missing: 440px, taken from
`devices["iPhone 16 Pro Max"]` — the phone #75 opens on — overriding the
viewport alone, so the emulated device underneath stays a phone the way
ADR-0025 wants. It asserts the app fills the screen and the bar reaches both
edges, and it asserts its own premise (`viewport.width > 390`) so a phone
Playwright renarrows cannot leave it passing green over the exact width that
hid this.

The laptop pair stopped saying `390` and now reads the ceiling off the running
app through `measureOf`, joining `gutterOf` and `hitTargetOf`. ADR-0025 already
argued why: a literal in a spec file is a second place for a value, and it
keeps passing while the app moves. It moved.

## What this costs

**Nobody has designed the screen at 512px.** Every artboard is drawn at 390,
so between a phone's width and the ceiling the app is stretched rather than
laid out — rows keep their two ends and gain the difference as space between.
The browser check says that reads acceptably today; it is not the same as
having been drawn, and the canvas cannot answer a question it was never asked
at more than one width.

The app→canvas coupling is gone for width. A redesign that moves the artboards
no longer breaks a test about the ceiling, because the ceiling is no longer the
artboards' to move. The gutter's coupling survives untouched.

What this does not do is lay anything out for a wide screen. #1 still defers
that on purpose, and the column is still centred rather than rearranged.

## Consequences

- `--column` no longer exists. `--measure` is the one name, and
  `width.source.test.ts` still holds the list of files allowed to say it:
  `ui/app-shell.module.css` and `ui/bottom-sheet.module.css`, and nothing else
  may invent a `max-width` of its own.
- `segmented-field.tsx` argued that a fourth answer "inside a 390px column"
  leaves four labels nobody can read, and ADR-0030 narrates that comment
  sentence for sentence. The column is not 390px any more; the claim survives
  because it was always about the *narrowest* column, and the narrowest phone
  is narrower than 390. Both say so now rather than naming a number that moved.
- Four more sentences described the old ceiling as a phone's width and were
  corrected with it: `app-shell.module.css` and `bottom-sheet.module.css` on
  the rule a monitor-wide bar or sheet would draw "under a phone",
  `width.source.test.ts` and `e2e/width.spec.ts` on the same image. A ceiling
  of 512px rules under a narrower column, not under a phone.
- `tab-bar.source.test.ts` and ADR-0027 both cited `width.source.test.ts` as
  the file that "pins the column against `canvas.json`". It no longer does, and
  both now say so. ADR-0035 cited the canvas as the source `--column` and
  `--gutter` were taken from; the gutter still is and the ceiling never could
  have been, and it says that too.
- `width.source.test.ts` keeps reading `canvas.json` even so. The assertion
  that all ten artboards are drawn at one width has nothing to do with the
  ceiling any more, and it stays because the drift it catches is real and
  independent: `tab-bar.source.test.ts` and ADR-0027 read numbers out of a
  single artboard, and every such reading assumes the ten are still one frame
  rather than several.
- ADR-0025 is amended in place, not merely superseded here, so a reader who
  opens it finds the reversal where the wrong sentence is.
