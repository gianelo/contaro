# The close announces itself once, and then stands as a row

Issue #118, from the #109 map: decisions 3, 12, 13 and 14. ADR-0052 built the
act; this decides how it reaches a person.

## Two surfaces, because one of them alone is a worse product

A month ending is news, and the close is the one irreversible act in contaro.
Those two facts pull in opposite directions, and each of the obvious answers
fails at one of them.

A **sheet alone** would open by itself every time until somebody used it. That
trains dismissal by reflex on the one button in the product that has no undo,
which is the worst possible thing to train a thumb to do.

A **row alone** would never announce anything. Somebody who does not scroll past
the summary in October never learns September ended, and the product's own
rhythm — a month closes, the next one starts — would exist only in the
documentation.

So both, and each one covers the other's failure:

- The **sheet** opens by itself on the first load after the month ended, and
  never again on its own.
- The **row** appears the moment the month ends and stays until the month is
  closed.

The sheet can be missed at no cost, because the row is still there. The row
never has to interrupt, because the sheet already said it once.

**The consequence accepted on purpose**: a hard refresh on that first load
spends the announcement. Nobody sees the sheet open by itself twice, and that is
exactly why the row is not optional.

## It needs no new state, and that is not a coincidence

`space_members.last_opened_at` has existed since ADR-0029, written on the way
into every route inside a Space (`currentSpace`) so the Spaces list can say which
one is being used. `markSpaceOpened` now answers with **the moment it is
replacing**, and that answer is the whole announcement:

> a `last_opened_at` from while the month was still running, arriving on a
> request made after it ended, **is** the first opening since the month turned.

The next request carries a moment from after the end, and the answer is false
for good. Nothing has to be unset, and nothing has to be swept.

A `dismissed_at` column was the shape this did not take, and ADR-0029 had
already refused it in general terms — "a flag has to be unset somewhere else".
Here it lands harder: something would have had to unset it every month, for
every Space, for as long as the product exists. A monthly sweep over every
membership row, to reproduce a fact two columns already imply.

The read happens **inside** `markSpaceOpened` rather than beside it, because
this is the one value a caller cannot read for itself: by the time the caller
looks, the write it made has already replaced the answer.

`joined_at` comes back off the same row, one column further along a read that
had to happen anyway. It is where the walk below starts — a month that ended
before this Member was in the Space is not a month to tell them about — and
without it the sheet would open by itself on the first screen somebody ever
sees, about a month their Space did not exist in. Measured off the membership
and not off the Space, because the invited Member joined later than the Creator
did.

## The row is about the oldest month still open, never the one on screen

The Budget screen is a month-in-view screen and this is the one thing on it that
is not about the month being read. Which month somebody navigated to is not what
decides whether they are told the calendar turned.

**The oldest still open, and not the one that just ended.** The first shape of
this announced `previousMonth(monthOf(today))` and nothing else, which reads
well and breaks the one promise the ticket makes in plain words: *the row leaves
only when it is closed*. September left unclosed would have had its row taken
off the screen the day October ended — the row leaving with nothing closed.

The fear that made the first shape tempting was a product nagging about January
in December. That fear is misplaced. If January is what is still open in
December, January is the honest answer to "what is waiting", and a row that
skipped to November would be a product quietly agreeing to forget it.

The walk starts at the month the Member joined in and stops at the month before
the one being lived in (`theMonthWaitingToBeClosed`). Both ends are real: a
month that ended before somebody arrived is not theirs to answer for, and a
month still running has not ended — `closeMonth` refuses it.

**The announcement is still about the newest.** `announces` asks whether the
month that *just* ended is new since this Member last looked, even when the row
under it names an older one. In every ordinary case they are the same month.
Where they are not, the person was already interrupted about the older one and
the row has been standing ever since — which is decision 12 exactly as drawn:
the row does not have to interrupt, because the sheet already said it once.

## The invited Member's row states, and does not offer

ADR-0051 gave the close to the Creator. This is the first place in the product
where that has to be said out loud on a screen, and it is the first capability
asymmetry of any kind: every existing one — the "Activo" badge, the greeting,
the paid-item recap, the pre-filled "Es plata de" — says *this one is you*. None
has ever had to say *this one is not yours to do*.

It is said by naming who it is waiting on:

> "septiembre terminó y espera que Gian lo cierre."

and not by a greyed-out button. A disabled control answers "why not" with
nothing, so a person presses it to find out; a sentence with a name in it has
already answered. They are not kept from knowing the month is waiting, and they
are not shown a button they cannot press.

The sheet is the Creator's alone, for the same reason. Interrupting the one
Member who cannot perform an act, with that act, is an interruption with no
answer to it.

## It is drawn as the screen's vocabulary, not as a new kind of surface

This is the first notice at the top of a Space screen. `dueNotice` is per-row
inside `FixedItems`, and `Notice` has only ever lived inside forms and sheets.

Rather than promote either, it is a card holding a grouped list — what every
section of this screen has been since #63, and what `WayIntoThePlan` is one card
below it. A component that shouted differently from everything under it would be
a fifth kind of surface on a screen that has four, and the shouting would be the
only thing it added.

`Notice(variant="warning")` still appears, inside the sheet, doing the job its
own definition describes: a standing statement about a consequence that cannot
be taken back. It holds exactly what the artboard sets apart in its own block —
where a late September ticket lands — and the plain paragraph above it holds the
whole of what closing does, which is the artboard's grouping and not a tidier
one.

**One word departs from the artboard**, and it is named here rather than left to
be found: the tray's second label is drawn as "Sin cargar hoy" and is written as
"Sin pagar". The row counts Fixed items of the whole month that were never
marked paid, so "hoy" would be a label misdescribing its own figure.

## What it costs

Every Budget screen now reads which of the Space's months are closed, from the
month this Member joined in. One indexed query returning at most a row per month
lived through, and it replaces the alternative — one query per month, walking
backwards until a gap turns up.

While a month sits unclosed, the Creator's Budget screen also reads that month's
Movements and Budget items as well as the ones in view, to fill the sheet's
tray. Two extra month-scoped reads, paid only by whoever can open the sheet, and
only for as long as the row is standing.

That is a cost bounded by the state the row exists to end, which is the right
shape for it to have. The invited Member pays none of it: their row states a
fact and opens nothing.
