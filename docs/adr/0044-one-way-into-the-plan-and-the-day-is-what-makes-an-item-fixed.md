# One way into the plan, and the day is what makes an item fixed

There were two ways to add to a month's plan, and they were two of everything: two routes (`/presupuesto/nuevo` and `/presupuesto/nuevo/fijo`), two forms, two drafts, two server actions, and two buttons at the bottom of the Budget screen reading "Agregar un gasto previsto" and "Agregar un gasto fijo".

A person standing on that screen saw two buttons that looked the same and read almost the same, and had to know what *fijo* meant to choose between them. That is the product asking somebody to name a type before it will let them write down a number.

The second way in was recorded with a reason, on `[id]/page.tsx`:

> Its own way in, and not a choice inside the other one. The two kinds are answered with different questions -- a Fixed item is asked for a name and a day -- and a form that grew or shrank after a toggle is a form whose shape a thumb cannot predict.

That was true when it was written, and half of it stopped being true at ADR-0042: #79 gave **every** item a name. What was left of the difference was one field, the due day. One field is not a second screen.

## The decision

One route, one form, one action. The form asks a fourth question — **¿Vence un día del mes?** — and answering it with a day is what makes the item Fixed.

Nobody chooses a kind. `kind` stays exactly where it was in the domain, deciding whether an item can be marked paid (#13) and whether its Category is measured (ADR-0023); it stops being a word a person has to have learnt before they are allowed to plan a week of groceries.

The word the question uses is *vence*, and that matters as much as the merge. *Fijo* is our word for a thing the product knows about; *vence* is a word somebody already owns, and it describes the item rather than classifying it.

## The seam the merge happens at

The screen asks one set of answers. The domain keeps two shapes.

`PlannedItemDraft` in `presupuesto/plan.ts` is a `BudgetItemDraft` plus `dueDay: number | null`, and `handlePlanBudgetItem` is the one place that reads it: `null` builds a `BudgetItemDraft` and calls `plan`, a number builds a `FixedItemDraft` and calls `planFixed`.

The domain is not merged, and deliberately. A Variable item genuinely has no due day, and a `FixedItemDraft` that could carry `null` would be a type that stopped saying so — every reader of it downstream would then have to defend against a shape that cannot exist. The `if` lives at the seam because that is precisely what it is: the translation between what a person answers and what a plan holds.

`number | null` and not an optional field, for the same reason: "they said no" is an answer somebody gave, and a missing key is a form that lost one.

## One row that never changes, and this was measured

The recorded objection — a form whose shape a thumb cannot predict — is answered by making the question a single control that is on the screen from the moment it loads and never grows, shrinks, or swaps for anything else.

It is a `SelectField` labelled with the question, whose first option is **No vence** and whose remaining options are the days the month being planned actually has. "No vence" is a real answer rather than a prompt: it carries no value, and no value is exactly what "this never falls due" posts. So the picker is never `required`, has no refusal of its own, and every state of it is something a person can have meant. Starting there is not answering for somebody the way a day picker opening on the 1st would be — it is the *absence* of a day, which is the state the form was in before the question existed, and it costs the items that never fall due exactly nothing.

Two shapes were tried before this one and both lost, for different reasons.

**The canvas stacks the question and the picker.** `design/AgregarUnFormulario.dc.html` draws chips reading `( No vence ) ( Elegir un día )` with the day list opening underneath. Its own note says the fold line on it is "una estimación a mano, no una medición", and the ticket asked for the fold to be measured before the shape was chosen rather than estimated from a mockup. Measured, at 390×664 (Playwright, `devices["iPhone 13"]`, ADR-0037):

| Screen | Guardar's bottom | `document.scrollHeight` |
| --- | --- | --- |
| `/presupuesto/nuevo` before this change | 759 | 913 |
| `/presupuesto/nuevo/fijo` before this change | 845 | 999 |
| merged, chips **and** picker stacked | 932 | 1086 |
| merged, chips **swapped for** the picker | 845–846 | 999–1000 |
| merged, one picker — **shipped** | 845–846 | 999–1000 |

Stacked costs 173px in the state that has a day on it. The other two cost 87px in every state, which is what the dedicated Fixed screen cost for the same four questions, to the pixel.

**The chips swapping themselves for the picker lost for a better reason than pixels.** It costs the same as what shipped, and it keeps the canvas's two chips — but it has a state where the screen contradicts itself. A person who taps "Elegir un día" and then saves without touching the wheel has said out loud that this one vences, and gets a Variable item. Making the picker `required` does not fix it: "No vence" would then have to leave the picker to be a valid answer, and it would need a control of its own, which is the stacked shape and its 173px.

So the gap is closed by removing the state that creates it. There is no earlier tap for the control to contradict, because there is no earlier tap: what the row reads is what gets filed, at every moment. `budget.item.due.day` — the "Elegir un día" chip — does not exist.

## What this does not fix, and whose it is

**Neither screen has ever fitted a phone.** Guardar sat 95px below the fold before this change and sits 182px below it after, and the document runs 336px past the glass.

That is #86, opened while measuring #79, and it is not this change's bug. The plan's entry screen was 249px over before anything here touched it; the first honest lever is the tab bar and it buys 94 of them, after which the next item in the list is a 310px keypad — a design question the size of #60 rather than a padding one.

What this change does for it is halve it: there is one screen to fix instead of two, and the survivor is exactly as tall as the taller of the two it replaced. The measurements above are the current figures, and #86 owns them.

## `/presupuesto/nuevo/fijo` stays, as a redirect

A permanent redirect to `/presupuesto/nuevo`, carrying the month across.

ADR-0010 says the address bar stays honest, and a 404 would be this codebase telling somebody their bookmark was wrong when what changed was us. The month is carried because landing on "this month" would take a person planning October in September off the month they were working on; it came out of a URL, so it is escaped on the way back into one.

Nothing is proved there. Whether the Space exists and whose it is, is the question the screen on the far side asks — asking it in the redirect would be answering it out loud for an identifier somebody guessed.

## Correcting an item is not merged

`[itemId]/page.tsx` still branches on `kind`, and `FixedItemForm` still exists to serve the Fixed half of it.

A correction is a different question: the item's kind is settled the moment it is written down, so the day is asked outright and there is no way to say it never falls due. Offering the chips there would be offering to change an item's kind, and the domain has no operation for that — `BudgetItemAmendment` carries no day and `FixedItemAmendment` carries no way to drop one, both on purpose. A control that could be filled in and then refused is worse than no control, which is the argument ADR-0034 already made about a paid item's form.

That is a decision and not an omission. Merging the correction too means a domain operation for changing an item's kind, an answer about what that does to a paid Fixed item, and a write path for it — a change of its own, and not one #80 asked for.

## Consequences

Planning the rent is: tap "Agregar un gasto previsto", type the amount, name it, pick the Category, tap "Elegir un día", pick the day. The word *fijo* appears nowhere on the way in.

`budget.fixed.new` and `budget.fixed.new.title` are gone. `budget.item.due` is the question and `budget.item.due.never` is the answer that is not a day.

`daysIn` is new in `domain/calendar/month.ts` and `daysOf` in `presupuesto/days.ts`. Two screens now offer the days of a month to pick a due day from — the plan's entry screen and a Fixed item's correction — and neither reads a `CalendarDate` apart by string offset to get there. `monthSoFar` uses `daysIn` too, because it was the third place counting the same thing.

The Budget screen has one link out of it where it had two, which is one fewer tap target (`hit-targets.spec.ts`) and one fewer link (`link-decoration.spec.ts`); both counts are pinned and both moved.

`handlePlanFixedItem` and `planFixedItemAction` are gone. `planFixed` stays as a port, because the domain still has two shapes and the seam still builds both.
