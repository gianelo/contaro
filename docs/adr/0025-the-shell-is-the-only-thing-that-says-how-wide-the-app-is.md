# The shell is the only thing that says how wide the app is

#36 reports two bugs and says they are one: on a phone a card runs edge to edge with nothing for its 16px corners to be rounded against, and on a laptop the phone column stretches across the monitor. Both are the same absence — before this, no file in the app answered "how wide is this?", so twelve screens each answered it for themselves and none answered it for the laptop at all.

## The decision

The app shell owns the width. `.shell` carries the ceiling, `.content` and the account row carry the gutter, and no screen carries either.

These look like they belong on the same element and do not, because the tab bar is a **sibling** of the content inside `.shell` rather than a child of it.

The ceiling has to be on `.shell`. Put it on `.content` and the bar keeps running the full width of the monitor, drawing its `border-top` — the line that shows how wide the app is — as a rule across a 27-inch screen under a phone-wide column. #36 asks for exactly this and names it: _"The tab bar still spans the bottom of the column rather than the bottom of the monitor."_

The gutter is the mirror image. Put it on `.shell` as `padding-inline` and the tab bar inherits it, so its top line stops short of both ends and its `env(safe-area-inset-bottom)` no longer owns the bottom. So the gutter goes on the two things the shell wraps that hold content, and never on the shell itself.

One thing is deliberately absent: no `overflow` rule on `.shell`. It would make the shell a scroll container and the tab bar's `position: sticky` would stop sticking.

## The numbers are read off the canvas, not chosen here

`design/canvas.json` draws all ten artboards at `390`, and every `.dc.html` root repeats it. The 16px gutter is there too, as `padding: 0 16px` on the wrapper around each list. So neither number is decided in this ADR; both are read off the canvas, the same way `tokens.css` already reads its colours and its type scale.

They become two tokens shaped after `--hit-target` rather than after the numbered scales: an unnumbered, singular name with a comment naming who may use it. `--gutter` is `var(--space-8)` rather than a second `16px`, because 16px already had a name, and a value with two places to change it is a value that eventually disagrees with itself.

`width.source.test.ts` reads the canvas and the tokens together, so a redesign that moves the artboards breaks a test rather than quietly leaving the app at the old width.

## Where it is said

`app-shell.module.css` is the only file that answers the question for a screen the shell wraps. Two files answer it for themselves because the shell cannot reach them, and a test pins both lists so a third cannot appear quietly.

- **The bottom sheet** is `position: fixed`, so it escapes `.shell` entirely. Left alone, this change would have shipped a laptop a monitor-wide sheet sliding up under a 390px column — a regression this change introduces rather than one it found. So `.sheet` carries the same `--column` and centres itself. Its scrim stays full-bleed: it dims the screen, and a screen is as wide as it is.
- **The sign-in screen** renders outside the shell (`/ingresar` is a centred hero, not a column). It used to say `padding: var(--space-8)` as a literal of its own; it now reads `var(--gutter)`, so if the canvas ever moves the gutter, sign-in moves with it.

The component gallery at `/ui` is not in either list. It is a development route, its padding is a frame around specimens rather than a page gutter, and it gets no ceiling.

## Consequences

Nine page-level rules lost their horizontal padding, and one lost its element: `.empty` on the Space list existed only to inset a `Card`, so the wrapper is gone and the `Card` is a direct child. What is left on those rules is the vertical rhythm each screen actually owns.

`GroupedList`'s heading was the one thing already inset 16px while the card under it was not — the mismatch #36 opens with. It is now inset by the shell like everything else.

The end-to-end suite gains its first viewport that is not a phone. `playwright.config.ts` still has one project and it is still `iPhone 13` — the product is mobile-first and the run matrix says so — so what `width.spec.ts` overrides is the viewport alone; the emulated device underneath stays a phone, which is enough for a question about CSS width. Removing the ceiling makes those two tests fail with `Expected: 390, Received: 1280`.

What the browser does not measure is the sheet: opening one costs a whole budget-planning flow, so that its ceiling comes with `margin-inline: auto` — a cap without it would pin the sheet to the left of the monitor, which is worse than a wide one — is read out of the stylesheet instead.

What this does not do is lay anything out for a wide screen. #1 deferred that on purpose: _"On large screens the mobile column is centred, not stretched. A wide layout for the screens that would gain from one is deliberately deferred."_ The column is centred. Nothing is rearranged.
