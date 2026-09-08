# The creator decides two things, and otherwise the Members are the same

Issue #116, from the #109 map: decisions 2, 5 and 10.

ADR-0020 made a Space's two Members deliberately symmetric. Their colours come
from sorted ids rather than from who arrived first, precisely so that "the blue
one" names the same person on both screens. `spacesVisibleTo` says the same
thing about order — which Space comes first "is a question about how they were
fetched, not a rule of the model" — and the product carried that symmetry all
the way down: `createSpace` took a `creatorId`, used it once to seed
`memberIds`, and dropped it. The moment the invited Member accepted, the two
rows were indistinguishable.

The month boundary cannot be built on that. Closing a month is irreversible
(ADR-0002): nothing inside a closed month can be edited and no Movement can be
added to it. Approving the carry-over writes an income Movement into the
following month (ADR-0003). Both are acts one person performs and the other one
has to live inside, and "either of them, whoever gets there first" is not an
answer — it is two people able to freeze each other's month.

## The decision

**The Space's creator closes the month, and approves the carry-over. The
invited Member does neither.**

That is the whole exception, and it is the whole list. Renaming the Space,
recording Movements, striking one out, editing the plan, inviting, the colours
each Member wears — all of those stay symmetric, and none of them may consult
the creator. ADR-0020 is not amended; it gains this one named exception and
keeps everything else it decided.

The two acts ask **one** question rather than two. `mayCloseTheMonth` and
`mayApproveTheCarryOver` in `src/domain/space/creator.ts` both delegate to
`isTheCreatorOf`, and the test that matters asserts they cannot answer
differently. Written twice they would eventually disagree, and the day they
disagree is the day the invited Member can approve a carry-over out of a month
they were not allowed to close.

## Why two acts and not a role

The obvious shape was `space_members.role`, with the creator an `owner`. It was
rejected because a role column does not stay at two acts. It is a permission
system with one row filled in, and the next question it invites — may an owner
strike out the other Member's Movement, may an owner rename the Space over
their objection — is a question a Space for two people who share their money
should never be asked. There is no hierarchy here. There is a tie-break on two
irreversible acts.

So the fact lives on the Space, as `spaces.created_by`: this Space was made by
this person. It says nothing about what anybody is allowed to do, and the two
things it decides are decided in one file that names them both.

## The creator is recovered, not invented

Every Space that predates the column already knows the answer twice over.

The creator's membership row is written in the same transaction as the Space
(`createSpaceForMember`) and `joined_at` defaults to `now()`, so the earliest
membership row per Space is the creator's. Independently, `space_invitations`
carries `invited_by`, and a Space with one Member has only that Member to do
the inviting — which is why that column does not cascade from `members`: the
Space is owed an honest record of who did it.

Migration 0015 compares the two before trusting either, and **surfaces a
disagreement rather than resolving it quietly**. Where they disagree it raises a
warning naming the Spaces and backfills from the membership row, which is the
one signal every Space has. A warning and not an exception, because ADR-0008
runs migrations from CI and refusing to deploy over a discrepancy in old data
would block the fix along with the problem.

## Consequences

The column is nullable, and that is ADR-0008's tax rather than a statement
about the model: a required column costs three deploys. Two things close the
window it opens. A trigger on the membership insert fills an empty
`created_by` with the first Member seated — the same rule the backfill ran,
applied live, because at the moment a Space is inserted its membership row does
not exist yet and a `DEFAULT` cannot read another row. And `asSpace` refuses a
Space that reaches a reader without one, the way it refuses an unknown
currency: two acts rest on the answer, so "nobody" is not a value to render.

A second trigger freezes the column once it is set, the way 0002 freezes the
currency. An exception anybody can hand themselves with an `UPDATE` is not an
exception, and the domain never offers the change — `SpaceAmendment` has no
field for it.

`Space` now carries `createdBy`, so every screen that holds a Space holds the
answer without a second query. Most of them will never read it. That is the
point: the fact is small, it travels with the thing it is about, and the two
places that consult it are named.
