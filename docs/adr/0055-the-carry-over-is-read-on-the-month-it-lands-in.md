# The carry-over is read on the month it lands in

Issue #120, from the #109 map: decisions 4, 6 and 11. ADR-0003 is **amended**
rather than merely implemented, and that amendment holds the rule — a surplus is
a Movement and a deficit is a sentence. This holds everything else the ticket had
to decide, which turned out to be one question about a screen and three about
where a rule is enforced.

## The screen it belongs on is the following month's

The obvious place was the closed month. That is the month whose leftover it is,
`design/SheetArrastre.dc.html` draws the sheet over a Budget screen, and "what
September left" reads like a fact about September.

It is wrong, and #119 is what makes it wrong. **A closed month keeps every link
and loses every control** (ADR-0054): every form comes off, nothing is greyed
out, and there is no way out beside the sentence. An "Aprobar el arrastre"
button standing on September after September was frozen would be the one control
in the product that survived a close — on the screen whose whole point is that
nothing on it can be touched.

The right answer was already in the ticket, twice, in plain words. The surplus
"is written as income in the following month". The deficit "is shown on the
following month". So the card is read on the month the money is about:

- A **surplus** is offered there, because approving writes income into *that*
  month and a person tapping is standing in the month they are changing.
- A **deficit** is stated there, because it is a fact about how that month
  started and about arithmetic it is deliberately not part of.

That also settles what happens when the following month has itself been closed:
the control comes off and the sentence stays, which is not a special case at all.
It is ADR-0054 applied to one more card.

## It sits under the summary, and that placement is decision 4 drawn

`CloseNotice` is above everything on that screen, because it is the one thing on
it that is not about the month being read. This is the opposite: it is entirely
about the month being read, and it goes **under** `MonthSummary`.

Decision 4 says a deficit "does not enter that month's arithmetic". A card above
the four figures would read as part of the sum — a fifth figure standing between
a person and the ones the screen exists for. Under them it is what it is: a
separate fact that follows.

The surplus wants the same place for a different reason. Approving changes the
figures directly above it, and a control whose effect is off the top of the
screen is a control whose effect nobody sees.

## Four sentences, not one with holes in it

The card says one of four things, chosen once rather than assembled from three
booleans where it is drawn:

- the surplus, to the creator: **"Sobraron $609.000 en septiembre."**
- the surplus, to the invited Member: **"…y espera que Ana lo apruebe."**
- the surplus, on a month since closed: **"…y no se aprobó."** — past tense,
  because there is no yet (ADR-0054's rule about "Nunca se pagó").
- the deficit: **"Se gastaron $240.000 de más en septiembre."**

The invited Member's line is ADR-0053's shape a second time, and it is the second
place in the product where a capability asymmetry has to be said out loud: it is
said by naming who it is waiting on, never by a greyed-out button. A disabled
control answers "why not" with nothing, so a person presses it to find out.

**The deficit carries a second line, and it is the more important one.**

> "No se descuenta de este mes: esa plata ya se gastó, y lo que la pagó se anota
> acá como gasto."

This is the one explanation in contaro that answers something a person would
otherwise read as broken arithmetic. It is on the screen and never behind a tap,
because an explanation somebody has to go looking for is one they never see.

**The deficit has no sheet.** Decision 11 says the verb does not survive into
that state, and a sheet whose only button closes it is a sheet that asks nothing.
So the artboard for the deficit is not a sheet either: `ArrastreDeficit.dc.html`
draws the card standing on the screen, which is what it is. The canvas and the
code say the same thing, which is the only reason the canvas is worth keeping.

## Where "one-directional" is enforced, and why it is in three places

`approveCarryOver` refuses a deficit by name. That is the rule, and it is in the
domain rather than only in the screen for the reason every rule in this product
is: a screen that does not draw a button is a screen, and the next screen is
where the button comes back.

The check in migration 0017 refuses a carried row that is not income, and the
one beside it refuses a carried row whose day is not after the month it names.
Between them there is no shape of "the deficit, recorded" the database will
hold. That is the same belt ADR-0016 put under `filing` — income under
"Alquiler" is refused in the domain, in a check, and in a trigger — and it is
here for the same reason: the rule is worth more than the code path that happens
to be enforcing it today.

`ReadableMonthSummary` is untouched, which is the third place and the quietest
one. Nothing was added to it and nothing had to be: `spent` still means "every
expense in it", so `planned`, `filled` and `over` go on describing one month.
The deficit is beside those figures and never inside them.

## The two refusals about closes, and they point opposite ways

Every other write in the product asks one question — *is the month I am writing
into closed* — and `refuseAClosedMonth` is the one place it is asked (ADR-0052).
This act asks that one too, about the month it lands in, and it is not a special
case: a carry-over aimed into a closed month is a Movement aimed into a closed
month.

It also asks the mirror, which nothing had ever needed before: **is the month I
am reading a figure out of still open?** `refuseAnOpenMonth` is that question,
and it lives in the same module for the same reason — whether a month is closed
is a question about rows, and one file reads them.

It is decision 6 made unwritable. What a month left behind is not a figure until
nothing more can go into it; a surplus approved out of a running month is money
that leaves before the month has finished spending it, and there is no second
approval to correct it with.

Its own error type and not `ClosedMonthError` inverted, because the two mean
opposite things to whoever reads them: one says "this is finished, nothing more
goes in", and the other says "this is not finished, so its figure is not a
figure". A screen showing either sentence for the other would tell somebody the
exact opposite of what happened.

## The figure is re-measured on the way in, always

The card said "$609.000" and the form carries only the month. `handleApproveCarryOver`
reads the rows again and decides for itself.

This is the one form in the product where trusting a number would put an amount
somebody chose into a ledger, and the gap it closes is not hypothetical: between
the drawing and the tap, the month may have been carried on another device, the
landing month may have been closed, or a late correction may have moved the
figure. A form that posted the amount would be a form that could post any
amount.

## What a carry-over cannot do afterwards

**It is never corrected.** `amendMovement` refuses the whole correction rather
than one field of it, because there is no field on a carry-over a correction
could be about: its amount is what a closed month came to, its day is the first
of the month it landed in, it carries no Category, and whose money it is, is
nobody's — which is the exact field a correction form posts back. A form that
opened on one would silently attribute it to whoever pressed save.

So its screen is the record and a `Refusal`, which is the shape #119 built —
and this is the second sentence that card now wears. **Its strike stays.** That
is where it parts company with the closed month and follows the paid item
instead (ADR-0034): this refusal has an undo, and a sentence with no exit beside
a refusal that does have one would be a dead end with good manners. Striking it
out offers the month again, which is `movements_one_carry_over_per_month` being
partial on `struck_at`.

**It is read by where it came from.** A carry-over has no Category, because
income carries none, and no name, because nobody typed one — so the month's list
would have printed "Ingreso" and left a figure nobody could account for. It
reads "Arrastre de septiembre" instead, out of `movements.carriedOver`, and the
circle beside it is empty because there is nobody to draw in it.

## Consequences

**A month whose predecessor closed with a deficit pays two reads on every
opening, forever.** A surplus stops costing anything the moment it is approved —
the standing Movement is found by one indexed row and the card goes silent — but
a deficit has no record to leave, so the sentence is the only place it exists and
the arithmetic behind it has to be redone each time. That is the price of
decision 4 and it is named here rather than discovered later.

Nothing is read at all until the month before the one on screen is closed, and
that answer comes off rows `readableBudget` had already fetched
(`previousClosed`). So the ordinary screen — this month, with last month still
open — pays nothing.

**Income totals spanning more than one month are inflated**, which ADR-0003
already accepted and this makes real for the first time. Any report about what
each Member contributed reads the rows where `attributed_to` is a name, and the
check in 0017 is what guarantees those are exactly the uncarried ones.

**`attributed_to` is nullable now**, and every reader of it had to say what it
means for there to be nobody. On the month's list a carry-over draws no member
circle, which is ADR-0003's "attributed to no Member" arriving on a screen. On
the correction screen it is unreachable, and said out loud with a throw rather
than defaulted to an empty string: an attribution field opened on nobody is the
one field on that form that would quietly change an answer.

**`design/SheetArrastre.dc.html` lost its two-Member approval block**, along with
"Hace falta que los dos aprueben". Decision 5 retracted it and ADR-0051 recorded
why: only the creator approves. The sheet's body sentence moved from "Si lo
aprueban" to "Si lo aprobás" for the same reason. What survived the redraw
untouched is the sentence the artboard got right and the code now says word for
word — *"No se atribuye a ninguno de los dos, porque no lo ganó nadie."*
