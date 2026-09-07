# A Movement is called something, or it is called nothing

The month's list drew a column of Categories. Three trips to the same
supermarket were three identical rows, and the only thing telling them apart was
three different figures. `design/Movimientos.dc.html` had drawn the answer years
before the model could hold it — `Éxito`, `Panadería La 70`, `Uber`, each with
its Category quiet beneath — so the artboard was describing a field that did not
exist rather than a screen that had drifted. A Movement carries a name now (#66).

## The name is offered and never demanded

It is nullable, and that is the argument rather than an omission.

ADR-0042 asked this same question of a Budget item and answered it the other
way: every item must be called something, because four weeks of groceries under
"Súper" are four rows a person can read down but not correct. It also said, in
as many words, that #66 would be answered the opposite way — "planning a month is
done sitting down; recording an expense happens standing at a till." That
reasoning still holds and is why the field is optional here.

What it buys is that nothing about recording an expense got slower. Somebody who
does not want to name this one types the amount, taps a Category and taps
Guardar, exactly as before: the field sits there empty and asks for nothing. No
asterisk, no "opcional" in the label, no Guardar disabled until a name appears.
That is #66's second acceptance criterion and story 18 in #1.

The cost is that the month's list has two ways to title a row — the name when
there is one, the Category when there is not — which is the shape ADR-0042
rejected for Budget items. It is admitted rather than argued away: a row with no
name is read exactly as every row was read before this field existed, so the
fallback is the old behaviour and not a second design. A named row takes the
whole filing onto its second line instead: `Comida · Supermercado`, heading
first, which is the order the catalogue reads in and the order the artboard
draws.

A blank is stored as nothing, never as `""`. `called` in the domain trims and
answers null, so a form that posts an empty input and a form that posts no input
cannot come to mean two different things — and a row can never carry an empty
name that would draw a blank line where its Category should be. Migration 0014
says the same thing under the domain, written `name IS NULL OR ...` and not left
implicit, because 0012 found that a CHECK evaluating to NULL is satisfied in
Postgres.

Sixty characters, which is what a Budget item and a Space already have. A name
past it is refused and never cut down to it, for the reason ADR-0036 gives about
an amount: what is stored is what somebody meant, and making a long one fit is a
screen's job.

## It is typed, and the product does not offer one

#66 asks it directly — "is it a name somebody types, or a thing the product
remembers per Category and offers?" — and this change answers the first without
closing the second.

Typed, because the offer has nothing to offer yet. A product that remembers per
Category needs names to remember, and on the day this ships every Movement in
every Space carries none. So the remembering version is not an alternative that
was weighed and lost; it is a second change that this one is the precondition
for, and building the picker first would have shipped an empty list on the one
screen that cannot afford a wasted tap.

What is closed deliberately is the browser's own recall, with
`autoComplete="off"`, and it is aimed at one wrong offer rather than at recall
in general: the input is called `name`, and a browser reading that as a person's
name offers whoever is holding the phone where a shop belongs. Offering "Gian"
as what an expense was is worse than offering nothing.

The consequence to admit is that #66's third acceptance criterion — "the month's
list tells two Movements of the same Category apart" — holds only once somebody
names them. Three unnamed trips to the supermarket are still three rows that
differ in their figure alone. That is the price of the field being optional, it
is not hidden behind the criterion being read loosely, and remembering per
Category is the change that would collect it without asking anybody to type.

## Paying a Fixed item names its Movement

`paymentFor` builds a `MovementDraft` with nobody typing a character, and every
field on it is derived. It now derives one more: the item's own name. Marking
"Netflix" paid puts a Movement called Netflix on the month's list rather than one
called "Suscripciones" — which is the whole of #66's complaint, solved for the
one path where nobody could have typed an answer anyway. ADR-0042 is what makes
that possible: a Fixed item is always called something, so there is never a name
to invent.

## The keys pay for the field, and this overrules ADR-0037

ADR-0037 budgeted the entry screen at 643px against the 664 an iPhone 13 hands
the web, leaving 21px, and named what would give if more were ever needed:

> The keys stay 50px. They are what a thumb lands on while standing at a till
> with one hand on the phone, and 44px would have bought 24px — real, and the
> wrong 24px. The whitespace between blocks gave instead.

The shorter form of the same rule — "air is cheaper than aim" — is
`form.module.css`'s and ADR-0046's, not ADR-0037's. It is quoted here because it
is what the codebase says out loud, and attributed where it actually lives.

21px could not buy a seventh block. Measured, with a `Field` drawn the way every
other field in the app is drawn:

```
    document height          entry    correction    viewport
    before                     643          639         664
    field, labelled            701 ✗        713 ✗       664
    label hidden               679 ✗        691 ✗       664
    + keys 44, air 6           664          664         664
```

The last row reads 664 on both because the shell is `min-height: 100dvh`: once
the blocks fit, the document is floored at the viewport and stops being the
interesting number. What the blocks come to is read off `Guardar` instead —
`foldOf` returns its bottom edge — which lands at **643 on entry and 589 on
correction**. The correction screen ends higher than the entry one because it
carries no `Gasto / Ingreso` control: a correction cannot change which way the
money went.

So both halves of that sentence were tested rather than assumed. The air gave
first and gave what it had — `.form`'s gap from 8px to 6 — and it was not
enough on either screen. The label went next: the field carries a placeholder
that says what it is for and a real `<label>` that is off the screen and still
in the accessibility tree, so nothing is lost to anybody reading with a screen
reader and 22px is. Still not enough.

The keys gave the rest, 50px to 44. **44px is `--hit-target`** — the minimum this
repo applies to everything a finger lands on, applied in one place and measured
in a real browser. So the key is below the canvas's number and is not below the
product's own rule, and that distinction is the whole of what makes it payable.
ADR-0037 weighed 50 against 44 in the abstract and preferred air; this weighs the
same two against a field the product decided it wants, with the air already
spent.

What survives of ADR-0037 is the order, and it is worth more than the number: air
first, then anything that is drawn but not aimed at, then aim — and aim stops at
`--hit-target`, never below. A screen that ever needs an eighth block spends in
that order again.

`design/Main.dc.html` still draws a 50px key and is deliberately not edited to
match. A canvas quietly rewritten to agree with the code stops being able to tell
anybody the code moved; `entry.source.test.ts` now asserts the divergence rather
than the agreement, and says why.

## Where it is held

`e2e/movements.spec.ts` — "an expense is recorded on a phone without scrolling
down either" and its correction-screen sibling. They assert the fit rather than
the figures: the table above was measured by running them, and what they hold is
that the document never passes the viewport, which is what will catch an eighth
block. Nothing pins 643 or 589, deliberately — a screen is allowed to get
shorter.
`src/domain/movement/movement.test.ts` holds what a name may be;
`row.test.tsx` holds the two ways a row is titled and that two Movements of one
Category are told apart once they are named; `form.test.tsx` holds that the
field is there, empty, optional, and in the order the screen comes down in.
