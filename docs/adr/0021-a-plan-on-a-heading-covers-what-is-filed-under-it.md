# A plan on a heading covers everything filed under it

#11 asks that "a Variable item accumulates the Movements recorded in its Category". Read literally, that is an exact match on `category_id`. The catalogue is two levels, though — "Comida" holds "Comida · Súper" — and both a Budget item and a Movement may name either level. So the sentence hides a decision: **a shop filed under Súper, does it count against a plan written on Comida?**

## The decision

It does. A plan on a heading is measured against everything filed under it, one level down and no further, because the catalogue is two levels and no more.

The user was asked this directly, because it decides whether the comparison tells the truth or is quietly always wrong for a whole class of Member. They chose the rollup.

The alternative was the exact match, and it is the smaller code. What it costs is the person who plans by heading — "four hundred thousand for Comida this month" — and then shops the way everybody shops, under Súper and Restaurante. Every line of their Budget would read `$0 / 400.000` all month. That is not a comparison that is empty; it is one that is wrong, and it is wrong in the direction that says "you are fine" to somebody who is not.

The code had already promised this. The comment on `CategoryBranch` has said "a Budget on a parent covers its whole subtree" since #10, and nothing implemented it. A comment that describes behaviour the code does not have is a decision made and then dropped.

## Where it is said

`comparedToPlan` in `src/domain/budget/budget.ts`, in one function, `countsAgainst`. The rows are the plan's, so a Category nobody planned for draws no line: a comparison against no expectation is a figure with one half missing.

Income never reaches it — it carries no Category at all (ADR-0016) — and two currencies are a refusal rather than a conversion, because the sum goes through `spent` (ADR-0007).

## Consequences

A Space that plans **both** a heading and something under it gets two lines, and one shop appears in both of them. That is not double counting: neither line is a total, each is one Category measured against its own expectation, and the shop really is inside both. The month's own total (`expected`, `spent`) is unaffected, because it never goes through this.

The alert follows the same rollup: a heading is over when everything filed under it adds up past what the heading expected. That is the only reading that matches "the alert fires on the Category's monthly total".

If the catalogue ever grows a third level, `countsAgainst` is the one place that has to learn about it, and it will have to walk rather than look up. Do not spread the walk into the readers.
