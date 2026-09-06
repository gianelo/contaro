# The plan's way in sits above its two sections, and it is a row

#80 left the Budget screen with one way into the plan where it had two. It left it where it found it: a filled `ButtonLink`, under FIJOS and under VARIABLES, at the foot of the screen.

That position was never chosen. The button was the last thing added to a screen that had two lists on it, so it went after them, and nothing since has had a reason to look at it. The canvas has no opinion either — `design/Presupuesto.dc.html` draws the summary card, FIJOS, VARIABLES and the tab bar, and has never drawn an add affordance of any kind.

## The decision

One row, in a card of its own, between the summary card and FIJOS.

## Below is the one position that gets worse on its own

Today a Space has a handful of items and the foot of the screen is a short scroll away. The plan is what this product is for, so the plan is what grows: a real household's month is a Fixed item per subscription and a meter per Category, and every one of them pushes the way in further below the fold. It is the one control on the screen that somebody with a long plan needs most, and it is the one whose distance from a thumb is a function of how well the product is working.

A control whose reachability degrades as the feature succeeds is in the wrong place. That is not a new finding here; it is ADR-0027's, arrived at from the other end. Recording a Movement used to be a full-width link at the foot of the month's list, and #35 moved it onto the tab bar because "most of those seconds are spent walking to the control" — the link charged for the walk twice, being a scroll away on the one screen that had it and absent everywhere else. This is the same toll, arriving at the plan instead of at the ledger.

The two answers are not the same shape, and deliberately. A Movement is recorded from anywhere, dozens of times a month, so it belongs to the bar. A plan is written on the screen that is the plan, a handful of times a month, so it belongs on that screen — but above what it adds to, which is the only position on it whose distance from a thumb does not grow with the plan. The tab bar's `+` was considered again and left exactly alone: `src/ui/tab-bar.tsx` records that a person records an expense in under ten seconds only if the way in is under their thumb, and a menu there would tax the app's most frequent act to help one of its rarest.

## Above both sections, and inside neither

A Budget **is** its items, of either kind. `CONTEXT.md` says it, ADR-0019 says it — a Budget "comes into existence with the first one and nobody creates an empty one first" — and `page.tsx` had already said it in those words about the empty state.

So the way in belongs to the plan and not to a section of it. Nested inside the VARIABLES card it would read as "add a variable", which is exactly the ambiguity #63 exists to remove; inside FIJOS it would read as the *fijo* the form no longer asks anybody to name (ADR-0044). Above both, it is the door to the thing the two lists are two halves of.

Between the summary card and FIJOS rather than above the summary card, because the card is what the screen is opened for. "Gastado" against "Presupuestado" is the reading; adding to the plan is what somebody does about the reading, and a door in front of the figures would put the act before the question it answers.

## A row and not a button

The screen has been grouped lists from top to bottom since #63: FIJOS is one, VARIABLES is one, the Members row is one, and the empty state was one. A filled accent button pressed against the summary card would out-shout the two figures directly above it — the card is the subject of the screen, and the loudest thing on a screen is a claim about what it is for.

So the vocabulary is the screen's own: a `GroupedList` of one row, `labelHidden` for the reason `grouped-list.tsx` documents it — the screen's title already says Presupuesto, and printing the word again over a single row is a heading saying nothing. Hidden and not absent, so it stays a group a screen reader can name and skip to.

It is a link and never a button, which `GroupedListItem` already requires of any row that goes somewhere: it opens in a new tab and it works before any JavaScript has loaded. Nothing here needs saying that a URL cannot say, and the two end-to-end helpers that plan a month both reach it by `getByRole("link", …)`.

What is not the screen's ordinary vocabulary is the ink. The row is drawn in `--color-accent`, plus and words together, which is what the canvas draws and what `globals.css` has always said a link is coloured (ADR-0035) — `grouped-list.module.css` overrides that with `--color-text` because an ordinary row is a line of reading that happens to be tappable, and this row is not. That is said in `way-in.module.css` and not as a modifier on the shared component. One screen wanting an accent row is one screen; a modifier would be the list claiming a rule that every other list in the app would then carry an opinion about. The day a second screen wants it is the day it becomes the list's.

## The empty state moved into the same card

`budget.empty` — "Todavía no planeaste este mes." — used to be a `GroupedList` of its own, immediately above FIJOS. It landed there at ADR-0043, which took away the list it used to live in.

Two hidden groups both named "Presupuesto", one after the other, is one name a screen reader reads twice with nothing to tell them apart. So they are one card: the sentence first, the row under it. That is the sentence and the answer to it, which is what they were all along — and it is criterion #4 of #81 held in one place rather than in two that have to agree.

Nothing about the derivation moved. `nothingPlanned` is still `fixed.length === 0 && variables.length === 0` on the screen, still exact rather than approximate for the reason ADR-0043 gives, and it is now a prop rather than a branch at the call site.

## "Agregar al plan" names the destination

The row reads **Agregar al plan**, which is the canvas's own words for it, and it is a new key: `budget.plan.new`.

Naming the destination rather than the kind is what #80 made sayable. While there were two buttons, each had to say which kind it was for, and the survivor kept the noun — "Agregar un gasto previsto" — because it was the Variable one's words. On a row that belongs to neither section, naming one kind of item is the ambiguity #63 removed, said in copy instead of in layout.

ADR-0040 is untouched by this. *Gasto previsto* is still what a Budget item is called wherever a person reads one, still the noun `CONTEXT.md` defines, and it still survives on the title of the screen this row opens: "Nuevo gasto previsto". What changed is that the way in stopped having to say the noun at all, because there is only one way in for it to be about.

`budget.item.new` is deleted. It was read by exactly one line — the button this row replaces — and a key nothing reads is a string that will eventually be edited by somebody who thinks it is on the screen. `budget.item.new.title` is a different key, is what the form titles itself with, and stays.

## The canvas had never drawn it, and its own note disagreed with it

Criterion #3 of #81 is that `design/Presupuesto.dc.html` draws this control for the first time. It does now, copied from `design/MasIntacto.dc.html` — "Idea C · el + no se toca" — which is this artboard with the block already in place between the summary card and FIJOS.

`canvas.json`'s note for Idea C said the row goes **"DEBAJO de las dos listas"**, which contradicted the artboard it was annotating: `MasIntacto.dc.html` has drawn it above them since it was made. The artboard won, because it is the thing that was looked at and agreed with, and because the note's own next clause — the plan is the items of both kinds, so the door belongs to neither section — is an argument for being outside the two lists and says nothing about which end. The note now says above, and gives its reason in a clause: at the foot, the distance to a thumb grows with the plan. A clause and not the argument, which is this document's — ADR-0040 keeps those notes as the working material an open ticket is argued from, and a note that starts recording decisions is a second place they live.

The numbers are the canvas's vocabulary and not its pixels. The card's 18px of air below it is `--space-8`, the step below, which is the rounding `grouped-list.module.css` already does for its 3px gap and `variables.module.css` for its 11px row — and it is the same value the summary card holds itself off with, so the card sits equally far from the figures above and the FIJOS heading below.

## Consequences

`src/app/espacios/[id]/page.module.css` is deleted. Its only class was `.plan`, the flex column the button sat in, and the screen now has no styling of its own at all — every section on it draws itself.

The way in is a component of its own, `presupuesto/way-in.tsx`, beside the two sections it sits above rather than written into the page. It is where its tests can reach it: a screen that is four sections and a header has nothing left to test at the page level that the sections do not already hold.

Both pinned end-to-end counts held and neither moved. `hit-targets.spec.ts` still expects nine targets inside a Space: a row is the same one tap a button was, and what changed is a distance rather than a target. `link-decoration.spec.ts` still expects eight links on the Budget screen: the screen lost one `GroupedList` and gained one, and a group is not a link. The empty sentence is not a link in either place, and never was.

`budget.spec.ts` gained one test, and it asserts a distance rather than a coordinate: how far the card sits under the month's figures, read on a month with nothing planned and again on one planned with three Fixed items and two Variable ones. The two readings are the same, which is the criterion itself — the walk to this control is not a function of how much has been planned — and it is a stronger thing to hold than the order, which the same test keeps: the whole of the row ends above where the FIJOS group begins. A pixel written down there would be this suite's second opinion about how tall a row is, and it would fail on a badge growing while the thing it exists to catch — the row sliding back under the lists — went on passing.

`design/contaro-app.html` is left behind. The exported bundle embeds the artboards and the notes both, so it now holds a `Presupuesto.dc.html` with no "Agregar al plan" row and a `canvas.json` whose note still sends the row **below** the two lists — the two things this change edited in the source.

It was already behind before this. Its copy of `Presupuesto.dc.html` is the pre-#63 artboard: the Category rows carry neither the chevron nor the tray that opens under them, and its canvas still lists a `Presupuesto63Plegado.dc.html` the design folder no longer has. So the drift recorded here is the second one on the same file, not the first.

Regenerating it is its own piece of work. Nothing in the repo builds it — 2.6MB of generated bundle with no script behind it — and hand-editing an export is not regenerating it, it is a third copy of the copy. ADR-0040 is the rule this leaves unmet, in its own words: a source and its export disagreeing about the copy is worse than either being wrong on its own.
