# The close is a row, and the refusal is one place above the domain

Issue #117, from the #109 map: decisions 1, 3 and 15. ADR-0002 implemented as
written.

ADR-0002 decided the monthly close in the product's first week and the code
carried the promise for a year and a half. Two places wrote it down and
deliberately checked nothing:

> `src/domain/budget/budget.ts` — "nothing here asks whether the month is still
> open. The close is what shuts editing down, it freezes a month's Movements as
> much as its plan, and it has not been built yet — so it will refuse this in
> one place, above the domain, rather than growing a second half-answer here
> that would then have to agree with it."

ADR-0019 answered a different half of the same question, and answered it before
anybody asked: a Budget has no row of its own, so the close cannot be a flag on
one — "a flag on a Budget would be a flag that half of what it freezes does not
point at. A month with no plan can still be closed... So the close gets its own
home when its ticket arrives, and it will be a home the Movements can see too."

This is both promises paid, and it changes nothing either of them decided.

## The close is a row and there is nothing to unset

`closed_months` holds one row per `(space_id, month)`, with the Member who
closed it and the day they were standing in when they did. A month is closed if
it has a row. Every month without one is open, including the ones nobody has
reached yet.

There is no `closed` boolean anywhere, which is ADR-0029's argument applied a
second time — "a flag has to be unset somewhere else" — and here it lands twice
over, because the place it would be unset is the unlock ADR-0002 forbids.

Migration 0016 refuses `UPDATE` and `DELETE` on the table, the way 0002 freezes a
Space's currency and 0015 freezes its creator. ADR-0002 is explicit that there is
no way back, and a guarantee only the code enforces is a guarantee that lasts
until the second caller.

The delete refusal is conditional, and the condition is the whole of it: the row
cascades from `spaces`, so an unconditional one would make a Space that ever
closed a month impossible to delete — the exact hazard named below as the reason
there is no trigger on `budget_items` or `movements`, and no better for being on
this table instead. Postgres runs a cascade as the parent's own delete, so the
trigger tells the two apart by asking whether the Space is still there. What is
refused is "the Space exists and somebody is removing its close", which is the
only thing ADR-0002 was ever about: a Space that no longer exists has nothing
left to unlock.

## The refusal is one function, and the askers are counted

`refuseAClosedMonth` in `src/db/closed-months.ts` is the whole of it. Ten write
functions across `budget-items.ts` and `movements.ts` ask it before they write,
and `closed-months.source.test.ts` reads both stores and fails the day one of
them stops asking — including the day somebody adds an eleventh.

It is above the domain because the question is about rows. Whether a month is
closed cannot be answered from an item and a set of changes, and a
`closed: boolean` threaded into `amendItem` would be exactly the second
half-answer the promise refused: two implementations of one rule, and the day
they disagree is the day a closed month quietly accepts an edit.

It is in the store rather than in the handlers because that is where the month
is known. A correction's month is the item's own, and only the store has read
the item; a strike's month is the Movement's, and until now that write never had
to read the row at all. A handler asking would be asking about a month it does
not hold.

## Why not a trigger on the tables it freezes

The obvious second belt was a trigger on `budget_items` and `movements`, which
could not be forgotten by a write that never asked. It was refused for a reason
that has nothing to do with taste: both tables cascade from `spaces`, so a
trigger refusing every `DELETE` inside a closed month would make a Space that had
ever closed one impossible to delete.

It would also buy less than it looks. A trigger reads `closed_months` with
exactly the visibility this function has, so the window neither of them closes —
a write submitted in the same instant as the close, into a month that ended at
least a day before both — is the same window either way. And a trigger's refusal
reaches a person as a Postgres exception, which is the blank apology ADR-0002
least deserves. What is enforced in the database is the rule that can only be
enforced there: that a closed month's own row never moves.

## A month may only be closed once it has ended, on the Reader's day

`closeMonth` refuses two things and no more: a Member who did not create the
Space (ADR-0051), and a month that has not ended.

The second is decision 15 of the map, and it is ADR-0018 at its highest stakes.
At nine at night on the 30th of September in Bogotá the server is already in
October and the Member is not. Closing on the server's answer would permanently
freeze a month that, for the person tapping, is still running — and there is no
undo. So the day comes from `x-vercel-ip-timezone` like every other "today" in
the product, and `hasEnded` compares it against the month's last day.

This does not soften ADR-0002's "the Member decides when they have finished
loading, rather than the calendar deciding for them". The calendar still decides
nothing: it never closes a month, and it never nags. It only refuses to freeze
days that have not happened.

## What the close does not refuse

A late ticket. ADR-0002 decided that a September receipt found in October is
recorded with the date it was entered and consumes October's Budget, and
`design/SheetCerrar.dc.html` promises exactly that in the sheet a person reads
before they tap. So `recordMovementInSpace` refuses a Movement aimed *into* a
closed month and accepts one dated today, which is the whole of that decision.

A plan being copied *out of* one. A closed month is a month a plan may still be
read from — decision 24 of the map, and ADR-0050's "the copy is a snapshot and
not a link". Waiting for a close would mean nobody could plan October until
September was over, which is precisely when they would.

Marking a Fixed item paid in a closed month **is** refused, in October as much
as in September, because the payment writes a pointer onto that month's plan.
That is decision 1 of the map read from the enforcing side: an unpaid Fixed item
stays unpaid, in its own month, forever. Nothing is deleted — the record that it
went unpaid is the point.

## Consequences

`Budget` in `CONTEXT.md` no longer says a plan stays editable throughout its
month full stop. It stays editable until the month closes, which is the sentence
the product has always meant.

Two screens now render forms whose submission will be refused: the plan's
correction screen and a Movement's. That is #119's, and it is a question about a
screen rather than about a rule — the shape the product already has for it is
omission and a sentence, never a greyed-out control. Until then the refusal a
person meets is late but never wrong, and both handlers earn it a sentence of its
own rather than the blank apology a `failed` gets.

`closeMonthAction` exists and nothing calls it yet. #118 is the sheet and the row
that do, and this ticket deliberately stops at the act: the close had to be
something the product could do before it could be something the product offers.

The window this does not close is worth naming rather than hiding. A write
submitted in the same instant as the close itself can land, and the month it
lands in ended at least a day earlier. Closing it would mean an advisory lock on
`(space, month)` taken by the close and by every write in the product —
`copyPlanIntoMonth` already takes one for a narrower race — and that price buys
a case in which one of two people taps close while the other is mid-submission
on a month they both stopped using days ago.
