# The carry-over is recorded as income, not as budget capacity

When a month closes, the unspent part of its Budget is approved by the Members and carried into the next month. We considered adding it to the next month's Budget as extra capacity, leaving the ledger untouched, since the money never physically moved.

We decided to record it as an income Movement in the following month, attributed to no Member, with its origin set to the carry-over of the month it came from. It matches how the Members already think about the leftover — money that is available again — and it keeps the carry-over visible in the ledger instead of buried in a budget adjustment.

## Consequences

Money counted as income in the month it was earned is counted again when it is carried over, so income totals spanning more than one month are inflated by the carried amounts. This is known and accepted, not a bug to fix. Any report about what each Member contributed must filter on `origin`, which is the reason Movements carry that field at all: `attributedTo` is empty on a carry-over because no Member earned it.

## Amended by #120: it is one-directional, and that is the whole of it

As written above this decision says where a leftover goes and says nothing at
all about the other half of the arithmetic. #120 asked the question and the
answer is that there is no other half: **a surplus is a Movement and a deficit
is a sentence.**

A surplus is money that still exists. Nothing was bought with it, it is
available again next month, and recording it as income is the truthful way to
say so — which is what this decision has always been about.

A deficit is money that is already gone. A month can only overspend because the
money came from somewhere, and in this product's world that is almost always a
card. **That card is paid the following month, and the payment is a genuine
expense of the following month.** Subtracting the deficit as well would charge
one overspend twice, and a month that was perfectly fine would read as a month
that failed.

So the carry-over only ever moves in one direction. A deficit is stated on the
following month and never enters its arithmetic: `ReadableMonthSummary` keeps
`spent` meaning "every expense in it", so `planned`, `filled` and `over` all go
on describing one month and nothing else.

It is the same rule ADR-0052 enforces one ticket earlier from the other side —
an unpaid Fixed item stays unpaid, in its own month, forever. **contaro does not
roll a failure forward.** The permanent record of a deficit is the month's own
figures, which the close froze.

## The two columns this decision named, eleven months later

"Attributed to no Member, with its origin set to the carry-over of the month it
came from" was written before either column existed. ADR-0016 named them and
left them — "a nullable `attributed_to` and an `origin`" — and migration 0017 is
where they land, because until #117 there was no close, and until there was a
close there was no month whose figure was firm enough to carry.

**Origin is one column and not two.** `carried_from` holds the month or nothing,
and `attributed_to` is empty exactly where it is filled: a Movement came from a
Member or it came from the carry-over of a month, never from both and never from
neither, and a check says so. A separate `origin_kind` beside it would be a
second field saying what the first already says, and two fields that have to
agree are two fields that one day will not — which is ADR-0052's argument about
the close made a second time.

## Who approves it, and once

The Space's creator, and not either Member (ADR-0051). It is the second of that
decision's exactly two acts, and it is asked through `mayApproveTheCarryOver` so
that the close and this cannot drift: the day they disagree is the day one
Member approves money out of a month they were not allowed to close.

**Only once, and once is counted in rows that still stand.** There is no
"approved" flag anywhere — the Movement *is* the approval — and the unique index
that enforces it is partial on `struck_at`. That is ADR-0031's shape for the
other thing a plan brings into existence: a Fixed item is paid only while the
Movement that paid it stands, and a carry-over is approved only while the
Movement it created stands. Striking it out offers the month again, which is the
only undo it has and the only one it needs: a carry-over is never corrected,
because every field on it is decided by the act rather than typed.
