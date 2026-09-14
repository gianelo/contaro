# A correction is typed and unsaved too, so it leaves the shell

#73 says the screen that corrects a Movement has never fitted a phone. ADR-0037
said the same thing about it two changes ago and handed the number on: 972px of
document against 664px of viewport, 308px over, with `Guardar los cambios`
ending at 750.

Measured again on `dev` before anything here was written, at 390×664
(Playwright, `devices["iPhone 13"]`, ADR-0037 for why 664 and not 844), in a
two-Member Space with the shipped catalogue:

```
    52px  account row                               972px of document
    90px  Space heading                             664px of viewport
    70px  "Corregir el movimiento"  (38 + 32)       ---------------------
    72px  "Anotado por …"           (44 + 28)       308px over
   481px  form                                      Guardar's bottom: 750
    68px  Borrar el movimiento      (44 + 24)
    60px  Cancelar at the foot      (44 + 16)
    78px  tab bar
    16px  the shell's padding
```

Two of those numbers are nobody's decision. The `<h2>` carries the browser's
`0.67em` heading margin — 32px, the identical bug ADR-0046 found on the entry
head and fixed there without looking here. The `Notice` under it is a `<p>` and
carries 28px more. 60px of the overhang is space no one chose, sized off
whichever font the machine happened to draw it with.

## The tab bar is not optional, and the arithmetic is what says so

#73 named three ways this could give and asked for them to be grilled rather
than picked. Two of them do not survive being measured.

**The Space heading goes and the bar stays** leaves 882. Take the `<h2>`, the
`Notice`'s margin, the `Cancelar` at the foot and the account row as well —
every cut on the table short of the bar — and it is still **700 against 664**.
There is no arrangement of this screen that fits with 78px of tab bar on it.
The bar is not a lever here; it is the thing in the way.

**`Guardar` goes sticky and the screen scrolls** was declined on the entry
screen in #60, and it is worse here than it was there. `app-shell.module.css`
is `min-height: 100dvh` with no `overflow` rule, and ADR-0025 says why: an
overflow rule makes the shell a scroll container and the tab bar's
`position: sticky` stops sticking. So the option is not "the screen scrolls" but
"two stacked fixed bars", 122px of a 664px viewport spent on chrome so that the
content behind it can be taller.

That leaves one, and it is the one that had to be argued rather than measured.

## What ADR-0028 protects is the unsaved state, and this screen has it

ADR-0028 §Consequences says, in its first line, that this screen *keeps* its tab
bar and its Space heading. That sentence is reversed here.

It is worth being exact about what is being reversed, because it is less than it
looks. ADR-0028 was scoped to `/movimientos/nuevo` — #37 asked for the entry
screen — and the sentence is a statement of what was left alone, not an argument
for leaving it alone. The argument that would have to be overturned is the other
one, in §"The screen leaves the shell": *a person recording an expense is doing
one thing, and a bar offering three other places is three ways to lose what they
typed.*

ADR-0046 already read that sentence again, for the plan's entry screen, and
found what it is actually about: **not the act of standing at a till, but the
typed-but-unsaved state.** That reading is what decides this screen, and it
decides it more plainly than it decided that one. This screen does not merely
hold the same kind of unsaved state — it holds it *in the same component*. It is
`MovementForm`, the same keypad, the same picker, the same `Guardar` under the
same thumb. A person who has tapped a figure in to fix a typo has exactly as
much to lose to a stray tab as a person who has tapped one in at a till.

#73 anticipated the objection and put it well: a correction "is not made
standing at a till". True, and it is an argument about *urgency*, which is not
what ADR-0028 turns on. What it turns on is what is in the form and not yet in
the database, and urgency does not change that.

So the account row goes, the Space heading goes, the tab bar goes, and
`Cancelar` moves from the foot of the page into the head — where a person who
changes their mind already is, rather than a scroll past the keypad. It is the
same trade ADR-0046 made, made by the third screen to make it, wearing the head
that was put in `@/ui/entry-head` so it would not have to be written again.

## Who typed it in moves into the head, and stops being a block

`Anotado por …` was a `Notice`: a filled box, 44px tall, sitting between the
title and the form. It is now the pill under the title, where the entry screen
says which Space is being spent from.

That is not a saving dressed up as a decision — it is the same thing said in the
place the head already keeps for exactly this. ADR-0028's argument for the entry
screen's pill was that *what somebody about to spend needs from that heading is
which Space they are spending from*. The counterpart here is who typed this in,
and it is the half of story 22 in #1 that a screen owes: `recordedBy` is never
editable, which is enforced by there being no field for it, and the pill is what
makes it a record somebody can read. It stays a `note` to a screen reader,
because that is what it is.

The pill's shape is now `EntryPill` in `@/ui/entry-head`, for the reason the
head itself moved there: two screens wear it, and a second copy of a shape is a
second chance to get it subtly wrong. What it says, which icon says it, and
whether it is drawn at all stay with each screen — those are three different
arguments and none of them belongs to the head.

## What it comes to

```
    90px  head (Cancelar · Corregir el movimiento · Anotado por …)
   481px  form                                      639px of content
    44px  Borrar el movimiento                      664px of viewport
     8px  its separation                            ---------------------
    16px  the shell's padding                        25px to spare
                                                    Guardar's bottom: 571
```

That is the worst screen a shipped Space can produce, and after this change it
is the only screen: two Members, the nine headings the catalogue ships with,
and a Member named at length. It measures the same as a Space of one with a
short name, because every block on it is now a fixed height — which is the
condition ADR-0046 set for trusting a thin margin at all, and the thing this
change had to go and earn twice (see below).

The entry screen's 21px is untouched: nothing here reaches `MovementForm`, which
is the budget ADR-0037 set and the one thing a change on this screen could
break silently. What did change is that 21px is now a measurement of that
screen rather than of a short name — it measured 643 with `Ana Gasta` and 657
with a long one, and it measures 643 with either now.

The 8px is the last thing this screen had left to sell, and it is the one number
here bought rather than found. `Borrar el movimiento` had 24px holding it off
`Guardar`; 24px leaves 9px under the fold and 8px leaves 25. **9px would fit**,
and it is exactly what ADR-0046 shipped — where CI then measured 670 against
664, three retries running, because a Linux runner draws the same screen in a
taller font. That is the evidence this number is bought with: 9px is a
measurement of one laptop, and this screen is one the product cannot afford to
be wrong about twice.

What the trade costs is a destructive control one gap from the button beside
it, and it is affordable here for a reason it would not be everywhere: striking
a Movement out asks first (#1), so a thumb that lands wrong loses a bottom sheet
and never an expense.

## The name was the last thing that varied, and it varied by a line

The first version of this change measured 639 and was tested with a Member
called `Gian Tecleó`. Written against `Maximiliano Bartolomé de la Concepción`,
the same screen came out **669**.

The pill wrapped onto a second line. A second line is 30px, and nothing this
screen had left held it.

This is ADR-0046's rule arriving on a third property. There it was the height of
a caption being the font's to choose; before that, four paragraphs carrying
margins sized off their own text. Here it is the height of a head being decided
by how long somebody's name is — and it is worse than either, because it is not
a difference between machines that CI would eventually catch. It is a difference
between *Members*, and it would have shipped green and failed for one household.

So the name is what is cut, and not the fit. `.words` is one line, always:
`overflow: hidden`, `text-overflow: ellipsis`, `white-space: nowrap`, on a span
that exists so `text-overflow` has an element to act on at all — it has nothing
to act on in a flex container, which is why `EntryPill` wraps its children.
ADR-0036 says an amount is never cut to fit and the line is; a name is not an
amount, and `head.module.css` has cut the Space's own name this way since #40
for the same reason.

No ceiling is written for the pill and none is wanted: a cross-axis-centred flex
item is already clamped by the room the head leaves it, and ADR-0041 makes
`--measure` the app's one answer to how wide anything is.

**This was already true of the entry screen.** `Compartido con Maximiliano
Bartolomé de la Concepción` wraps the same pill, and 21px never covered 30px
either. Its fold test seeded `Ana Gasta` and passed. Both fold tests now seed a
name long enough to wrap, which is what makes 639 and 643 measurements of the
screens rather than measurements of one Member's name.

## Two things reach beyond this screen, and one is deliberately left

**`EntryPill` is one line everywhere**, which is the entry screen's fix as much
as this one's, as above.

**So is the name on the line above the picker.** `Hoy · <Member>` measured 40px
and 54px, and which one depended on how long somebody's name was. It lives in
`when.tsx`, which both entry screens draw, and it was the last block on either
of them whose height was a person rather than the screen. The name is already a
span of its own, so it is the name that is cut and the day, the dot and both
icons stay whole.

That one was not in the plan and it is not a tidy-up. Without it the worst case
here is 653 and the entry screen's is 657 — both under 664 on this laptop, and
both a wrap away from not being, on a machine whose fonts are wider. ADR-0046
already paid for that lesson once: a number measured in one browser on one
machine is evidence about that machine. A block that changes height by 14px
depending on a Member's name is that same bug with a Member in place of a font,
and neither fold test would have caught it, because both of them get to choose
the name.

One finding **is** deliberately left alone:

- **`Notice` is a `<p>` and carries 28px of margin nobody chose** — ADR-0037's
  finding on a fourth property, and the 28px in the table at the top of this
  ADR. It stopped mattering here the moment the recorder became a pill: this
  screen draws no `Notice` outside the strike sheet, which is `position: fixed`
  and has no fold. What remains is the Space-creation form (which declares
  `gap: var(--space-9)` and was getting 20 + 28), the gallery, and that sheet —
  none of them on the fold path this change is about, and re-spacing three
  screens under cover of a fourth is a diff nobody reviewed. That is #99, with
  its own measurement.

## What the fit does not cover

A refusal, the same one ADR-0046 named and for the same reason. `state.error`
renders a paragraph between the picker and `Guardar`, and 25px does not hold it,
so a person told why their correction was refused has to scroll to reach
`Guardar` again. Both fold tests measure the screen as offered and as answered,
which is the state `Guardar` is actually pressed in; neither measures the state
after it has been pressed and refused.

That is now true of three screens and is a design question about every form in
the product — the shape of the fix is a refusal that does not take a block of its
own. It is named here rather than discovered later, and it is a follow-up rather
than this change's to fix.

## Where it is held

`e2e/movements.spec.ts`, in "a Movement is corrected on a phone without scrolling
down either" — the sibling of the entry screen's fold test and the budget's,
sharing the same `foldOf` in `e2e/layout.ts`, and asserting the fit twice: once
as offered and once after the Category is answered, because the second is the
state `Guardar los cambios` is pressed in. `app-shell.module.css` is
`min-height: 100dvh` with no `overflow` rule (ADR-0025), so a block added to this
screen grows the document past the viewport and the assertion fails.

The decision itself is held separately, in "correcting a Movement is one thing
too, with nothing else offered" — the sibling of the entry screen's own
decision test: the tab bar's absence, `Cancelar`'s href, and the screen naming
itself once, as an `<h1>` with no `<h2>` under it. The fold test would fail if
the bar came back, but it would fail as a number, and the number is not the
reason. "The recorder is on the correction screen, and is not a field" did not
have to change: it still finds a `note`, and still finds no field, wherever the
recorder is drawn. `EntryPill`
is held in `components.test.tsx` with the other primitives the shell is made of
— that its role is the screen's to give, and that its words are an element so
the line can be the thing that gives.

## ADR-0028 is amended and ADR-0037 is paid

ADR-0028 decided what an entry screen is, and everything it decided still holds;
what changed is the count. It is now three screens, they share one head, and the
line in its §Consequences saying this one keeps the bar is no longer true.

ADR-0037 closed on "nobody should read this ADR and believe every screen in the
app now fits", and handed over `972 / 664 / 750`. This is the change that owed
it. Those numbers are `639` / `664` / `571`.

## Amended by #65: the account row this ADR sent away now has a name, and the exception still holds

#65 gave the account row this ADR removed a shape and a name: the header,
identity plus a bell plus a hamburger, drawn for the first time in
`design/`. It replaces the row everywhere the row was implicit, and this
screen is not one of those places — it is the screen that argued the row
should leave, and the argument still stands. Neither this screen nor the two
`nota-correcciones` already named as its undocumented siblings —
`CorregirElGastoPrevisto.dc.html` and `CorregirElGastoFijo.dc.html`, both
#105's to redraw — gets the header. What is typed and not yet saved has
nothing to gain from a menu offering three other places to go, whether that
menu is a tab bar or a hamburger wearing one.

ADR-0059 records where the header does land: `Presupuesto.dc.html`,
`Movimientos.dc.html` and `Presupuesto63Desplegado.dc.html`, at the 52px this
ADR measured the account row at, above. The number this ADR made famous —
what the account row cost — turned out to be worth keeping.

## Amended by #105: the same reading, extended to a plan item

#105 is the two `nota-correcciones` the previous amendment already named as
this screen's undocumented siblings: `/presupuesto/{id}/{itemId}`, where a
Variable item and a Fixed one are each corrected on the form #80 made one out
of two. Neither had ever fitted a phone either, and the issue that opened #105
measured 913px and 987px against 664. Those numbers still reproduce exactly
today, unchanged, on the same `dev` this ADR was written against: a Space of
one with a short name — the issue's own seed — measures 913 for the Variable
form and 987 for the Fixed one, to the pixel. Nothing regressed to get there:
of the three commits to touch this route between the issue and this change,
#65 changed no file under `src/` (its header is a `design/` artboard, not yet
wired to a route — ADR-0059), #64 *shortened* `SpaceHead`'s currency line
rather than lengthening anything, and #99 zeroed a `Notice` margin neither of
these forms draws.

What grew the number this ADR measures below — 951px for the Variable form
and 1025px for the Fixed one — is the seed, not the code. Both fold tests
below are written the way this ADR's own already is, against the worst Space
a shipped one can produce (two Members, both named at length, per
ADR-0046/ADR-0047's own rule), and `SpaceScreen` — which every branch of this
route still rendered before this change — puts the *Space's own name* in
`SpaceHead`'s `<h1>`, above the form's own title: a duplicate heading nobody
had noticed either, the identical bug ADR-0046 found and fixed on the plan's
entry screen, still present here because this route never went through that
fix. "Casa de Fina Justa" fits `SpaceHead` in one line, 90px; "Casa compartida
de Gian", the name these fold tests use, wraps it to two, 128px — 38px more,
which is exactly 951 − 913 and 1025 − 987. Both sets of numbers are correct,
of two different Spaces: the issue measured the shipped floor and this
measures the shipped ceiling, and the ceiling is the one a fold test has to
hold to. It stops mattering the moment this change lands — `SpaceHead` is one
of the things `AppShell` replaces below, so no Space's name is drawn on this
route at all afterwards, at any length.

The argument is the one this ADR already made, read once more rather than
re-argued. `BudgetItemForm` and `FixedItemForm` hold an amount on a keypad and
a name in a field before `Guardar` is ever reachable — the identical
typed-but-unsaved shape this ADR found on `MovementForm`, and for the same
kind of reason ADR-0046 already gave this exact form once: planning and
correcting are one form (#80), so the plan's entry screen and both of these
corrections have held this state all along. A bar offering three other places
is three ways to lose it, whether the bar is a tab bar or, since #65, a
hamburger wearing one. So both forms take the identical trade this ADR made
for `MovementForm`: `AppShell` directly, `EntryHead` for Cancelar and the
title, and the closed-month and paid-item refusals that already lived beside
the forms take the same head rather than a second answer, because the route
is one and the branch inside it is the item's kind and not the screen's
shape.

**Unlike the Movement correction screen, `beneath` is left empty.** There is
no counterpart here to carry: this form asks for no attribution (`form.tsx`
says why, and ADR-0046 already declined the same slot for the plan's entry
screen for the same reason — a plan is about a month and not a moment). So
this screen's head is 54px in every Space there could ever be, matching the
plan's entry screen's own head exactly rather than the 90px the Movement
correction screen's pill costs.

**CI refused the margin this ADR trusted, and it was right to.** The first
version of this change gave up margin until the Fixed form's `Guardar` sat at
600 with nothing under it — 0px of spare, thinner than this ADR's own 25px
and thinner than ADR-0046's 9px, trusted on the strength of ADR-0046's own
finding that these shared blocks measure the same on Linux WebKit and SF "to
a quarter of a pixel." CI measured the Fixed form's fold test at document 721
against 664 — 57px over, three retries, the same number each time — with
`Guardar` itself still inside the fold (around 657) and `Sacar del plan` the
block still hanging past it. Whatever CI's font stack actually draws this
particular row of controls at, it disagreed with the local measurement by far
more than a quarter of a pixel, and 0px of spare left no room to be wrong by
any of it. The Variable form's fold test passed on the same run — it had
about 71px of real slack once `document`'s own floor is looked past, which is
exactly why it survived a gap the Fixed form's zero did not.

What that CI failure settles is not a number, which is gone, but which lesson
of ADR-0046's to keep: not "a margin can be trusted once its blocks are
proven font-stable" — the blocks were, and it still failed — but the older
and plainer one, that a margin measured on one machine is evidence about that
machine, full stop, and this ADR spent a paragraph arguing itself out of
believing that about a margin of exactly zero.

**Option C+ gives the screen real room back, rather than asking a smaller and
smaller margin to hold.** Two changes:

1. `fixed-form.tsx`'s name field and its due-day picker now share one row
   (`fixed-form.module.css`, a stylesheet of this screen's own) instead of
   stacking. Both controls keep the 44px they always stood at; laying them
   out sideways instead of on top of each other gives back a whole row's
   height and the gap around it, which the day question no longer needs a row
   of its own to ask. The label that row carries is shortened from "Qué día
   del mes vence" to "Vence el día" (`budget.fixed.dueDay`, used nowhere else
   in the product, so the value changes rather than a second key standing
   beside it for the same question) — the long form does not fit a column
   narrow enough to leave the name room to grow, and a wrapped label would
   have grown the row past the 44px both fields are built on.
2. `Sacar del plan` leaves the form body entirely and moves into
   `EntryHead`'s trailing slot — the room an invisible copy of Cancelar used
   to hold for no reason but centring the title. It is a 44×44 icon button
   now, a stroke-drawn trash can (`Icon`'s new `trash`) rather than a filled
   pill, because there was no longer room beside Cancelar to spell the words
   out. Its accessible name still is those words: `aria-label` carries
   `budget.item.remove` exactly as the button's own text used to, and it is
   still a real submission through `removeBudgetItemAction`, unreimplemented.
   Only the two branches that actually offer a form get it —
   `BudgetItemCorrectionHead` (`presupuesto/[itemId]/head.tsx`) is what wires
   the button to the head, and the closed-month and paid-Fixed-item branches
   below it call `EntryHead` directly, with nothing passed for `trailing`,
   because #119 and ADR-0034 already refuse both acts on those branches. A
   destructive control on a screen built to refuse everything else would be
   the one thing worse than the fold it replaced.

`EntryHead`'s new `trailing` prop is additive and optional: the three screens
that never pass it — `presupuesto/nuevo`, `movimientos/nuevo` and
`movimientos/[movementId]` — get the mirror exactly as before, unchanged in
every test that already covered them.

**Together the two changes gave back enough that `form.module.css` and
`remove.module.css` did not need to give up anything at all.** `.form`'s
`gap` is `var(--space-4)` again, the value it shared with the plan's entry
screen before this ADR ever touched it — a shared file this issue never
named, which the Spec review was right to flag as reach. `remove.module.css`
is deleted outright: `RemoveBudgetItem` moved into
`BudgetItemCorrectionHead`, which is the only place left that needs a form to
remove an item from. Nothing outside `/presupuesto/{id}/{itemId}` carries a
line of this change any more except `EntryHead` and `Icon`, and both of those
are extended rather than altered.

**What it comes to**, measured on the same worst Space as before, offered and
answered alike (the two no longer differ, because nothing about the Category
picker's height changed):

```
                          Variable form        Fixed form
   document (floored)         664px               664px
   Guardar's bottom            541                 541
```

Both forms land at the identical `Guardar` position now. That is the merged
row doing exactly what it is for: the Fixed form's fourth question no longer
costs it a row the Variable form does not have, so the two forms are the same
shape as far as the fold can tell, where the version CI failed measured them
71px apart — 600 for the Fixed form, 529 for the Variable one. 123px of real
room sits under `Guardar` on both now — the shell's own 16px of padding and
nothing else, `Sacar del plan` no longer among it — against 0px on the Fixed
form before this amendment and CI's 721 before that.

**The paid Fixed item's screen was never the problem, and still is not.**
Marking an item paid puts this same route on its other branch — the refusal
that replaces the form once a Movement exists to strike out first (ADR-0034)
— and it measured 664 before either version of this change, with
`Ver el movimiento` ending at 388 first and 192 now. Nothing about Option C+
touches it: it calls `EntryHead` directly, carries no `trailing`, and its
document height and control position are unchanged from the shell-removal
that shipped first. `CorregirElGastoFijoPagado.dc.html` needed no redraw of
its own this time — it was already redrawn once, for the reason the previous
amendment gave, and Option C+ changes nothing this branch renders. It still
carries no trash icon, the one thing that has to stay true of it for #119 and
ADR-0034 to mean anything on this screen.

**#137 is where the removal control eventually goes.** "Removing a Movement
and removing a plan item both live only on the screen that corrects them"
commissions a proper removal flow for both kinds, with several shapes on the
table. The head's icon is the bridge until that ships and not the answer:
it fits a phone today, out of a slot that was otherwise doing nothing.

## Where it is held

`e2e/budget.spec.ts`: "a gasto previsto is corrected on a phone without
scrolling down either" and "a gasto fijo is corrected on a phone without
scrolling down either, paid or not" — siblings of this ADR's own fold test,
sharing the same `foldOf`, seeded the same worst-Space way (two Members, both
named at length) even though neither name is drawn on this particular screen:
the point is that the test should catch a pill or a heading that ever put one
back rather than assume today's absence holds. "A closed month offers no way
to take the item off the plan either" is the counterpart of the paid branch's
own coverage ("a Member corrects the rent, and cannot while it is paid"),
seeded through a new `closeMonth` helper in `e2e/session.ts` (the same kind of
direct write `joinSpace` already is) — it asserts the trailing icon's absence
the same way the paid branch's test does, `toHaveCount(0)` on
`{ name: "Sacar del plan" }`, because the one thing worse than the fold this
change fixed is a destructive control on a screen that refuses everything
else. The decision itself — no tab bar, `Cancelar` in the head, the screen
naming itself once — is "correcting a gasto previsto is one thing too, with
nothing else offered," the third screen now making this argument after
`MovementForm` and the plan's entry screen.
