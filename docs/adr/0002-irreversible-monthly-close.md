# Closing a month is irreversible, and late expenses carry their entry date

A month is closed by hand, once a Member decides it is complete. We considered making the close a report snapshot that leaves the underlying Movements editable, so that a receipt found later could still be filed in the month it belonged to.

We decided the close is a hard freeze. Nothing inside a closed month can be edited and no Movement can be added to it. A receipt found after the close is recorded with the date it was entered, not the date the money actually moved. The close is manual precisely because it is irreversible: the Member decides when they have finished loading, rather than the calendar deciding for them.

## Consequences

A closed month can under-report what was really spent, and a late September expense lands in October, where it consumes October's Budget. This is deliberate. Do not "fix" it by back-dating Movements into closed months or by adding an unlock: the guarantee that a closed month never changes is the reason the close exists.

## Built, in #117

The close exists. ADR-0052 records how: one row per Space and month in `closed_months`, and one refusal above the domain — `refuseAClosedMonth` — that every write into a month passes through, its plan and its Movements alike. The row cannot be updated or deleted, so the "no unlock" above is enforced by the database and not only by the code that means it.

One thing is settled here that this decision left open. A month may only be closed **once it has ended**, measured on the Reader's day (ADR-0018) and never the server's. That is not the calendar deciding when somebody has finished loading — it still never closes a month and never nags. It only refuses to freeze days that have not happened yet, on an act that has no undo.
