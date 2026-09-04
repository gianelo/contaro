# A Member's colour is decided by the Space, and never by who is reading

#34 asks for "a stable pair of ink and ground per Member, so an avatar is the same colour on every screen", and draws two pairs because a Space holds at most two Members. It does not say what decides which Member wears which, and the canvas cannot answer it: every screen it draws is drawn to Gian, so Gian is blue on all of them and both readings fit.

## The decision

The Space decides. Its Members' ids are sorted, and the first seat takes the first pair. Both Members see the same two colours on the same two people.

The user was asked this directly, because it is the whole difference between a colour that identifies somebody and a colour that identifies *the other one*, and chose the Space.

## What the alternative would have cost

The other reading was: the reader is always the first pair. Your avatar is blue everywhere, in every Space, and whoever you share with is pink. It is tidier for one person and it matches the header avatar on the canvas, which is the reader's.

What it costs is the only thing a colour is for here. A Space is two people looking at the same ledger and talking about it. Under the reader-first rule, Gian's screen paints Gian blue and Ana's screen paints Ana blue, so "the blue one" names a different person to each of them and the colour has stopped saying anything one of them can say out loud. Two Members of one Space are exactly the case this product exists for, and it is exactly the case reader-first breaks.

## Why sorted ids

The seat cannot come from the order the Members arrive in. `spacesVisibleTo` says so out loud — "the order given is the order kept: which Space comes first is a question about how they were fetched" — and the same is true of the Members inside one. A colour that depends on a query's ORDER BY is a colour that changes when somebody adds an index.

It cannot come from a hash of the id either. Two ids hashing into two seats is not guaranteed to give two different seats, and the one case that matters is the one where they collide: a shared Space whose two avatars are the same colour is worse than no colour at all.

Sorted by the raw id and not by `inReadingOrder`, which exists to put text in front of a person in the order they read it. Nobody reads a uuid. What is wanted is only an order that cannot change, and plain comparison of two opaque strings gives that where a collator promises nothing across ICU versions.

## Consequences

`memberColour(memberId, memberIds)` throws on a Member the Space does not hold, rather than falling back to the first pair. Falling back would draw a stranger as one of the Space's own Members, which is a wrong statement on the screen rather than a missing one, and a wrong statement is the one thing an avatar cannot afford to be.

It throws on a third Member too, and it checks the count before it looks up the seat. Checked afterwards, two of the three would still get a colour and the screen would look right; a Space holding three has gone wrong somewhere upstream, and this is not the place to smooth that over.

The same Member may wear different colours in two different Spaces. That is not a defect of this rule, it is the rule: the pair says which of *these two* people it is, and a personal Space has no other one to be told apart from.
