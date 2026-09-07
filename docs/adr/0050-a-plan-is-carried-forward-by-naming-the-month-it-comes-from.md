# A plan is carried forward by naming the month it comes from

Issue #121, from the #109 map: decisions 7, 8, 9 and 21 through 24.

A month with no plan offers to copy the most recent one the Space has, and the
offer says which month that is. Three things follow from that sentence and they
are decided here.

## The offer is a row in the card that is already there

`WayIntoThePlan` renders a sentence and the answer to it: "Todavía no planeaste
este mes." above "Agregar al plan". A sheet that opened by itself on a month
with no plan would be a second answer arriving unasked, which is the thing
ADR-0045 exists to prevent — and it would arrive on the one screen a person
opens on the first of every month.

So the offer is a second row in that same card, above the way in. One card, one
sentence, two ordered answers: the plan a person almost certainly wants, and
then writing one from nothing. Tapping it opens `BottomSheet` to confirm, which
is the shape "Marcar pagado" already uses one card below — a row opens a sheet,
the sheet says what is about to happen, the person confirms. A whole month's
plan appearing on one tap is exactly what a confirmation is for.

That row is a **button** and not a link, which is where this departs from
ADR-0045's "a link and never a button". It departs by keeping the reason. That
rule is about rows that go somewhere: they open in a new tab, and they work
before JavaScript has loaded. This row goes nowhere — it opens a confirmation
over the screen a person is already on. The way in beside it is still a link
and still works with no JavaScript at all.

Making the card a client component is what that costs, and it is charged to the
copy row alone. `next/link` still renders its anchor on the server.

## The reach back is unbounded, and that is safe because the month is named

`latestPlannedMonthBefore` asks for the most recent month before this one with
any item on it, with no floor and no window. A cap was offered and refused: if
March had a plan and nobody opened the app until October, March is still the
last plan there is, and it is still the one worth offering.

It deliberately is **not** `monthsToPlan`'s fourteen (ADR-0039). That window is
a navigation affordance — how far the pill can be moved in one opening — and
this is a question about rows. The plan is being carried forward, so the month
it came from never has to be reachable.

What makes the unbounded reach safe is that the row **names the month**:
"Copiar el plan de agosto", never "el plan del mes pasado". A plan old enough to
be wrong is visibly old enough to be wrong before the tap rather than after.
Deriving "the previous month with a plan" again on the far side of the
confirmation is refused for the same reason: what a person tapped is what gets
copied, even if a nearer month is planned in between. The month the row named
travels with the form.

"The previous calendar month has no plan" is therefore not a case. The lookback
keeps going.

This supersedes decision 8 of the #109 map, which said the copy takes *the
previous calendar month*. #121 replaced it with decision 22 before any of this
was built, and the difference is not a detail: under decision 8 a Space that
skipped a month would be offered an empty plan and told there was nothing to
carry, on the very journey this exists for.

And because the direction is what the offer means, it is a rule and not a
screen's habit. `copyOfPlan` refuses to carry a plan onto its own month or a
month behind it, by name on `month`. The offer never renders that way, so the
only thing that could ask for it is a form nobody was shown — which is exactly
the sort of invariant that stops being true the first time a second caller
appears.

## A copied due day lands on the last day the month has

`dayOf` refuses the 31st of September rather than rounding it, and `month.ts`
says why: a person typed a 31, a typed day is an answer, and moving it back two
days behind their back is worse than telling them the plan cannot be written.

Nobody types this one. It is the day an item already had, carried into a month
that was never consulted about it, and a plan copied forward has to land
somewhere. The three answers were: refuse the whole copy, drop the line, or move
the day. Refusing means a plan with the rent on the 31st can never be copied
into a 30-day month — which is half the year. Dropping the line means a plan
arrives quietly missing the largest thing on it, which is the failure a person
would not notice until the money did not leave.

So `sameDayIn` moves it, to the last day the month actually has and never into
the month after. It stays visible on the plan it lands on and correctable all
month, which is what the sheet promises and what makes moving it honest here and
dishonest in `dayOf`.

## What copies, and from where

Both kinds, at their amounts, under their names, with no per-line choice. A
Fixed item that was never paid still copies — it went unpaid for some reason and
the line matters for the month ahead either way (decision 9). Every Fixed item
lands **pending**, paid or not: its payment is a Movement in the month it came
from, and that month's ledger is not this month's.

Copying from a month that is still open is allowed (decision 24). The copy is a
snapshot and not a link, so the two months are independent from the moment it
lands. Waiting for a close would mean nobody could plan October until September
was over, which is the one time they would want to.

Nothing carries an identity across. These are new items, built by handing drafts
to `planItem` and `planFixedItem` — the same constructors the entry screen goes
through. A second way of getting a row into `budget_items` that decided its own
rules would be a second place for them to stop being true, which is the reason
`planFixedItemInSpace` sits beside `planBudgetItemInSpace` rather than inside
it. A Category the Space can no longer see refuses the whole copy by name, which
is louder than a plan arriving one line short.

## It needs no new state, and the race is closed with a lock

ADR-0019 settled that a Budget is its items and has no row of its own, so "this
month has a plan" is "the month has at least one Budget item" — a query over
rows that already exist. Nothing is added to the schema and there is no
migration.

That is also why the double-write cannot be closed with a unique key: there is
no row to put one on. Two transactions reading an empty October under READ
COMMITTED would both find it empty and both insert, and the month would end up
expecting double the rent. `copyPlanIntoMonth` takes `pg_advisory_xact_lock` on
the Space and the target month before it reads, so the second transaction waits,
reads the first one's plan, and answers `already-planned`. Held to the
transaction, so it is released by the commit or the rollback and never by
anything remembering to.

That answer is told apart from `nothing-to-copy` on purpose. One means the month
being copied emptied in between and the plan has to be written by hand; the
other means the plan a person wanted is already there and reloading shows it.
Trying again is the right move for the first and exactly the wrong move for the
second.

## Consequences

- `WayIntoThePlan` is a client component. Its test file mocks `./actions`, the
  way `fixed.test.tsx` does, because a `"use server"` module cannot be imported
  under jsdom.
- The Budget screen makes one extra query, and only on a month holding no item
  of either kind. A month with a plan pays nothing.
- `monthLabel` split into itself and `monthName`. The capitalised form is for a
  heading standing alone; the lower-case form is for a month inside a sentence,
  which is how Spanish writes it and which `monthLabel`'s own comment already
  said before there was a caller that needed it.
- Two words of the artboard's copy did not survive, and `CONTEXT.md` is why
  both times: "renglones" is refused under Budget item beside *Línea* and
  *Partida*, and "Los fijos" is the bare-noun form the same entry refuses —
  "Where a kind is named as a noun it is said whole". The canvas is working
  material rather than vocabulary (ADR-0040), so the artboard was changed to
  match: "los gastos previstos" and "Los gastos fijos".
- The sheet's two recap labels are `budget.fixed` and `budget.variables`, the
  keys the plan's own sections already carry. A copy of "Fijos" under a key of
  its own would be a second place for one heading to be renamed.
- The sheet's recap tray uses `--color-fill` on a `--color-surface` sheet, which
  are the same colour in dark. It matches the payment confirmation's recap
  deliberately rather than diverging from it; the tray degrades to plain text in
  dark on both, and that is one bug in one place rather than two sheets drawing
  one tray two ways.
- Nothing here knows what a monthly close is. Decision 24 is what removed the
  dependency #67 assumed, and the close can arrive later without touching any of
  this.
