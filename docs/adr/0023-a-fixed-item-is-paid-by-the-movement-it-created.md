# A Fixed item is paid by the Movement it created

#13 asks for the other half of a Budget: items whose amount and due date are known in advance, where "marking it paid is what creates its Movement, so the Member never types rent twice". Two decisions hide inside that sentence: **how does an item say it is paid**, and **what stops a second tap creating a second expense?**

## The decision

An item is paid when it holds the Movement that paid it. `FixedItem.payment` is null while it is pending, and `isPaid` is one reading of it. (It was `movementId` here; ADR-0031 made it the Movement *and* whether that Movement still stands, which is the same refusal to hold two facts that have to agree.)

The obvious alternative is a `paid` boolean beside a Movement recorded separately. It is the same information written down twice, and two facts that have to agree are two facts that eventually will not: a half-finished write leaves a row saying "Pagado" with no money anywhere in the ledger, or an expense in the month with a plan still asking to be paid. Neither is recoverable by looking, because both halves look correct on their own.

Held as the Movement, "paid" and "there is a Movement for it" are the same sentence. There is nothing to reconcile because there is only one fact.

## What stops the second Movement

Three things, and the innermost is the one that actually holds.

`paymentFor` refuses an item that already carries a Movement, which catches the ordinary case: a person tapping a row twice. It is not enough on its own, because two taps can both read a pending item before either writes.

`payFixedItemInSpace` puts the pending condition in the UPDATE's `WHERE` rather than in a read before it, and does both writes in one transaction. The loser of a race updates no row, and is told the item is already paid — the same answer the second tap on one thumb gets, because it is the same truth. The refusal is thrown rather than raised through `tx.rollback()`: any throw rolls the transaction back just the same, and drizzle's own `TransactionRollbackError` is a thing no layer above recognises, so the loser would have been told to try again about a payment that had already gone through. A Movement recorded with nothing pointing at it is money in the ledger the plan still calls pending — the row a Member would then pay a second time — so the transaction is not a nicety here, it is the whole of "exactly one Movement".

`budget_items.movement_id` is UNIQUE, which is the same rule one layer down and the only one that holds for a write that never goes through the domain at all.

## Two kinds, one table, one plan

`BudgetItem` is a union of `VariableItem` and `FixedItem`, and both live in `budget_items` with a `kind` column. What only a Fixed one carries — its name, its due day, its payment — is nullable, and a check holds each kind to exactly what its kind carries.

Not a second table, because the two kinds are one plan: they add into one total, they are read as one month's list, and a union of two tables would turn each of those into two queries kept in agreement by hand.

The due date is held as a `date` and built from the item's month (`dayOf`) rather than typed as one. An item is planned *on* a month, so a date carrying its own month could disagree with the plan it sits on. A day the month does not have is refused rather than rounded: the 30th of February is not a late February, it is a day that will not arrive, and moving a due date back two days behind somebody's back is worse than saying the plan cannot be written.

## The day the payment lands on

The Reader's day, not the server's (ADR-0018).

Recording an expense by hand reads the clock differently, and the difference is the point. There, `today` is a *bound* on a day somebody typed into a form, and it is deliberately the blunter server answer — a guard rail against a nonsense date, generous on purpose. Here nobody types a day at all, so there is nothing to bound: the clock *is* the date the money is recorded on.

Taken from the server it would be wrong in exactly the way ADR-0018 was written about. At nine at night on the 30th of September in Bogotá the server is already in October, so paying September's rent would write a Movement dated the 1st — an October expense that September's own plan can never count. The two halves of this feature would then disagree about what day it is, because `dueNotice` already measures against the Reader's.

It is not a clock a tap can move: it comes from the zone the request arrived with, which the edge states and the browser does not.

## What the Fijos section costs the Variables beside it

The Movement a Fixed item creates is spending in its Category like any other, so `comparedToPlan` had to decide what to do about it. It does two things, and they are halves of one rule:

- A Category's expectation is the **whole** plan for it, Fixed items included. A denominator that left the Fixed item out would report a Member over on a plan they kept to the peso.
- A comparison row is drawn only for a Category that has a **Variable** item. A Category planned only with Fixed items has one question — did it get paid — and the Fijos row answers it with a badge; a meter beside that would read `$1.800.000 / 1.800.000` the moment it was paid, drawing what the badge already said.

## The line that says the day is near

The canvas writes "Suscripciones · 22 sep · avisa 3 días antes" on an item close to its day. #1 lists email reminders, "including a subscription's advance warning before it renews", as phase two and deliberately deferred — so that copy signs for an email nobody sends.

The user was asked, and chose the honest line: it says the day is near and promises nothing more. `dueNotice` decides which of four things a day means — overdue, today, tomorrow, or a count of days — and the words for them are copy (`budget.fixed.due.*`). Five days is what counts as near, which is what reproduces the canvas: the 22nd warned and the 25th quiet, with the 18th being lived in.

A day already past is louder rather than quieter. An unpaid item behind its date is the one a Member most needs telling about, and going grey again on the 23rd would hide exactly that.

## Where the month's total lives

`expected` sums both kinds, so the "Planeado" row is the total of the whole plan. It stopped being "the total of exactly the rows above it" — which is what #10 wrote on it — the moment a second kind existed, and the comment now says so rather than pretending. The empty state moved with it: a month with the rent on it and nothing else has been planned, so "Todavía no planeaste este mes." is asked of the whole plan and not of the Variable half.

The Fijos section sits above it, the way the canvas draws it. #40 moves the total into the summary card the canvas actually puts it in.

## Consequences

A Fixed item has no correction screen. `readableBudgetItem` refuses one outright and `amendItem` throws rather than letting the Variable item's correction through, because that form asks for a Category and an amount and nothing else — saving through it would strip the name, the day and the payment silently. The refusal makes it a gap somebody can see rather than a hole they fall into; the screen is its own ticket. #48 is that ticket, and ADR-0034 is what it decided: `amendFixedItem` asks the four questions, `amendItem` goes on refusing a Fixed item but now to name the other door, and a paid item is corrected by striking its Movement out first.

Striking out a Fixed item's Movement left the item still saying "Pagado". The pointer stayed honest (the Movement is an entry and not a gap, ADR-0015) but the plan and the ledger disagreed about whether the money moved. Nothing in #13 asked about this and nothing here answered it; ADR-0031 does, and it is what `FixedItem.movementId` became a `payment` for.

`kind` ships with a `DEFAULT 'variable'`, which is the expand half of an expand/contract (ADR-0008). Dropping it is the contraction and its own ticket, exactly as 0007 was to 0005.
