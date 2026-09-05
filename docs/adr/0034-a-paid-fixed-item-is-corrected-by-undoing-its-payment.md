# A paid Fixed item is corrected by undoing its payment

#13 gave a Fixed item a name, a day it falls due on and a payment, and gave it no screen to change any of them. ADR-0023 recorded that as a gap somebody can see rather than a hole they fall into: `readableBudgetItem` refused a Fixed item outright, so its correction screen was a 404, and `amendItem` threw rather than letting the Variable item's correction — which asks for a Category and an amount and nothing else — strip a name, a day and a payment off one silently. #48 is the screen that asks the right questions.

Building it forces a decision ADR-0031 explicitly declined to make for it. A paid item's amount is already in the ledger. Correcting it afterwards leaves the Movement saying one figure and the plan another, so either the correction is refused while it is paid, or it corrects the Movement too.

## The decision

**A paid Fixed item is neither corrected nor taken off the plan.** Both are refused while its payment stands, and the way to do either is to strike the Movement out first — which #49 already made an ordinary, reversible thing to do.

One rule and not two, for the same state. The alternative was to let the correction reach through the pointer and rewrite the Movement, with the removal deleting it after a confirmation. It saves a Member two taps and it costs the boundary ADR-0031 drew: *a plan does not own a ledger entry*. Money is recorded when somebody says it moved, and it is unrecorded when somebody says it did not — from the ledger, deliberately, on the screen that exists for it. A plan quietly rewriting an expense is the plan deciding what was spent.

It is also the cheaper rule to be wrong about. Refusing costs a Member a detour they can see and undo. Rewriting costs them a figure in their ledger that they never typed.

The way out is named where the refusal is. A paid item's screen shows no form and no removal — a control that can only be filled in and then refused is worse than no control — and it carries a link to the Movement that paid it, because a sentence telling somebody to undo something they cannot reach from here is a dead end with good manners.

## The refusal is a domain rule, not a screen

Two guards were keeping a Fixed item out of the correction path, and only one of them was a rule.

`amendItem` threw, which is a rule. It still refuses a Fixed item, but the refusal now means *which door* rather than *there is none*: `amendFixedItem` is the other one. Two functions and not a branch inside one, mirroring `planItem` and `planFixedItem` — the two kinds are asked different questions, so `FixedItemAmendment` carries the two more that a Variable item has no answer for, and the type refuses the mismatch before any code has to.

Removal was not a rule at all. `removeBudgetItemFromSpace` was a `DELETE` filtered on an id and a Space and nothing else — no kind, no payment — and there was no removal function in the domain. The only thing keeping a paid Fixed item out of it was that no screen linked to one, which is a guard that lasts exactly as long as the screens do. This ticket builds that link. So removal became `unplan` in the domain, called before the delete, and the read it needs is why the port now takes the Space rather than its identifier.

Both writes carry the payment in their `WHERE` and not in their `SET`: the pointer must still be where the read found it. That is the same compare-and-swap `payFixedItemInSpace` uses, written once as `paymentIsStill`, and it is what catches the thumb that pays an item between the read that found it pending and the write that corrects it. Not "still unpaid", which would refuse the struck payment #49 exists to allow — "still the pointer I read".

## What a correction does not touch

A correction never writes `movement_id`. A standing payment refuses it outright, and a struck one is kept rather than cleared: the plan reads through the pointer and never caches what it said (ADR-0031), so what "paid" means stays the ledger's answer across a correction as much as across anything else.

That broke one assumption written down in ADR-0031. A write reads its own row back through `asPending`, because `RETURNING` cannot name a column of another table — and that was honest while `amendItem` refused the only kind that could carry a payment. It is not honest for the *Fixed* correction: an item whose Movement was struck would come back with a `movement_id` and no `struck_at`, which is exactly how a *paid* item reads. So `asPending` keeps the three writes that cannot be looking at a paid row — the two inserts and the Variable correction, which is still refused on the only kind that carries a payment — and the Fixed correction says its own `struck_at`, the one its read returned a moment earlier.

## The row had to grow a second thing to do

A Fixed row was a button that opened the pay sheet, and a paid row was inert. There are two things to do to one line now, and `GroupedListItem` renders `trailing` *inside* the link or button — where a nested control is not something a keyboard or a screen reader can reach, whatever it looks like.

So the row became a link to its item, the way a Variable row already was, and the item takes a `beside` slot that sits outside it. Marking paid lives there, wearing the "Pendiente" badge and named by what tapping it does. A paid row keeps the link and loses the control, which is the row that most needed a way in: it was the one with nothing left to do.

## Consequences

The correction screen is one URL and two forms. `readableBudgetItem` no longer refuses a Fixed item and returns a union discriminated on `kind`, so a row linking to an item does not have to know which kind it is; the screen branches once, on what came back.

Planning and correcting a Fixed item are one form, as they already were for the other kind. `FixedItemForm` took `initial`, `action`, `submit` and `working` the way `BudgetItemForm` had them, and both screens pass their own. Two copies would have been two places for the correction to stop being held to the rules the planning was — including the one ADR-0023 wrote about February: a day the month does not have is refused and never rounded, asked again of the correction.

Nothing reads why an item is pending, and that stays true here. An item that was never paid and one whose payment was struck are corrected and removed identically, because what a Member does about either is identical.
