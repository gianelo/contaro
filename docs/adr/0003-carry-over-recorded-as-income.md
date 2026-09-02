# The carry-over is recorded as income, not as budget capacity

When a month closes, the unspent part of its Budget is approved by the Members and carried into the next month. We considered adding it to the next month's Budget as extra capacity, leaving the ledger untouched, since the money never physically moved.

We decided to record it as an income Movement in the following month, attributed to no Member, with its origin set to the carry-over of the month it came from. It matches how the Members already think about the leftover — money that is available again — and it keeps the carry-over visible in the ledger instead of buried in a budget adjustment.

## Consequences

Money counted as income in the month it was earned is counted again when it is carried over, so income totals spanning more than one month are inflated by the carried amounts. This is known and accepted, not a bug to fix. Any report about what each Member contributed must filter on `origin`, which is the reason Movements carry that field at all: `attributedTo` is empty on a carry-over because no Member earned it.
