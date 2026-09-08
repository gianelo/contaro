# A closed month keeps every link and loses every control

ADR-0002 said a closed month never changes and #117 built the refusal that makes it true: `refuseAClosedMonth`, above the domain, asked by every write before it writes. What no ticket had answered is what a closed month *looks like* when somebody goes back to it — and no artboard draws it, because it is the one screen the canvas never had.

The forms rendered anyway. A person could open a September item after September was closed, fill the whole thing in, press Save, and read the refusal on the way back. That is late and it is never wrong, which is exactly the trade `presupuesto/[itemId]/page.tsx` wrote down and left for this ticket.

## The decision

**A closed month is shown and not offered.** Every link on it survives; every control comes off. Nothing is greyed out, nothing is disabled, and no field is left on the screen with `readOnly` on it.

That is not a new pattern. The product has had exactly one precedent since #48 — the paid Fixed item — and it is the same shape: omission, plus a sentence saying why, plus the way out where there is one.

- On the Budget screen, one `Notice` at the top, "Agregar al plan" gone with the whole card it lives in, and "Marcar pagado" gone from every row. `MonthSummary` is untouched, because it has no controls to lose.
- On the month's list, one `Notice` and nothing else: every row there is already a link, and the raised record button dates a Movement today, which is never inside a closed month.
- On an item's screen and on a Movement's, the forms and the removal are replaced by the card that says why.

**There is no way out beside the sentence, and that is where this departs from the item it is modelled on.** ADR-0034 owes a paid item a link to the Movement that paid it, because that refusal has an undo and a sentence with no exit is a dead end with good manners. The close has no undo and never will (ADR-0002). Offering one would be the unlock that has never existed, and pointing at a screen that refuses the same thing would be worse than saying nothing.

## The tense changes, and that is a rule and not a wording

A never-paid Fixed item in a closed month reads **"Nunca se pagó"** and not "Pendiente".

"Pendiente" means *not yet*. After the close there is no yet — a rent nobody marked paid in September is not going to be — so the badge stops describing a state and starts making a promise the month cannot keep. The same sentence sends `budget.empty` ("Todavía no planeaste este mes") off the screen with the card it sits in, and gives the month's list a second empty state, "No quedó ningún movimiento anotado acá".

`dueNotice` goes quiet for the same reason it already goes quiet on a paid item. Beside "Nunca se pagó", a line reading "vencido" is a second answer claiming a deadline is still running in a month that ended.

**That silence is a screen's and not the domain's.** `dueNotice` takes an item and a day and knows nothing about closed months, and it stays that way: ADR-0052 put the close *above* the domain deliberately, because whether a month is closed is a question about rows and a `Month` alone cannot answer it. The row is handed a boolean and drops the line; the domain is not told anything new.

## The picker grew its second per-row state

The month pill has offered fourteen months since #61 and has carried exactly one thing about each of them — `inView`, the tick labelled "Mes que estás viendo". A closed month now carries a padlock labelled "Mes cerrado".

A mark and words, never a colour on its own, which is the rule the badge at the end of a Fixed row is already held to: the state has to survive somebody who cannot tell the two greys apart. The two marks are independent and neither is derived from the other — a person can be standing *in* a closed month, and that row is the one that has to say both things.

The reason for saying it there at all is that arriving is too late. A screen that behaves differently is a screen somebody should be told about before they are on it, and the list is the last place there is to tell them.

`lock` is the first icon in the product that no artboard draws. It is named as an exception in `icon.test.tsx` rather than quietly added, so a second one is a line somebody had to write on purpose.

## The date field refuses before the typing, not after the submission

`movimientos/when.tsx` is the one path in the product that reaches backwards. The raised button records today and today is never inside a closed month; a correction, and an entry whose day a thumb has moved, are the two ways a day lands in one.

**The picker refuses the day, and nothing on the screen is disabled.** The obvious shape was to let the day through and grey out Save, and that is the very thing this decision forbids one section above: no greying, no disabling. So the day never becomes one inside a closed month — `When` declines to move it and says which month it was, under the field, while the sheet that asked is still open. The field is controlled by what the form holds, so declining is what puts the day back.

It never has to fight a value it was opened with. A Movement already in a closed month has no form at all — its screen is the record and the card — so the only way a closed day reaches the picker is a thumb choosing one, which is the moment the sentence is owed. The refusal that decides is still `refuseAClosedMonth` on the way in. This is the ordinary case answered early, and never the rule.

**A `min` on the date field was the obvious shape and it is wrong.** Closed months are not guaranteed contiguous — a Space may close September and leave August open — so a bound at the day after the newest closed month would refuse open months to buy a simpler control. A refusal that is sometimes false is worse than a late one that is always true.

The window is the pill's own fourteen months, out of `earliestOffered`, so the months the field refuses and the months the picker marks are one answer. A day older than that is unwarned and still refused by the write. That is the deliberate edge: what this closes is the gap somebody can walk into, and what it leaves is the two-year-old receipt the write has always caught.

## One question, asked in one place

Both the plan's reader and the ledger's now call `closedMonthsFrom` over the pill's window, which answers the picker's marks and "is the month in view closed" out of the same row set. The two detail screens ask `monthIsClosed`, and the two entry paths ask `closedMonthsToRefuse`; both live in `espacios/[id]/closed.ts` and both are built on `closedMonthsFrom` rather than on a `SELECT` of their own.

That module is beside `close.ts` and under neither `presupuesto/` nor `movimientos/`, for the reason `close.ts` gives about the act: the close freezes a month's plan and its Movements alike, and a reader living inside one of the two halves would be named after half of what it answers.

`refuseAClosedMonth` is left asking for itself. It is the hot path, ten writes go through it, and it wants one row — and it is the one place the rule is enforced, which `closed-months.source.test.ts` counts. Nothing here is a second implementation of it.

## Consequences

The card a paid item wore left that screen and became `Refusal` in `src/ui`, because three screens wear it now and none of them is "the paid one". A person meeting the second refusal after the first should not have to read a new kind of card to learn the same thing has happened — and saying so while keeping two copies of the card would have been saying it rather than doing it.

It sits beside `Notice` and is not a variant of it. A notice is a line above a screen that still works; this replaces a control, carries a heading, and is the only thing in its place. Its slot for the way out is what holds the difference between the two refusals: a paid item passes the link to the Movement that paid it, and a closed month passes nothing.

A Movement of a closed month gets a small screen of its own rather than an empty one: what it was, when, and how much, above the card. A heading followed by nothing would read as a Movement that had gone missing rather than one that cannot change. Its figure comes from the month list's own `amountOf`, so income keeps the written "+" ADR-0016 requires and does not get a second copy of that rule.

The copy-forward query is skipped on a closed month, extending the reasoning #121 wrote for it: the card that would draw the answer is not rendered, so the question is one nothing on the screen can use.

Two screens now hold the sentence "está cerrado" under separate keys, `budget.closed` and `movements.closed`, saying the same words today. They are separate because the two screens lose different things to the close, and one string shared is one string that stops fitting one of them.
