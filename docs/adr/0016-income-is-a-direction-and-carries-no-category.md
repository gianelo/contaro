# Income is a direction, and it carries no Category

#8 asks for "a Member records income as well as expenses". That sentence hides two decisions: **how** a Movement says which way the money went, and **what a Movement of that kind carries**.

## How the direction is said

A `direction` column of `expense` or `income`, and never the sign of the amount.

The alternative was there and it was cheap: leave the schema alone and let income be a negative amount. We did not take it, and CONTEXT.md had already said why before this ticket started — "an expense and an income are the two kinds of Movement". Every figure in this product is a positive whole number of minor units (ADR-0007), the `movements_amount_is_money_that_moved` check has said `amount > 0` since #7, and putting the meaning into a minus sign hides the most important fact about a row inside a character that any `Math.abs` downstream erases without a word. A kind is a thing you can group by, index on and refuse; a sign is a thing you can lose.

It is `text` with a check rather than a Postgres enum, for the reason `spaces.currency` is text (ADR-0001): the set of directions belongs to the domain — `isMovementDirection` is the one place it is written — and an enum type would make changing it a migration on a type rather than a line in the module that owns the rule.

There is **no default** on the domain side. A draft arrives from a form, so its direction is a claim like the day and the amount are claims, and `recordMovement` refuses a word that is neither rather than rounding it to `expense`. Defaulting here would quietly file somebody's salary as a purchase and say nothing about having done so. The column carries `DEFAULT 'expense'` only as the expand step of ADR-0008 — the rows that already exist are all expenses, and the code of #7 is still writing while the migration runs. The contraction, `DROP DEFAULT`, is a later deploy.

## What income carries

No Category. `category_id` becomes nullable, and null exactly when the Movement is income.

The user was asked this directly, because it reaches into #6 and #10, and chose it over growing the catalogue an income half. The reason it is the right answer is in the glossary: a **Budget** is "the plan of expenses a Space expects to make", a **Variable item** "sets an expected amount for a Category", and **Pace** measures spending. Every use of the Category dimension in this product is a comparison against a plan of expenses. A Category on income would be a bucket no Budget ever reads — a dimension that exists to be measured, on rows nothing measures.

The catalogue #6 seeded says the same thing out loud: Comida, Hogar, Transporte, Salud, Ocio, Personal, Educación, Mascotas, Otros. There is no shipped Category a salary belongs under, and the honest reading of that is not "seed four more" but "this dimension is about expenses".

Nullable is the shape, and the check is what stops it from being a hole:

```sql
(direction = 'expense' AND category_id IS NOT NULL)
OR (direction = 'income' AND category_id IS NULL)
```

Income under "Alquiler" is the single row that would make every Budget figure in #10 onwards wrong, so it is refused in the domain (`filing`), in the check, and — because there is no Category to check a Space against — the `movement_belongs_to_its_space` trigger now skips that half when there is none. Three places, the way #7's rules are in three places.

## The direction cannot be corrected

`amendMovement` throws `DirectionIsImmutableError`, and migration 0005 puts a trigger under it, exactly as #7 did for `recordedBy`.

This one is ours rather than the user's, and it follows from the two decisions above rather than standing on its own. The two kinds do not carry the same answers: turning an expense into income would have to throw its Category away, and turning income into an expense would have to invent one, in the same breath as the "correction". That is not correcting an entry; it is a different entry. ADR-0015 already made unmaking one cheap and honest — strike it out, and the row says who did it — so the cost of this refusal is two taps, and what it buys is that an expense was an expense for the whole of its life.

The correction screen therefore does not offer the toggle at all. A control whose only possible outcome is a refusal is a control that should not be on the screen; the direction rides along as a hidden field so the correction still carries every answer the recording did, and `amendMovementAction` **reads** it. A hidden field the action ignored would make the refusal unreachable from any screen and this paragraph a lie — so `MovementAmendment.direction` is a plain string, like the draft's, and anything that is not this Movement's own direction is refused by the one comparison rather than by a second rule kept in step with the first.

## Consequences

`spent` and `earned` are two functions over one private `total`, and the month shows both figures and never their difference. A single net number renders a month in which a salary arrived and the rent was paid as though almost nothing had happened in it — which is the opposite of what a person opens this screen to find out.

On the entry screen the direction sits **under** the keypad, not above it. Story 18 in #1 puts the amount first because it is the only part a person might forget on the way home from the till, and a question above it is a question standing between them and the number. It sits above the Category because it decides whether there is a Category to ask about at all.

Income is marked with a written `+` and never with a colour. This product has one accent colour and it already means "this can be tapped" — every row on the month's list is a link — so tinting an amount with it overloads the one signal the screen has. A sign is read out by a screen reader, survives a black-and-white printout, and is visible to somebody who cannot tell the two greens apart.

**Reopened by #39, and only half of it moved.** The canvas colours income as well as signing it — on the two stat cards at the top of the month's list, and on the amount at the end of an income row — and the user was asked directly, because the paragraph above refuses it in as many words. They chose the canvas.

What the refusal got right is untouched: the `+` stays. The reason it was written was that a difference carried by colour alone is one somebody cannot see, and that reason survives a colour being added *on top of* the sign rather than instead of it. It is the same rule the glossary already applies to a Category over its plan — "said in colour, in words and in an icon at once, never in colour alone" — so this is not a new principle, it is this screen catching up with one the rest of the product already follows.

What was traded away is the second argument, that the accent means "this can be tapped" and nothing else. That cost is real and is being paid knowingly: on the month's list the accent now means two things, and what keeps them apart is that one of them is a whole row and the other is a few characters at the end of it. If that turns out to read wrong on a screen full of income, the way out is a `--color-income` of its own rather than going back to an uncoloured figure — the canvas is legible and the argument for the sign is not the argument against the colour.

`movementsByDay` groups a month by the day money moved, most recent first, and days with nothing in them are absent rather than empty. A day is what a person remembers about money; an empty row is a row a thumb scrolls past, and a month of thirty of them buries the four that matter.

The month can be walked backwards without limit and forwards only as far as the month being lived in (`monthsAround`). Nothing can have happened after today — `recordMovement` refuses a day that has not — so every later month is guaranteed empty, and offering them is offering a corridor of blank screens with month names on them.

Whose money it was is shown on a row **only in a shared Space**. In a Space of one, every Movement is the reader's, and a line that says the same thing on every row is a line a thumb stops seeing.

What this postpones: there is no way to say where income came from — salary, a sale, a gift. If that turns out to be wanted, it is a field on income and its own ticket with its own decision, and it is emphatically not the expense catalogue borrowed for a job it was not built for. The **Carry-over** (ADR-0003) is the one income this design already anticipates: it is recorded as income attributed to no Member, which is a nullable `attributed_to` and an `origin`, and that is #15's problem rather than this one's.
