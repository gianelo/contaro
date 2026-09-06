# The month is one pill, and both screens reach the same fourteen

#40 gave `SpaceHead` a `title`, replaced the `‹ Septiembre ›` walker with a pill that puts fourteen months one tap away once it is open, and applied both to the Budget screen only. ADR-0033's own closing section, "What this postpones", says what it left: *"the month's list still walks with `‹ ›` and still heads itself with the Space's name … moving the ledger's head is the ledger's ticket to open."* #61 is that ticket, and it is mostly the second call site of something already built. One part of it is not.

## The screen names itself, which is ADR-0033 applied a second time

`design/Movimientos.dc.html` draws one line doing two jobs: **Movimientos** at 32px with the `Septiembre ⌄` pill beside it. The app drew two headings — `Casa` with its currency at the top, and a centred `‹ Septiembre ›` under it — so the same screen said where you were twice and named itself never.

The month's list now passes `t("nav.movements")` as its title and its own month pill as `beside`, exactly the way the Budget screen passes `t("nav.budget")` and its own. The Space drops to the quiet line beside its currency, which ADR-0033 built that line to be. Nothing in `SpaceHead`, `SpaceScreen` or `MonthPill` changed to make this work, which is the sign #40 put the seam in the right place.

One thing on the head is deliberately **not** the artboard. `design/Movimientos.dc.html` draws the title and the pill and then goes straight to the Ingresos/Gastos cards: there is no `Casa · Peso argentino (ARS)` line under the title, where `design/Presupuesto.dc.html` draws `Compartido con Ana · COP` in exactly that place. The line stays anyway, because it is the whole of ADR-0033's argument — the promise that a screen says which Space it is showing moved *off* the title and *onto* that line precisely so a screen naming itself could not drop it, and a person in two Spaces reading a list of amounts is the case the promise exists for. Matching the artboard here would mean matching it by deleting the thing #40 built.

## The walker is gone, not deprecated

`monthsAround` had exactly one call site, and this was it. So `monthsAround`, the `MonthsAround` type, their four tests, the `space.month.previous` and `space.month.next` messages, and the whole of `movimientos/page.module.css` are deleted rather than left standing.

That matters more than the line count. A product with two ways to choose a month is a product with two things to keep in step, and the one nobody is looking at is the one that drifts. The acceptance criterion asked for the remaining call sites to be *"named and justified"*; there are none, so the honest answer was to take the function out with the screen that used it.

## Both screens take the same fourteen, and that reverses a rule

This is the part of #61 that is a decision rather than a second application.

ADR-0033, ADR-0019 and ADR-0016 all say the ledger reaches back without a bound and forward only as far as the month being lived in. The reason given is the same in all three, and it is a good one: a Movement is money that has already moved — `recordMovement` refuses a day that has not happened — so every month past this one is guaranteed empty. ADR-0016 calls offering them *"a corridor of blank screens with month names on them."*

That reason was paying for a **step**, and it stopped applying the moment the step became a **row in a list**. The walker's `›` was a control that loaded a screen; putting one on the current month meant a person tapping it got a blank month and had to tap back. Fourteen rows in a sheet cost nothing for the ones nobody taps, and closing the sheet is not a page load. The corridor was the whole objection, and a picker has no corridor.

So `monthChoices` is one function, `monthsToPlan`'s window, used by the plan's reader and the ledger's reader alike. Both screens offer the twelve months of the year in view plus one either side. This ADR supersedes that clause of ADR-0033, ADR-0019 and ADR-0016; the rest of each stands, and none of them is edited, because an ADR is a record of what was decided when.

There is a second argument, and it is the one that would have carried this even without the first: **the plan and the ledger are two readings of one month.** They wear the same pill, in the same place, on the same row of the same head. A control that offered ten months on one tab and fourteen on the next — with no visible reason, because the reason is a rule about what a Movement is — is a control whose behaviour a thumb has to learn per screen. One picker, one list.

What is given up is small and worth saying: the ledger now offers up to eleven months that are guaranteed to be empty. They read as empty, with the empty state the screen already has, and nothing is wrong on them.

## `monthChoices` is its own module, above both readers

`ReadableMonthChoice` was the Budget reader's, and the ledger importing it from there would make the month's list depend on the plan to render its own head. `MonthPill` already refused exactly that trade — its `MonthChoice` doc said so in as many words — and the same reasoning applies one layer down. That doc is corrected here rather than left standing: the import it refused would be legal now that the type has moved, and it stays refused for a different reason, which is that what a reader hands out and what a component is handed are two questions.

So the type and the function moved to `src/app/espacios/[id]/months.ts`, a directory above both readers, beside the pill that consumes them. It is not only about the import direction: the acceptance criterion is *"the same fourteen months"*, and two readers each mapping `monthsToPlan` would only **promise** that. One function is what makes it true, and its unit test is where the promise is kept.

## Consequences

`ReadableMonth` loses `around: MonthsAround` and gains `choices`, so the two readers now return the same shape for the same question.

`monthsToPlan`'s name is now slightly narrow — it is every month *a screen* can be opened on, not only a plan — and its doc says so. After this change it has exactly one importer, `months.ts`, and one test that calls it, `month.test.ts`; the word is also quoted in prose in `months.test.ts`, in `monthSoFar`'s own doc beside it, in `budget.ts`, in `e2e/link-decoration.spec.ts`, and in ADR-0019, ADR-0024 and ADR-0033. Renaming buys a better word and costs all of that, so the doc comment is where the correction is cheapest.

`docs/adr/0035` tabulates `app/espacios/[id]/movimientos/page.module.css` | `.step` among the four stylesheets that stopped compensating for link decoration. That file is deleted here. ADR-0035 is not edited — it is a true record of what its own change did — and this paragraph is the forward pointer a reader following that row needs.

The month's list drops from seven links to six on `link-decoration.spec.ts`: the step back was a link and the pill is a button until it is opened.

The e2e suite gains `e2e/months.ts`. `months()` and the two taps that pick a month existed once in `budget.spec.ts` and would have been copied into `movements.spec.ts` — a second copy of the pill's own interaction, which is the thing most likely to drift the next time the pill changes. Making the single-source argument in `src` and refusing it here would have been the same argument twice with two answers.
