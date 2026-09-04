# The pace is the Variable half of the plan, on both sides

#14 asks for a line saying whether a Space is ahead of or behind the pace of the month, and it settles half the question in its own words: "Pace covers Variable items only. A Fixed item falls due on its own date rather than evenly across the month, so measuring it against the calendar compares unlike things."

That sentence is about the **denominator** — what gets spread across the calendar. It leaves the numerator open, and the numerator is where the acceptance criteria can quietly contradict each other. "Paying a Fixed item does not move the pace figure" is written flat, with no conditions on it. But a Fixed item is paid by the Movement it creates (ADR-0023), that Movement lands in a Category like any other expense, and nothing stops a Space from planning a Variable amount *and* a Fixed item on one Category — "Servicios", with two hundred thousand of it loose and the electricity bill on the 10th.

## The decision

**Both sides of the comparison are the Variable half of the plan.** The pace spreads what the Variable items add up to, and it counts the spending that lands on the Categories those items are on — through the same heading rollup every other comparison uses (ADR-0021), and counting each Movement once, because unlike `comparedToPlan` this is a total.

"Paying a Fixed item does not move the pace figure" then holds by way of the numerator rather than by a rule about payments: rent has a Category nothing was planned to spread evenly across the month, and so its payment is not in the sum. It is not that a payment is invisible.

**Where a Variable plan covers the Category a payment lands on, the payment does count, and the line moves.** "Covers" and not "is on", because the rollup is the catalogue's: a plan on "Hogar" covers "Hogar · Alquiler" (ADR-0021), so a Space that plans a Variable amount on the heading the rent is filed under is in this case too, and not only one that plans both kinds on the very same Category. The user was asked this directly, because it is the one case where the two readings disagree on screen, and they chose it in these words: *"claro que cuenta — si de pronto mi esposa agrega otro movement"*. They were asked about the same Category; the heading is the same rule read one level up, and answering it the other way would mean a plan on "Hogar" that counts every shop under it except the one the plan screen created. The money left the account. A line that says what has been spent and then hides a payment because of how it was entered is a line telling somebody they have more room than they have.

The alternative was to recognise a Fixed item's own Movement by its `movementId` and subtract it wherever it landed. That makes the criterion true with no exceptions, and it is the smaller sentence to write in a ticket. What it costs is that the figure stops meaning "what you have spent": two Spaces with identical ledgers would read different paces depending on whether one of the expenses was typed by hand or created by tapping "Marcar pagado". The way a row got into the ledger is not a fact about the month's spending.

So the exception is real and it is written here rather than left to be discovered. A Space whose Variable plan covers the Category a Fixed item is filed under — that Category, or the heading above it — will watch that payment move the line on the day it is paid. That is the honest reading, and it is the reading the user asked for.

## What the line is, and what it is not

One sentence, not a panel, and not a second meter. The canvas draws it as the `alert-circle` beside words — "Día 18 de 30 · en gastos variables vas $620.000 arriba del ritmo" — and that is the shape the answer wants: the meters above already show how much of each plan has gone, and a third bar to compare *those* against the calendar is one more thing to read rather than the thing being read. A person needs telling, in a sentence, whether they are early or late.

The sentence names its own scope. "en gastos variables" is in the copy and not in a tooltip, so nobody has to know why the rent is not in it.

Amber and the circle only past the pace. Behind it and on it are the same quiet line with different words: an alert beside "you have spent less than you planned to by now" is a warning about nothing. And the amber is never the only carrier — "arriba del ritmo" is written out, the way `budget.over` is (#11).

**The even-pace amount itself is not written out.** #14's first criterion asks for "how far through the month it is, and what would have been spent by now at an even pace", and the line says the first and the *difference* from the second — never the 900.000 itself. The ticket contradicts itself there, and the canvas is what settles it: the issue calls that one line "the shape the answer wants", and a sentence carrying three figures is the panel it exists instead of. So `Pace` carries the day, the length of the month and the standing, and nothing that nobody reads.

On the pace is its own answer rather than an amount of zero, for the reason `over` is null rather than zero: "vas $0 arriba del ritmo" is a figure written where there is no news.

## Where it is said

`paceOf` in `src/domain/budget/budget.ts`, and it takes how far through the month it is rather than working it out. `monthSoFar` in `src/domain/calendar/month.ts` is that half: which day of how many, both inclusive, and nothing at all for a month the day is not inside.

Splitting it there is what keeps the second silence honest. The plan screen walks months in both directions (`monthsToPlan`), so "Día 18 de 30" is reachable on a month already over and on one nobody has arrived at. Both are sentences about a day nobody is standing on, and the screen says nothing rather than saying one — the same choice `dueNotice` and `Variables` make.

The day is the Reader's and never the server's (ADR-0018), which is what makes that come out right at nine at night on the 30th: the server is already in the next month, and the Member is not.

A month with no Variable item has no pace either. It has been planned — a month with the rent on it is planned (ADR-0019) — and there is nothing anybody meant to spread across it. "Vas justo en el ritmo" about no plan is a reassurance nobody earned.

## Consequences

The even-pace figure is rounded to a whole minor unit before it becomes `Money`, because `money` refuses anything else (ADR-0007) and a thirtieth of a hundred pesos is not a number of centavos.

`paceOf` asks through `spent` and `expected`, the way `comparedToPlan` does, so "income is not spending" (ADR-0016) and "two currencies are never added up" stay in one place each.

`Pace` is `MonthSoFar & { standing }` rather than two fields of the same names: which day of how many is one idea and it belongs to the calendar. The even-pace figure is pinned in the tests through a month with nothing spent in it, where how far behind the pace a Space is *is* that figure — observable where the screen is, rather than through a field carried for nobody.

The rollup is asked through `countsAgainst` with `some` rather than by summing per planned Category. That is the difference between this and `comparedToPlan`: there, one shop inside a heading and its child appears in two rows and neither row is a total; here it is a total, and counting the shop twice would be a figure nobody spent.

Spending on a Category the month planned no Variable amount for is outside the pace. A Space that plans one Category and spends freely on five others reads as being on pace, which is the same shape `comparedToPlan` already has — the rows are the plan's, and a comparison against no expectation is a figure with one half missing. If that turns out to be the wrong silence, the fix is a plan that covers the month rather than a pace that measures against nothing.

`CONTEXT.md`'s *Pace* gains the numerator. It already said which half of the plan gets spread; it now says which spending it is spread against, and names the case where a payment moves it.
