# A screen inside a Space names itself, and the month is chosen rather than walked

#40 asks for the head of the Budget screen as `design/Presupuesto.dc.html` draws it: the screen's name and a month pill on one row, the Space and its currency quiet underneath, and a summary card holding what the month cost against what it was planned to. Three of those four look like styling and are not.

## The title belongs to the screen, and the Space keeps its promise elsewhere

`SpaceScreen` drew `<h1>{space.name}</h1>` for the ten screens that render it, and the promise that a screen always says which Space it is showing was being kept *by that heading*. That is the fragile place to keep it: a title is the first thing to be replaced the moment a screen has something of its own to say, which is exactly what happened here.

That promise is worth stating precisely, because `screen.tsx` has been crediting it to ADR-0010 and ADR-0010 does not make it. ADR-0010 is *"The URL names the Space, and nothing else does"*: the identifier lives in the address and every route re-asks `findSpaceForMember`, which is what makes the *address* honest and what the product's privacy rests on. Nothing in it says a screen must print the Space's name. Saying it in words is a separate product rule — a person in two Spaces cannot trust a screen that does not — and it had no written home before this ADR. Both doc comments are corrected in the same change.

So the promise moved off the title and onto a line that has no other job. `SpaceHead` takes an optional `title`; without one the Space is still the heading and its currency the line under it, and the other nine screens are untouched. With one, the screen names itself and the line under it becomes `"{space} · {currency}"` — the Space and the money every figure below is denominated in (ADR-0001), together, because on this screen they are one fact about where you are.

The currency is written out in full, `"Casa · Peso argentino (ARS)"`, where the artboard draws a bare `COP`. `currencyLabel` is the one way a currency is named in this product, and the code is on the screen beside the name deliberately — it is what a second Member sees when they are invited in. A second, shorter way of naming a currency for one line is a second answer to a question that already has one.

The Budget screen passes `t("nav.budget")`, which is the tab's own word. What a thumb pressed and what it landed on are then the same word rather than two names for one place.

`SpaceHead` is its own file rather than four lines inside `SpaceScreen` for a second reason: `SpaceScreen` renders the account slot, which is an async server component, and that puts the whole shell out of reach of a test that only wants to read a heading. The head is the one part of the shell a screen gets to change, so it is the part worth being able to test.

The tracking is the part of #40 that reads as a detail and is not, because the ticket's premise about it is false. It says the Space list already carries `-0.6px` and that copying the artboard would make this heading the odd one out. The Space list's greeting carries `-0.4px`, at `--text-2xl` — a different size, and so not the same decision. The product has exactly two other headings at `--text-title`: the sign-in screen and the UI gallery, and **both** carry `-0.6px`. So `-0.6px` is the product's rule for this size and not a third opinion, and the value agreeing with the artboard is the agreement rather than the argument.

## Fourteen months, one tap, and why the window is a year

The `‹ Septiembre ›` walker was one tap and one page load per month stepped over. Reaching March from September was six of both, five of them screens nobody wanted to look at.

`monthsToPlan` stops answering "the month either side" and answers "every month a plan can be opened on": the twelve of the year the month in view falls in, plus December of the year before and January of the year after. Fourteen, each one tap from the pill.

The year is the window because that is the unit a person reads a calendar in, and it is fixed by the month in view rather than centred on it — a window that slid as a thumb moved inside it would put March in a different place on every opening, which is the thing a picker exists to stop. The month either side of the year is there for the one case a bare year gets wrong: planning January on the 28th of December.

The window is what got traded, and it should be said plainly: the walker's backwards reach was unbounded, and this is not. A month more than a year away is now two openings of the pill instead of one, where it used to be one tap repeated as many times as it took. Reachability is unchanged and only the shape of the effort moved, from linear in the number of months to roughly one opening per year. That is the trade a bounded picker always makes, and it is worth it here because a picker that reaches every month there has ever been is a picker nobody can scan — but #40 did not ask for the reach to be bounded, so this is the ADR's decision and not the ticket's.

Forwards is still there, which is what a plan needs and a ledger does not: `monthsAround` stops at the month being lived in because a Movement is money that has already moved, and `monthsToPlan` does not because the month after this one is exactly the month somebody plans on the 28th (ADR-0019).

Three smaller decisions inside the pill:

**A sheet and not a menu hanging off the pill**, because a sheet is what this app opens for a deliberate choice everywhere else — `When`, and the payment confirmation.

**Links and not buttons**, for the reason a row that goes somewhere is always a link here: a month is a place, it has a URL, and somebody can open one in a new tab or send it.

**The sheet closes itself as a month is chosen**, and that took a change to `GroupedListItem`: it now passes an `onClick` to the `Link` as well as using one to make a button. Picking a month is a client-side navigation, which leaves the pill mounted — without this the sheet stayed open, and covering, on the month it had just opened. That is a bug the unit test caught only because the e2e run found it first, and it is why the row-level handler is documented as "what the row also does on its way" rather than left to look like a copy-paste.

## The two figures come back together, and #11's meter finally ships

"Gastado" and "Planeado" have been on this screen since #10, deliberately in separate lists so that neither read as a comparison before #11 decided what "over" means. #11 decided it and then could not draw its own last criterion — "the summary card's meter shows the month against its plan" — because the card it named arrives here. `Meter`'s doc has been saying "7 in a row, 10 across a card" with no caller for the second number ever since.

The card is that comparison, so both halves of it come out of one reader answer. `ReadableMonthSummary` is one shape and not four fields, because a screen that could take the figures from one place and the meter from another is a screen that can draw the meter of one month beside the figures of another.

`monthAgainstPlan` is a new domain function rather than arithmetic in the reader, for the reason `CategoryComparison.share` already lives in the domain: a screen doing sums on `Money.amount` is a screen that can disagree with the figures printed beside it.

It is **not** `comparedToPlan` summed up, and the difference is in the numerator. A Category's row is driven by the plan, so spending on a Category nobody planned for has no row and belongs in none. "Gastado" on this card is what the month cost — the same figure the month's list prints at the top of its days — so a total that quietly dropped the unplanned half would disagree with the other screen showing the same month.

A month nobody has planned answers `null` for the share rather than zero. Zero would mean "you have spent none of your plan" and draw an empty meter across a plan that does not exist; `null` means there is nothing to measure against, and the card draws no meter at all. The plan's own empty state already says the true thing, in words, further down the screen.

The meter turns on a month past its plan, which #40 did not ask for and #11's rule requires: a full bar in the accent colour on a month that has blown its plan reads as "done". It is never the only carrier — spent above planned is written out in the two figures directly over it.

## Consequences

`Pace` stops being a `GroupedListItem`. It was a row of the month's own group, and that group *was* the summary card the canvas always drew it inside; now the card exists, where the sentence sits is the card's decision and `Pace` draws the sentence and nothing around it.

`budget.planned` ("Planeado") is retired for `budget.budgeted` ("Presupuestado"). The participle was right for the last row of a list of things somebody had planned; on the card it is half of a pair of nouns read against each other, the way the month's list writes "Ingresos" and "Gastos".

`--text-figure` joins the scale at 26px, named for its use the way `--radius-card` is rather than wedged between `--text-2xl` and `--text-3xl`: it is the one figure on a card that is the subject of the card, and nothing else wants that step.

The quiet line under a title drops from 15px to 13px, which is what both artboards drawing a head actually draw, and it applies to all ten screens because it is a correction rather than a fork. It is the one piece of this change that reaches beyond the Budget screen's head, and it reaches there deliberately.

The title clamps to one line with an ellipsis **only where something shares its row** — `.title:not(:only-child)`, which is exactly that question asked of the row, because `beside` renders nothing on the nine screens that pass none. A title alone has the whole width and should wrap onto a second line rather than lose its end; the first draft clamped all ten and would have started truncating long Space names on nine screens that never asked for it.

`GroupedListItem` now forwards `onClick` to its `Link` as well as using one to build a button, and the month picker is the only caller passing both; it is inert everywhere else.

What this postpones: `design/Movimientos.dc.html` draws the same 32px title and the same month pill, and the month's list still walks with `‹ ›` and still heads itself with the Space's name. `SpaceHead` and `MonthPill` are both built to be passed that screen's word and that screen's months, and neither was applied there — #40 is the Budget screen's head, and moving the ledger's head is the ledger's ticket to open.
