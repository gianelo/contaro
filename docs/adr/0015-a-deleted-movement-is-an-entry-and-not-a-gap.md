# A deleted Movement is an entry, not a gap

#7 asks for "a Member corrects or deletes an expense they recorded", and that sentence hides two decisions rather than one: **who** may unmake an entry, and **what is left** when they do.

## Who

Any Member of the Space, and not only the Member who recorded it.

The acceptance criterion reads both ways. The narrow reading makes `recordedBy` an ownership claim: Ana could not fix a typo Gian made about her own spending without asking him. We rejected it. Inside a shared Space the money is one pot — that is the whole premise of the product — and every other rule in this codebase is already "a Member of the Space may": `spaceVisibleTo`, `categoriesVisibleTo`, `findSpaceForMember`. Making this the first ownership rule would buy one thing, an audit trail, and we get that a better way below.

`recordedBy` stays exactly what CONTEXT.md says it is: the answer to "who typed this in". It survives every correction, refused by `amendMovement` and by a trigger in migration 0004, the way ADR-0001 refuses a currency change in both places. Who typed a figure in is a fact about what happened, and a fact that can be edited is not a record of anything.

## What is left

Nothing is deleted. The row stays and takes `struck_by` and `struck_at`.

A `DELETE` was the obvious alternative and it is the one we did not take. #1 opens by saying that a ledger with holes in it lies in every report it produces, and a row that vanishes leaves exactly that hole: the month's total changes, nobody can say why, and in a shared Space the other Member has no way to find out that it changed at all. The cost of the alternative is paid by the person who did not press the button.

So a deletion is itself an entry. It says who made it and when, and it is the same instinct `recordedBy` comes from — the two together answer "who put this figure here, and who took it away". The user asked for this in as many words when the question was put to them.

## Consequences

A struck Movement is **unreadable**, not merely filtered. `standing` is one clause used by every reader in `src/db/movements.ts`, and `asMovement` throws when handed a struck row — the same "asked twice on purpose" shape as `listSpacesForMember`. A WHERE clause that ever loosens fails loudly instead of quietly putting struck money back into a total. The domain has no struck kind of `Movement` at all: a `Movement` is money that moved and stands, so no reader downstream — #10's Budget, #11's alert, #14's Pace — can forget to leave one out, because there is nothing to leave out.

Striking is not idempotent by accident: `standing` is in the WHERE of the UPDATE too, so the second thumb on the button finds it already gone rather than overwriting whose strike it was.

The screen confirms first, because striking destroys something — every figure that included the expense changes underneath somebody who only meant to scroll — and #1 says actions that destroy data confirm first. The sheet says the deletion will be written down as theirs, because in a shared Space that is a consequence the person pressing it should know about before they press it.

Nothing yet **reads** `struck_by`. That is deliberate: this ADR is about the record existing, not about a screen for it. #8 brings the month a person actually reads, and a history of what was struck out belongs to whichever ticket asks for one — but it cannot be written retroactively, which is why the columns land now.

Two Spanish words were fixed by this: a Movement is *borrado* on the screen, because that is what a person calls it, and *struck out* in the code and this glossary, because "deleted" would be a lie about what the row does.
