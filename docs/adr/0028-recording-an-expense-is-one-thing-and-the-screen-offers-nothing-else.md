# Recording an expense is one thing, and the screen offers nothing else

#37 asks for the entry screen the canvas draws — the only artboard with live controls, and the one story 17 in #1 rests on. It was a tab screen with a heading, a chip pair, a folded-away `<details>`, and `Cancelar` stranded at the foot of the page.

## The screen leaves the shell

It renders `AppShell` directly rather than going through `SpaceScreen`, which is the one thing every other screen inside a Space does. That is the whole difference and the rest follows from it: a person recording an expense is doing one thing, and a bar offering three other places is three ways to lose what they typed.

It is the counterpart of ADR-0027 rather than an exception to it. The raised button in the middle of that bar exists so the way in is under a thumb on every screen; what it leads to is the one screen with nothing else on it. It also settles something #35 left behind — that button rendered on this very screen and pointed at itself.

`Cancelar` moves into the head with the title, because a person who changes their mind is at the top of the screen or at the keypad, and the foot of the page is a scroll past both. The title is centred by an invisible copy of the word `Cancelar` taking the room on the other side: a fixed width would have to be guessed, and would be wrong in another language.

#86 made it two screens rather than one. The plan's entry screen holds the same typed-but-unsaved amount under the same bar, so it makes the same trade, and ADR-0046 has the argument for why it transfers. The head both screens wear now lives in `@/ui/entry-head` -- including the invisible `Cancelar` below, which is the part a second copy would get subtly wrong. What stayed behind on this screen is the pill, because its argument is this screen's: an expense is about to be attributed to somebody, and a plan is not.

There is no account row and no Space heading either. What somebody about to spend needs from that heading is which Space they are spending from, and the pill under the title says exactly that — and says nothing at all in a Space of one, where it would state the obvious above the figure that matters.

## The figure is one figure, set at two sizes

The canvas draws `$` at 30px weight 300 beside the number at 52px weight 600, on one baseline, with the currency written underneath. The digits are what somebody is watching appear; the symbol only says which money they are.

ADR-0007 is explicit that a bare amount reaching a person is what it exists to prevent, and that `formatAmount` is never the whole of a figure. This is not that: the symbol is right there. So it needs no amendment — but it does need the two halves to be the same figure, so `moneyParts` cuts them from one `formatToParts` rather than from two calls. Two formattings are two chances to disagree about the separators or the decimals, which is the same reason `formatMoney` and `formatAmount` already share one private `written`.

The symbol is read back out of the formatting rather than kept in a table, which matters more than it looks: a Colombian Space read by somebody in the United States says `COP` and not `$`, because to that reader a bare `$` would say dollars.

Before anything is typed the figure is a bare `0`, not `$0,00`. Nothing has been chosen yet, so there is nothing to write out to the currency's decimals — a formatted nothing reads as an amount somebody meant. It is drawn in `--color-disabled`, which is what both artboards tint it.

That token's comment claimed it also fills a dead button, and it does not: the artboards fill that with `#C6C6C8` in light and `#2C2C2E` in dark, and `--color-disabled` is `#48484a` in dark. The pair happens to match in light and not in dark, which is exactly the case a single token cannot carry, so the ground and its ink are named apart as `--color-disabled-surface` and `--color-on-disabled`. The first attempt at this borrowed `--color-on-accent` for the ink, which is the ink *for the accent ground* — in dark that is a near-black green, on grey.

The currency line sits outside the `role="status"` live region. It cannot change while somebody types, and a screen reader repeating "ARS" after every key press is reading out the one thing that did not.

## Gasto and Ingreso stop being chips

Chips are a list a person picks from and can be any length — twenty-four Categories are chips. A segmented control says "these are all of them, and one is already true", which is what a direction is: money in or money out and never a third thing.

`SegmentedField` is new, and it is `ChipField`'s technique in different clothes — a radio inside a label, the input invisible and exactly the size of its half, never `display: none`. That is what keeps the arrow keys walking it, the screen reader counting it, the form submitting it, and `required` meaning what it says.

The canvas draws each half 40px tall, which would leave a 44px track. Here the half is 44px and the track comes out 48px, because `hitTarget` is the rule this repo measures in a real browser and four pixels of a control nobody can mis-tap is the better half of that trade.

Its thumb has a token of its own, and finding out why is the reason to read both artboards rather than one. The obvious colour is `--color-surface`, and that is what this was — white in light, exactly as the canvas draws it. In dark `--color-surface` is `#1c1c1e`, which is the same value `--color-fill` resolves to, so the thumb was the colour of the track it sits in; `--shadow-raised` is `none` in dark too, so there was nothing left to tell them apart. The chosen half was invisible in the dark palette. `--color-segment-thumb` is `light-dark(#ffffff, #3a3a3c)`, which is what the two artboards draw.

## Changing the day is a deliberate act

The day and the attribution become one line that states them rather than two fields that ask. In the ordinary case both are already right — it is today, and it is the person typing — so putting a date picker and a name picker between the amount and Save would charge every expense for a question almost none of them have.

Changing them opens a sheet, which is what makes it deliberate rather than something a thumb does on the way past. The canvas does not draw this sheet; it draws four others, and this is the same primitive.

`BottomSheet` renders nothing while it is shut, so what it edits cannot be what the form submits. The two answers ride in hidden fields on the form and the sheet only moves the state behind them; the controls inside it carry no `name` at all, or the form would send two answers to one question.

ADR-0018 survives unchanged: "Hoy" is still the reader's own day, read through `useSyncExternalStore` in the form and handed down.

## Two buttons that read "Cambiar", and only one of them says so

The Category picker's way back to the whole list is also "Cambiar", and #45 settled that both words stay — in each place the word is unambiguous to somebody looking at it.

To somebody hearing it they were two buttons with one name, which is a real ambiguity and not only a test one: Playwright refused to click either. So the line's button keeps the visible word and takes a fuller accessible name, "Cambiar cuándo y de quién". It starts with the word on the screen, the way `ChipField`'s qualifier does, so anybody driving this screen by voice still says what they can see.

## Consequences

`MovementForm` is shared with the screen that corrects a Movement, and that screen keeps its tab bar and its Space heading. #37 asks for the entry screen and this gives it that; the correction screen inherits the new keypad, the new line and the grey disabled button because they live in the form, and inherits nothing else. No seam was needed.

**That last sentence is no longer true, and ADR-0047 is where it stopped being.** It was a statement of what #37 left alone rather than an argument for leaving it alone, and the argument above — the one about a bar being three ways to lose what has been typed — turned out to reach it. ADR-0046 read that argument again and found it is about the typed-but-unsaved state and not about standing at a till; the correction screen holds that state in this very component. It was also the only way that screen fits a phone: with 78px of tab bar on it there is no arrangement under 664px. It leaves the shell too, wearing the same head, and says who typed the Movement in, in the pill this one says which Space is being spent from.

Two changes reach beyond this screen on purpose. A `ChipField` legend is one step quieter everywhere, because a section label is a signpost over the thing it names. And a disabled `Button` is filled with grey everywhere instead of faded to 40%, because a half-opacity control means "loading" in every other product a person has used.

Nine call sites in the end-to-end suite reached the day and the attribution through `getByText("Cambiar")` and a `<details>`. They now go through one `changeWhen` helper that opens the sheet, changes what it was given, and shuts it again — leaving it open would leave `Guardar` behind a scrim, which fails as a timeout rather than as what it is.

Only `primary` and `destructive` take the grey ground. A `plain` button is text on nothing, and filling it would turn a dead link into a grey block — louder disabled than it ever was alive; it goes quiet instead.

Six numbers are read off `design/Main.dc.html` and kept as literals for the reason ADR-0027 gives, which means they are also kept to the rule ADR-0027 gives: `entry.source.test.ts` reads them back out of the artboard and the stylesheet together. It reads the dark artboard too, which is the only reason the invisible thumb has a test at all.

`next build` type-checks the end-to-end suite and `tsc --noEmit` does not, so a helper whose callback returned `Promise<string[]>` where `Promise<void>` was declared passed `pnpm verify` and failed the build.

The order down the screen was left alone, on the ticket's own word that it "is already right". That word contradicts the artboard the same ticket points at, and the canvas is what was designed: #52 is the correction, and it has to split `Keypad` to get there, because the figure and the keys are one component and the canvas puts three blocks between them.

#52 made that correction. `Keypad` became `Readout` and `Keys`, and the entry screen reaches for the two directly: the direction above the figure, the keys last after the chips. The keys lost their `currency` and their `locales` in the split, which is the seam saying where it is — a key press is a number pushed in, and which money that number counts is the readout's half. `Keypad` survives as the two composed, because the budget forms do draw them together and their canvas asks for exactly that. What #52 copied is the order and not the artboard's geometry: the canvas grows a spacer above the keys to pin them to the bottom of a 844px frame, and this screen is as tall as what is on it. The second half of that sentence was reversed by #60, and the first half is the reason it had to be: read on.

The lesson is in what stayed green. Every number on this screen was read back out of `design/Main.dc.html`, and none of them was wrong; the order was, and nothing read it. So `entry.source.test.ts` now names six blocks by a landmark in each file and compares the sequence the artboard puts them in with the sequence `form.tsx` does, and `form.test.tsx` reads the same order off the rendered document. A canvas has a shape as well as values, and only the values had a test.

One more thing a weak assertion was hiding: a test that only checked `toHaveBeenCalled()` on the day picker passed while `userEvent.type` composed nothing at all. A `type="date"` input takes a whole date at once, and typing into a controlled one whose parent is a mock types against a value that never moves.

#60 reversed it. That 844px frame is not a phone: `devices["iPhone 13"]` gives a viewport of 390x664, because 844 is the height of the device and 664 is what is left after Safari's bars. The suite has always run on 664, `100dvh` has always resolved to it, and so every number on this screen was checked against a frame 180px taller than the thing it was drawn for. "As tall as what is on it" came to 912px on the worst shipped Space, which put `Guardar` 248px below the fold -- a scroll between the last digit and saving, which is one of the four screens #1 says loses the expense. The screen is now as tall as the phone: the picker is one row in both its states, the whitespace between blocks went from 20px to 8px, and the keys kept their 50px because they are what a thumb lands on. ADR-0037 has the arithmetic and what it forced.

The part of this ADR that was not merely wrong but misleading is the geometry it vouched for. `entry.source.test.ts` read six numbers back out of the artboard and found them all correct, and they were: the artboard says them and the stylesheet says them. What no test read was the frame those numbers sit in, and the frame was the thing that was wrong. A canvas has a shape as well as values, and #52 gave the shape a test; it has a *frame* as well, and only 664px measured in a real browser can check it.
