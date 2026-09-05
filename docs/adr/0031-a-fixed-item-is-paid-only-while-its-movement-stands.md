# A Fixed item is paid only while its Movement stands

ADR-0023 made a Fixed item say it is paid by holding the Movement that paid it, and named the hole it left: strike that Movement out and the item goes on saying "Pagado". #49 is that hole. Both halves are right on their own — a struck Movement is an entry and not a gap (ADR-0015), so the pointer stays valid and the row it names still exists — and yet the plan says the rent was paid while the ledger says nothing was spent on it. A Member reads a badge telling them not to pay a bill they now have no record of paying.

## The decision

An item is paid when it holds a Movement **and that Movement is still standing**. Striking the Movement out puts the item back to Pendiente, and it can be paid again.

`FixedItem` carries a `payment` rather than a `movementId`: the identifier and `struck_at`, read together and never apart. `isPaid` is one reading of that one value, so "paid" cannot come apart from "and the money is still in the ledger" — which is the same move ADR-0023 made when it refused a boolean beside a Movement, applied one level further out.

The alternative was a third state: the item stays paid and the row says its payment was struck. It is truthful, and it is a state nobody asked for. It costs a badge, copy for it, and a decision on every screen about what a struck payment means; and it leaves the plan and the ledger still disagreeing about the same money, only politely. Striking a Movement is a person saying that expense did not happen. The plan has no business remembering that it did.

## The reach into the plan is a read

The cost the ticket named is that striking a Movement now reaches back into a plan, which nothing else in the app does. It is smaller than it sounds, because the reach is a **read**.

`strikeMovementInSpace` is untouched. It writes `struck_by` and `struck_at` onto one Movement, the way it always did, and knows nothing about `budget_items`. No column was added, no migration was run, and no row of any plan is written when a payment is struck. What changed is that every read of the plan asks the ledger about the Movement it points at, in the same query — a `LEFT JOIN` on `movements` in `findBudgetItemInSpace`, `budgetItemsInMonth` and `budgetItemsInMonthForSpaces`.

The join is LEFT because most rows point at nothing: a Variable item never does and a pending Fixed one does not yet. An inner join would drop the whole pending half of a month's plan.

This is the rule, and it is stated once so the rest of the pointer's questions can be answered without deciding it again: **`movement_id` is a pointer at an entry in the ledger, and the plan asks the ledger about it rather than remembering what it once answered.** An item does not own the Movement it points at, and it holds no copy of it.

It is worth being exact about how far that reaches, because it is narrower than it sounds. What is read through is whether the payment *stands*. What is not read through, and must not be, is the amount: `budget_items.amount` is what the month expected to spend and the Movement's amount is what was spent, and a Member correcting the rent Movement from $1.800.000 to $10 leaves a plan that expected one and a ledger that recorded the other. That is not a disagreement — it is the comparison a Budget exists to make (ADR-0019: a plan and never a limit). Only the *existence* of the payment is a fact both halves must tell the same way, because only that one is written down twice.

So what #48 inherits is the shape and not its own answer: an item may not quietly rewrite the Movement it points at, because a plan does not own a ledger entry. Whether correcting a paid item is refused outright or corrects both is still #48's decision to make and to write down.

## Paying it again

Paying a struck item is an ordinary payment and not an undo: it records a new Movement, exactly one, and hangs it on the item in place of the old pointer.

That is why the pending condition in `payFixedItemInSpace`'s `UPDATE ... WHERE` is now the pointer being **where the read above found it**, rather than the pointer being null. Null would refuse the one case this ADR exists to allow. Compared this way it is the same guard it always was — whoever moved the pointer between the read and the write wins, and the loser is told the item is paid rather than told to try again — and it stays one statement the database decides, with no gap for a second thumb to fit inside.

`budget_items_movement_pays_one_item` still holds, and holds for the same reason: the old pointer is released rather than kept. The struck Movement stays in the ledger as an entry with nothing pointing at it any more, which is exactly what it is.

## Consequences

A struck payment brings the due line back. `dueNotice` says nothing about an item that is paid, so the row goes back to counting down to its day — which is right: it is a bill somebody still owes.

Nothing reads *why* an item is pending. A row that was never paid and a row whose payment was struck are the same row on the screen, and deliberately: what a Member has to do about either is identical. The struck Movement is still in the ledger for anybody who wants the history, which is the record ADR-0015 exists to keep.

A write reads its own row back as pending (`asPending`), because it cannot join: `RETURNING` names columns of the table being written. That is honest rather than convenient — an insert leaves `movement_id` null, and `amendItem` refuses the only kind that can carry one — but it is one assumption in one place, and it is written down there. ADR-0034 is where it stopped covering every write: a Fixed item's correction writes a row that may carry a struck payment, so that one says its own `struck_at` and `asPending` keeps the three that cannot be looking at a paid row.
