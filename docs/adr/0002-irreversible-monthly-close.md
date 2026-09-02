# Closing a month is irreversible, and late expenses carry their entry date

A month is closed by hand, once a Member decides it is complete. We considered making the close a report snapshot that leaves the underlying Movements editable, so that a receipt found later could still be filed in the month it belonged to.

We decided the close is a hard freeze. Nothing inside a closed month can be edited and no Movement can be added to it. A receipt found after the close is recorded with the date it was entered, not the date the money actually moved. The close is manual precisely because it is irreversible: the Member decides when they have finished loading, rather than the calendar deciding for them.

## Consequences

A closed month can under-report what was really spent, and a late September expense lands in October, where it consumes October's Budget. This is deliberate. Do not "fix" it by back-dating Movements into closed months or by adding an unlock: the guarantee that a closed month never changes is the reason the close exists.
