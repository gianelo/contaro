# The tabs are where a thumb goes, and the button is what it does

#35 asks for the tab bar the canvas draws: four labelled destinations with icons, and a round button raised above the middle of the bar. Before this the bar was four words and no icons, and the way to record a Movement was a full-width link at the foot of the month's list.

## The button is the point of the bar

Story 17 in #1 asks that recording an expense take under ten seconds. Most of those seconds are spent walking to the control, and the link at the foot of the list charged for that walk twice: it was a scroll away on the one screen that had it, and absent from every other. A person looking at their Budget who remembered a coffee had to leave the Budget first.

So the way in stops being a thing on a screen and becomes a thing on the bar, which is on every screen inside a Space. It sits in the middle because that is what either thumb reaches, and it is raised because a control that hangs above the bar is not read as a fifth tab.

It is not a tab in the code either. `TabBar` takes `tabs` and, separately, an optional `action`, and splits the tabs around it at `Math.floor(tabs.length / 2)`. The four destinations keep their even share of the bar; the button is a fixed 50px sitting in the gap. A fifth `flex: 1` column would have made the four labels uneven and made the button a place rather than an act.

The canvas draws it with a plus and no words, which leaves a screen reader at the most important control in the app able to say only "link". So it carries an `aria-label`, and the words are the ones the link it replaces used: "Anotar un movimiento". The two end-to-end journeys that clicked that link still click it, by the same name, in its new place.

## Categorías leaves the bar and Ajustes takes its place

Four tabs are four everyday destinations. The Categories catalogue is not one: a person writes it once and then rarely, and it was spending a quarter of the bar on a screen opened twice a year.

So the catalogue moves inside Ajustes, one tap further away and no further, and its two screens (`/categorias` and `/categorias/nueva`) now render under the `settings` tab so the bar keeps saying where the person is.

Ajustes is a screen this change creates and it holds one row. That is deliberate rather than embarrassing: it is where whatever comes next that is not money will go, and a `GroupedList` is what one row grows into without being rebuilt. Its list is labelled rather than hidden, because the screen's own heading is the Space's name — without the label a person arrives at "Casa" and a bare row saying "Categorías".

## What is read off the canvas and what is a token

The colours, the pill radius, the 24px below the bar and the semibold of an awake label already had tokens, and use them. Four numbers did not: `9px` above the bar, `3px` between an icon and its word, the `10px` label, and the `50px` button raised `-18px`.

They stay literals inside `tab-bar.module.css`, which is the only file that uses them. Inventing `--space-2point5` for a 3px gap would put a number in the global scale that nothing else in the app can want; a value used in one place is not a token, it is a value. The 10px label is the one place in the product where a word is a caption under a drawing rather than text to read, which is why it sits below the smallest type token rather than becoming one.

Being literals is exactly what makes them easy for a redesign to leave behind — nothing else in the app would break — so `tab-bar.source.test.ts` reads them back out of `design/Presupuesto.dc.html` and the stylesheet together, the way `width.source.test.ts` pins the column against `canvas.json`. It reads them out of the slice of the artboard that starts at the bar's top line rather than out of the whole file: the same greys and gaps are drawn higher up the screen, and a pattern that matched one of those would pin the bar to a number that is not the bar's.

The awake label is semibold and the asleep one is regular, which is two steps and not one. The bar this replaces was medium asleep, so the jump the canvas draws was arriving at half strength. The canvas declares a weight on the awake label and none at all on the asleep one, and the source test holds both ends of that.

The bottom padding is the one that is not a literal: `max(var(--space-10), env(safe-area-inset-bottom))`. The canvas's 24px of nothing under the bar is a phone's home indicator drawn on a artboard that has no `env()`, so on a real phone the safe area wins and on everything else the canvas's number does.

## Consequences

The raised button overflows the bar upwards by 18px. Nothing between `.action` and `.shell` sets `overflow`, which ADR-0025 already forbids for a different reason — an `overflow` on `.shell` makes it a scroll container and the bar's `position: sticky` stops sticking. The two rules now hold each other up.

Every screen inside a Space gained one 44px target, so five counts in `hit-targets.spec.ts` moved by one. They were measured in a real browser and the 50px button passed on the first run; what changed was the arithmetic, not the geometry.

`budget.spec.ts` told the month's rows apart from the way to record a new one by text, because both lived under `/movimientos/`. The raised button has no text at all, so that filter stopped excluding it; the rows are now told apart by where they go, which is what they always differed by.
