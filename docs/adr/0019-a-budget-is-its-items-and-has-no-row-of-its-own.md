# A Budget is its items, and it has no row of its own

#10 asks for "a Member creates a Budget for a month in a Space", listed as its own acceptance criterion, separate from "a Member adds a Variable item". That sentence hides a decision: **is creating a Budget something a person does, or something that happens?**

## The decision

It happens. A month's plan comes into existence with its first item, and there is no `budgets` table above `budget_items`.

The user was asked this directly, because it decides both the schema and the screen, and chose the implicit half. A Budget is not a thing you make and then fill; it is what you have planned. The empty one is not a state anybody is in on purpose — it is the state of every month before somebody thinks about it, and it needs no row to be true.

The alternative was there and it read the acceptance criterion more literally: a `budgets` row keyed by `(space_id, month)`, created by tapping "Crear presupuesto", with items hanging off it. What that buys is one place to put per-month state later. What it costs is a tollbooth in front of the only act that matters. A person who opens Presupuesto on the 1st wants to write down that groceries are two hundred and forty thousand; asking them to declare a plan before they can plan is a tap that answers a question they did not have.

## Why the future does not need the row either

The obvious objection is that the **monthly close** (ADR-0002) and the **Carry-over** (ADR-0003) will need somewhere to live, and a `budgets` row is the obvious somewhere.

It is not. The close freezes a month — "nothing inside a closed month can be edited and no Movement can be added to it". Its subject is the month, its Movements as much as its plan, and a flag on a Budget would be a flag that half of what it freezes does not point at. A month with no plan can still be closed, and under that design it could not be. So the close gets its own home when its ticket arrives, and it will be a home the Movements can see too.

The Carry-over is income in the following month (ADR-0003), which is a Movement. It does not hang off a plan either.

## Consequences

`budgetItemsInMonth` returning nothing is the honest answer for a month nobody planned, and `expected([], currency)` is zero in the Space's money rather than no answer at all — the same shape `spent` has. The screen shows what to do instead of an empty container.

The plan's month walks forwards as well as back (`monthsToPlan`), where the month's list of Movements stops at the month being lived in (`monthsAround`). Same screen furniture, opposite rule, and it follows from the same difference: a Movement is money that has already moved, so every month ahead of a ledger is guaranteed empty, and a plan is what a Space expects to spend, so the month ahead is exactly the one somebody opens on the 28th.

Several items on one Category are deliberately **not** a unique-key violation. They are how a person plans a month in weeks, and they behave as a single item of their combined amount: `expectedByCategory` is where that is said, once, and it is what #11 measures spending against. The rows stay several so all of them can still be corrected.

Do not "fix" this later by adding a `budgets` table so that a month can carry a status. The month is what carries a status, and a plan is what a Space has written down about it.
