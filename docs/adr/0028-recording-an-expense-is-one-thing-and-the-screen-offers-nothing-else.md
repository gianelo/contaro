# Recording an expense is one thing, and the screen offers nothing else

#37 asks for the entry screen the canvas draws — the only artboard with live controls, and the one story 17 in #1 rests on. It was a tab screen with a heading, a chip pair, a folded-away `<details>`, and `Cancelar` stranded at the foot of the page.

## The screen leaves the shell

It renders `AppShell` directly rather than going through `SpaceScreen`, which is the one thing every other screen inside a Space does. That is the whole difference and the rest follows from it: a person recording an expense is doing one thing, and a bar offering three other places is three ways to lose what they typed.

It is the counterpart of ADR-0027 rather than an exception to it. The raised button in the middle of that bar exists so the way in is under a thumb on every screen; what it leads to is the one screen with nothing else on it. It also settles something #35 left behind — that button rendered on this very screen and pointed at itself.

`Cancelar` moves into the head with the title, because a person who changes their mind is at the top of the screen or at the keypad, and the foot of the page is a scroll past both. The title is centred by an invisible copy of the word `Cancelar` taking the room on the other side: a fixed width would have to be guessed, and would be wrong in another language.

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

Two changes reach beyond this screen on purpose. A `ChipField` legend is one step quieter everywhere, because a section label is a signpost over the thing it names. And a disabled `Button` is filled with grey everywhere instead of faded to 40%, because a half-opacity control means "loading" in every other product a person has used.

Nine call sites in the end-to-end suite reached the day and the attribution through `getByText("Cambiar")` and a `<details>`. They now go through one `changeWhen` helper that opens the sheet, changes what it was given, and shuts it again — leaving it open would leave `Guardar` behind a scrim, which fails as a timeout rather than as what it is.

Only `primary` and `destructive` take the grey ground. A `plain` button is text on nothing, and filling it would turn a dead link into a grey block — louder disabled than it ever was alive; it goes quiet instead.

Six numbers are read off `design/Main.dc.html` and kept as literals for the reason ADR-0027 gives, which means they are also kept to the rule ADR-0027 gives: `entry.source.test.ts` reads them back out of the artboard and the stylesheet together. It reads the dark artboard too, which is the only reason the invisible thumb has a test at all.

`next build` type-checks the end-to-end suite and `tsc --noEmit` does not, so a helper whose callback returned `Promise<string[]>` where `Promise<void>` was declared passed `pnpm verify` and failed the build.

The order down the screen was left alone, on the ticket's own word that it "is already right". That word contradicts the artboard the same ticket points at, and the canvas is what was designed: #52 is the correction, and it has to split `Keypad` to get there, because the figure and the keys are one component and the canvas puts three blocks between them.

#52 made that correction. `Keypad` became `Readout` and `Keys`, and the entry screen reaches for the two directly: the direction above the figure, the keys last after the chips. The keys lost their `currency` and their `locales` in the split, which is the seam saying where it is — a key press is a number pushed in, and which money that number counts is the readout's half. `Keypad` survives as the two composed, because the budget forms do draw them together and their canvas asks for exactly that. What #52 copied is the order and not the artboard's geometry: the canvas grows a spacer above the keys to pin them to the bottom of a 844px frame, and this screen is as tall as what is on it.

The lesson is in what stayed green. Every number on this screen was read back out of `design/Main.dc.html`, and none of them was wrong; the order was, and nothing read it. So `entry.source.test.ts` now names six blocks by a landmark in each file and compares the sequence the artboard puts them in with the sequence `form.tsx` does, and `form.test.tsx` reads the same order off the rendered document. A canvas has a shape as well as values, and only the values had a test.

One more thing a weak assertion was hiding: a test that only checked `toHaveBeenCalled()` on the day picker passed while `userEvent.type` composed nothing at all. A `type="date"` input takes a whole date at once, and typing into a controlled one whose parent is a mock types against a value that never moves.
