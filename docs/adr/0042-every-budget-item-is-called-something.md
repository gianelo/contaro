# Every Budget item is called something

`budget.ts` had already made this argument, for half the table. On why a Fixed
item carries a name:

> A Fixed item is read by its name and not by its Category: three subscriptions
> under "Suscripciones" are three rows a person has to tell apart, and the
> Category is the quieter second line.

Four weeks of groceries under "Súper" are four rows a person has to tell apart.
It is the same sentence with different nouns, and the file never noticed —
seventy lines further down it stated the gap as though it were a rule:

> a Variable item has no name and no due day, so a correction carrying either
> is not a correction of one

That was true of the code and it was never true of the product. `VariableItem`
was `PlannedAmount & { kind: "variable" }`: no name, no column, no field on the
entry screen. So the plan drew a Variable row by its Category, and ADR-0019's
own example of how a person plans a month — a week of shopping at a time —
came out as four identical lines with four different amounts. The only way to
know which one to correct was to remember which amount was which.

## The name is not a property of a kind

The repair is not "give the Variable item a name too". It is that the name was
never about the kind. `name` moves up onto `PlannedAmount`, the shape both
kinds are made of, and `FixedItem` stops declaring one.

What is left on `FixedItem` after the move is the whole of what makes it a kind
of its own: a due day and a payment. That reads correctly — nobody pays
"comida", they shop under it eleven times, and there is nothing on one to mark.
The kinds differ by *when the money moves and whether it has*, and they never
differed by whether the row could be told from the row above it.

Three types shrank to say so: `FixedItemDraft` and `FixedItemAmendment` now add
only `dueDay`, and `MAX_FIXED_ITEM_NAME_LENGTH` became
`MAX_BUDGET_ITEM_NAME_LENGTH` — one ceiling, because the name is one field on
one shape and a row is a row.

## Required, and the alternative is where this started

Optional was on the table and it is the answer that keeps the bug. A blank name
falls back to the Category, which is exactly the screen #79 was opened about —
so a plan whose author skipped the field is the plan the ticket describes, and
the domain would carry `string | null` forever to make that possible: two ways
to read a row, and every reader holding both.

The cost is real and it is small: planning four weeks of groceries asks for
four names. This is not #66. #66 asks the same question of a **Movement** and
answers it the other way, because recording an expense happens standing at a
till and ADR-0028 gives that screen one thing to do. Planning a month is done
sitting down. The Fixed form has asked for a name since #13 and nobody has
objected.

## What the existing rows are called, and why the migration speaks Spanish

Every Variable row in the database had no name, so the migration needed a
default, and the honest one is what those rows have been *drawn as* until now:
their Category.

Reading `categories.name` is the obvious way to get that and it would have been
a disaster. `categories_shipped_or_typed` splits naming in two: a Space's own
Category carries `name` and no `slug`; a **shipped** one — the global catalogue
— carries `slug` and `name IS NULL`, because its name is copy the screen
resolves through `category.<slug>`, which is what keeps a second language a
file rather than a migration.

Most plans are set on the shipped catalogue. On the development database, **1350
of 1352 Variable rows** sit on shipped Categories. `COALESCE(categories.name,
category_id::text)` would have named all 1350 with a UUID — and that is worse
than leaving them nameless, because the screen used to resolve the slug to
"Supermercado" and would then have shown the identifier forever.

So the backfill borrows the catalogue's Spanish once, in SQL, and freezes it.
Copy in a migration is normally a smell and here it is the point: this is not a
second source of truth, it is a **historical record of what a row was drawn as
on the day this ran**. A later rewording of `category.food` does not chase these
rows and should not — by then a person has had every chance to correct the ones
they care about.

Which leaves the mapping's own two failure modes, and they are not the same
risk. A **missing** slug is silent and catastrophic: the `CASE` falls through
to the identifier and those rows are named with a UUID, which is the bug this
whole section exists to avoid. That one is held by a test —
`src/i18n/category.test.ts` already reads 0003's seed, and now reads 0012's
`CASE` beside it and holds the two to being the same set of slugs. A **wrong**
label is neither silent nor catastrophic, and it is deliberately unguarded: a
test pinning these strings to `category.*` would forbid the very rewording the
paragraph above says is fine. The labels record a day; they do not track a file.

## The bridge is a trigger, because a DEFAULT cannot read a sibling column

ADR-0008 runs migrations from an Action while Vercel deploys in parallel, so
for a few minutes old code — which has never heard of naming a Variable item —
is still inserting here without one. `0009` bridged that window for `kind` with
`DEFAULT 'variable'` and `0011` dropped it; `0005` and `0007` did the same for
a direction.

A column DEFAULT cannot do it this time. The honest name is read off
`category_id` on the same row, and a default is a constant. A `BEFORE INSERT`
trigger says the rule the backfill says, through the same function so the two
cannot drift, and it has the same expiry both defaults had: `0013` drops the
trigger, its function and `budget_item_name_for_category`, and adds
`ALTER COLUMN "name" SET NOT NULL` (#90). The frozen names stay; the machinery
that produced them goes.

## A CHECK that evaluates to NULL is satisfied

Moving the rule uncovered one. The old constraint asserted, inside the Fixed
branch:

```sql
char_length(btrim("name")) > 0
```

That was never a rule about a missing name. With `name` null the expression is
null, `true and null and true` is null, and **a CHECK that evaluates to NULL
passes**. It refused a blank name and let a null one straight through, so a
Fixed item called nothing has been writable since 0009 — held out only by
`asFixedItem` throwing on the way back, which is a reader defending an
invariant the writer never had.

The new constraint writes `name is not null` out first, for the whole table
rather than inside a branch, which is what makes the rest of the expression
mean what it always looked like it meant.

That is also why the backfill runs over both kinds and not only the Variable
ones. A migration that argues a nameless Fixed row has been writable for two
releases, and then skips those rows, aborts on `ADD CONSTRAINT` halfway
through a deploy — which is the one thing ADR-0008's whole discipline exists
to prevent. A Fixed row is not drawn as its Category the way a Variable one
is, but a row that reached here nameless was never named by anybody, and its
Category is the only readable thing it carries.

## What was measured and not fixed

The ticket asked that the entry screen still fit 390×664 with the field on it,
measured and not estimated. It was measured, and the premise was false:
`/presupuesto/nuevo` has never fitted. Guardar lands at 759 against a 664
viewport and the document runs to 913. The name field costs 86px of that; the
other 163 were there before, and `/nuevo/fijo` is 335px over and has never been
measured at all.

That is not this change's bug and it is not this change's size — the tab bar is
the first honest lever and buys 94 of 249, after which the next thing in the
list is a 310px keypad. It is #86, with the numbers, the per-block breakdown
and the written test.

Since #80 there is one screen over the fold rather than two: `/nuevo/fijo`
renders no form at all now, and the merged screen carries both kinds at the
height the Fixed one used to be. ADR-0044 has the current figures, and #86
still owns them.

## Consequences

Planning a month costs a name per item, and the plan's rows can be told apart
without their amounts. #63 is unblocked: once each Category's meter opens the
items behind it, they have something to be drawn by.

The database permitted a null name for one deploy, and while it did, "every
Budget item is called something" was held by a check, a trigger and the domain
rather than by the column — with the trigger putting the name half of that
check out of reach from `INSERT`, so the test proving the database refuses a
nameless item had to be written against `UPDATE`. `0013` ended that (#90): the
column refuses the name that is not there, the check refuses the one that is
only spaces, and the test is back on `INSERT`, where it belongs.

And the migration now carries twenty-three Spanish words that a translation
file also carries. They will drift, and they are supposed to: one is what the
catalogue says today, the other is what a row was called in September 2026.
