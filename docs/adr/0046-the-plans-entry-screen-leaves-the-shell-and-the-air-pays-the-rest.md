# The plan's entry screen leaves the shell, and the air pays the rest

#86 says `Guardar` has never been on the screen a month is planned on. It has
never been wrong, and it has never been fixed either — it was 249px over the
fold when #79 measured it, 335px over after #80 merged the two entry screens
into one, and every change since has recorded the number and handed it on.

Measured again on `dev` before anything here was written, at 390×664
(Playwright, `devices["iPhone 13"]`, ADR-0037 for why 664 and not 844):

```
    52px  account row                999px of document
    90px  Space heading              664px of viewport
    38px  "Nuevo gasto previsto"     ---------------------
   310px  keypad                     335px over
    66px  Cómo se llama              Guardar's bottom: 845
    67px  Categoría
    66px  ¿Vence un día del mes?
    44px  Guardar
    44px  Cancelar
    78px  tab bar
   ~144px gaps, padding and the shell's own
```

The issue named the tab bar as the first honest lever and said it was not
enough, and it was right about both — though not with the number it used. #86
and ADR-0044 both price the bar at 94px, weighed against a 249px overhang that
predates #80. Measured here, the bar itself is **78px**, and the overhang is
335. Either arithmetic reaches the same conclusion: the bar is not the fix, it
is the first quarter of one.

## The screen leaves the shell

It renders `AppShell` directly rather than going through `SpaceScreen`, which
is the one thing every other screen inside a Space does — except one. The
Movement entry screen made exactly this trade in ADR-0028, and #86's first open
question was whether the argument transfers: "whether planning a month is also
*one thing and nothing else* is a decision, not a deduction".

It transfers, and the deciding sentence is ADR-0028's own: *a bar offering
three other places is three ways to lose what they typed*. By the time somebody
is on this screen they have tapped an amount into a keypad and typed a name.
Those are the same two answers, held in the same unsaved place, and the same
bar is under the same thumb. What ADR-0028 protects is not the act of standing
at a till; it is the typed-but-unsaved state, and this screen has it.

ADR-0027 is not weakened by this any more than it was the first time. The
raised button in the middle of the bar exists so the way in is under a thumb on
every screen; what it leads to is a screen with nothing else on it. Since #81
there are two ways in, the bar's button and the row above the plan, and both
now lead to the same nothing-else.

So the account row goes, the Space heading goes, the tab bar goes, and
`Cancelar` moves from the foot of the page into the head — where a person who
changes their mind already is, rather than a scroll past the keypad.

Three blocks became one, and one of them was a duplicate nobody had noticed:
`SpaceScreen` rendered `<h1>` with the Space's name, and the page rendered an
`<h2>` reading "Nuevo gasto previsto" under it. The screen said what it was
twice, in two elements, at two sizes. It says it once now, and the head's
title is the `<h1>`.

## What is *not* on the head, and what that costs

ADR-0028 kept one line under the title: the pill saying which Space is being
spent from, because an expense is about to be attributed to somebody. There is
no counterpart here and none was added.

Planning has no attribution — `form.tsx` says so and #79 argued it: a plan is
about a month rather than a moment, and the money in a Space is one pot. The
honest candidate was the month being planned, which is the one thing about
this screen a person could be wrong about. It was not added, and the reason is
arithmetic rather than principle: a pill is 26px and the gap above it is 10,
and there are 9px left. Naming that here is the point of naming it — the next
person to reach for the month has to buy it from somewhere, not find it.

What is lost with the Space heading is which Space this is. That is a smaller
loss here than it was there: ADR-0028 only named the Space when there was
somebody else in it, and this screen never attributes anything to anybody.

## The air pays the rest

`.form`'s gap goes from `--space-9` to `--space-4` — 20px to 8px, four gaps,
48px. It is the identical line #60 wrote on the Movement entry form, and for
the identical reason: the alternative on the table was the 310px keypad, whose
keys are 50px because that is what a thumb lands on. Air is cheaper than aim.

#86's second open question — *what happens to the 310px keypad?* — is answered
by nothing happening to it. It stays whole, and this is what paid instead.

**#66 later took 24px out of it, and this screen got them for free
(ADR-0048).** `Keypad` is one component and `keypad.module.css` is one
stylesheet, so when the Movement entry screen ran out of air for a seventh
block and the keys went from 50px to 44, both plan entry screens went with
them. The sentence above about a thumb is no longer why the keys are the size
they are: 44px is `--hit-target`, the floor the whole product measures a touch
target against, and what changed is that the keypad now sits on that floor
instead of above it. Nothing here needed the room — this screen was already
inside the fold and is now further inside it — so this is recorded rather than
argued: it is the reason a change to the Movement screen moved two Budget
screens, and the reason one key height is still one number in one file. Two
sizes of the same key, one per screen, would have been the worse answer.

Its third — *does `/nuevo/fijo` get the same fix, and how do the two screens
avoid diverging?* — was answered before this change was written. #80 merged the
two entry screens into one, so `/nuevo/fijo` is a `permanentRedirect` and has
no fold to measure; two screens cannot diverge when there is one. That is why
this ADR measures one screen and why the sibling test #86 asks for has nothing
left to cover. The issue's author recorded the same thing in a comment on it.

```
    54px  head (Cancelar · Nuevo gasto previsto)    655px of content
   310px  keypad                                    664px of viewport
    66px  Cómo se llama                             ---------------------
    67px  Categoría                                  9px to spare
    66px  ¿Vence un día del mes?                    Guardar's bottom: 639
    44px  Guardar
    32px  four gaps of 8px
    16px  the shell's padding
```

9px is thinner than the 21px ADR-0037 called thin on purpose, and it is
defensible for a reason that screen cannot claim: **nothing on this one
varies.** There is no pill that appears in a shared Space. The Category picker
is one row however long the catalogue grows (ADR-0037). The day question is one
row in every state it has (ADR-0044). A Space of one with the shipped catalogue
and a Space of four with sixty Categories measure the same 655px. The 9px is
not slack absorbing a worst case — the worst case is the only case.

## Except it did vary, and the font was deciding

The first version of this change was written, measured at 655, and shipped to
CI, where the same screen came out **670** against the same 664. Three retries,
the same number: not a flake, a different machine.

The app names its type `-apple-system, BlinkMacSystemFont, "SF Pro Text",
system-ui, "Segoe UI", Roboto, sans-serif`. On the phone it is drawn for that
resolves to SF. On a Linux runner it falls through to whatever is installed, and
**nothing in the app said how tall a line of text is**, so the browser used the
font's own idea of `normal`. Measured on Linux WebKit against the same build:

| | SF | a Linux fallback |
| --- | --- | --- |
| `.label` (13px) | 16 | 18 |
| `.legend` (12px) | 15 | 17 |
| `.currency` (12px) | 15 | 17 |
| `.title` (17px) | 20 | 23 |

That is ADR-0037's finding on a different property. There it was four
paragraphs carrying `margin: 1em 0` — *space nobody chose, sized off each
element's own font*. Here it is every caption in the product carrying
`line-height: normal`, which is the same sentence: the height of a screen was a
function of which fonts the machine drawing it happened to have.

**`--line-caption: 1.25`** is what SF already renders at 12px, so nothing moves
on the phone the product is for; what changes is that it stops moving anywhere
else. It is applied to `.label`, `.legend` and `.currency`, and `.symbol` takes
the `1.1` the amount beside it already had, so `.figure`'s box stops being one
more thing the operating system decides.

**And the head's `<h1>` was carrying the browser's `0.67em` heading margin.**
ADR-0037 zeroed four paragraphs and did not look at headings. On SF that margin
box comes to 43px beside a 44px `Cancelar`, so it never bound and nobody could
see it; on a taller font it comes to 46 and the bar grew. The Movement entry
screen has had this since #37 — invisible there for the same reason, and fixed
here for both.

Measured after, on Linux WebKit: head 54, keypad 310.19, name 66.25, Category
67, day 66.25, `Guardar` 44 — **the same numbers as SF, to a quarter of a
pixel.** The 9px is real now. Before this it was 9px on one laptop.

The lesson is the one ADR-0037 already wrote down and this change had to learn
again: a number measured in one browser on one machine is evidence about that
machine. What makes it evidence about the screen is a rule in the stylesheet
that says the number is not the font's to choose.

## What the fit does not cover

A refusal. `state.error` renders a paragraph between the day question and
`Guardar`, and 9px does not hold it, so a person who is told why their entry
was refused has to scroll to reach `Guardar` again.

That is true of the Movement entry screen too, at 21px, and has been since #60;
neither screen's fold test measures it, because both measure the screen as
offered and as answered. It is named here rather than discovered later, and it
is a follow-up rather than this change's to fix — the shape of the fix is a
refusal that does not take a block of its own, which is a design question about
every form in the product and not about this screen.

## Two things reach beyond this screen

**The entry head is now `@/ui/entry-head`.** Two screens make the same trade
against the shell, so the head they make it with lives in one place rather than
two. It is held in `components.test.tsx` with the other primitives the shell is
made of, and not in a file of its own: `AppShell`, `Button`, `ChipField` and the
fields are all there, and this is one of them. It takes `back`, `cancel`, `title` and an optional `beneath` slot, and
picks no copy of its own — the way `ChipField` takes its legend. The part that
had to not be copied is the centring: the title is centred by an invisible copy
of the word `Cancelar` taking the room on the other side, because a fixed width
would have to be guessed and would be wrong in another language. A second copy
of that is a second chance to get it subtly wrong.

`movimientos/nuevo/head.tsx` keeps the "Compartido con" pill and became
`MovementEntryHead`, which composes the two. The pill's argument is that
screen's and not the head's, which is exactly why it stayed behind.

**`--line-caption` and the heading's margin reach every screen.** Three rules
in `field.module.css`, `chip-field.module.css` and `keypad.module.css` are the
label, legend and currency line of every form in the product, and the head's
`<h1>` is the Movement entry screen's too. On SF nothing moves — 1.25 is what
SF already draws, and the heading margin never bound. Everywhere else, every
screen in the app stops being as tall as the machine's fonts. Both fold tests
hold it, and they are the only two assertions in the suite that could have
caught this at all.

**`.form`'s gap lands on the screen that corrects an item**, because planning
and correcting are one form (#80). That screen keeps its tab bar and its Space
heading, and it measures **937px against 664** — `Guardar`'s bottom at 723, and
273px of document past the glass. Three of this change's four gaps reach it, so
36px of that is what it just gave back; it does not ask the day question, which
is why it is three and not four.

It was over before and it is less over now. Nobody should read this ADR and
believe every screen in the app now fits — it is a different route with a
different job, #86 names only `/presupuesto/nuevo`, and fixing it is not this
change. ADR-0037 owed the same sentence about the Movement correction screen
and paid it the same way.

## Where it is held

`e2e/budget.spec.ts`, in "a gasto previsto is planned on a phone without
scrolling down" — the sibling of the Movement screen's fold test, asserting the
fit twice, once as offered and once after the questions are answered, because
the second is the state `Guardar` is pressed in. `app-shell.module.css` is
`min-height: 100dvh` with no `overflow` rule (ADR-0025), so a seventh block on
this form grows the document past the viewport and the assertion fails.

Both fold tests now share one `foldOf` in `e2e/layout.ts`, which is where a
question about what something takes up on the glass belongs. It scrolls to the
top of the document before measuring, which neither test did before: a box is
measured against the viewport, answering a question can scroll the page, and a
`Guardar` that came up the screen by being scrolled to is not a `Guardar` that
fits. The Movement screen was never being measured after a scroll — its
document is its viewport, so there is nowhere to scroll to — which is why the
copy that lacked it went on passing.

The decision itself is held separately, in "planning a gasto previsto is one
thing, with nothing else offered" — the tab bar's absence, `Cancelar`'s href,
and the screen naming itself once. The fold test would fail if the bar came
back, but it would fail as a number, and the number is not the reason.

## ADR-0028 and ADR-0044 are amended, not overturned

ADR-0028 decided what an entry screen is, and everything it decided still
holds; what changed is that it is now two screens and the head is shared.

ADR-0044 closed on "neither screen has ever fitted a phone… that is #86, and it
is not this change's bug", and handed over a measurement table. This is the
change that owed it. The table's last row — `845–846` / `999–1000` — is the
number this replaces with `639` / `655`.
