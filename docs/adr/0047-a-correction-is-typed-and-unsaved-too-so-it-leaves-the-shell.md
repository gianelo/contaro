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
