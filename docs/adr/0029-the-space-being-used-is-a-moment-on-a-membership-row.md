# The Space being used is a moment on a membership row

#38 redraws the Space list the way the canvas draws it: a greeting instead of a heading, a card per Space instead of a row, and — for the first time — what each month has cost against what it was planned to. That last one is story 5 in #1, the only story on the whole list that no ticket ever carried.

Almost all of it is drawing. Two parts of it are not, and this is about those.

## "Activo" had nothing behind it

The canvas puts an `Activo` badge and an accent outline on one card, and the ticket calls it "the Space last opened". Nothing in the product knew that. `spaces` is a name and a currency; `space_members` is who joined when. There was no fact to draw.

It is a moment on the membership row — `space_members.last_opened_at` — and not a column on the Space and not a flag anywhere.

Not on the Space, because it is not a fact about the Space. Two Members share one pot and each of them comes back to it at their own moment; a column on `spaces` would have one of them telling the other where they had been, and the badge on Ana's screen would move because Gian opened something.

Not a flag, because a flag has to be unset somewhere else. "This one is active" and "that one is no longer active" are two writes that have to agree, and two writes that have to agree eventually will not — a half-finished switch leaves two Spaces claiming the badge or none claiming it. A timestamp has only ever to be written, and "which is it" is then a question with exactly one answer: `order by last_opened_at desc limit 1`, over rows that have one at all.

Rows that have never been opened are left out of that answer rather than sorted last. A Member who has joined a Space and never gone into it has no such moment, and `lastOpenedSpace` returns null rather than their oldest Space. A badge nothing supports is worse than no badge.

## Opening a Space is what writes it, and that makes the list stop prefetching

The write lives in `currentSpace`, which every route under `/espacios/[id]` already comes through. So a Space reached from a bookmark counts exactly as much as one reached from the list, and there is one place that decides what "opened" means.

That is a write during a render of a GET, which is worth being uncomfortable about. It is what makes the consequence below load-bearing rather than a nicety.

Next prefetches `<Link>`s, and a prefetch runs the page. Left alone, a person scrolling the Space list would have every Space on it fetched, every one of them marked opened, and the badge would land on whichever request happened to finish last. So the card's link sets `prefetch={false}`, and that line is the feature rather than thrift.

The guard is not the header Next sets on a prefetch. That header is internal to the framework and its own docs say it is stripped from the request in some contexts, so a guard written against it would fail silently in exactly the way that is hardest to notice — the badge would simply be wrong. What guards it instead is three end-to-end tests in a real browser: nothing marked before anything is opened, exactly one marked after, and the mark moving when a Member goes back to the other Space. That is the layer this bug lives in, so that is the layer it is caught in.

The write is awaited. A write let go of inside a server component is a write the request can outlive.

## The list reads every Space's month in two queries, not two per Space

Story 5 turns the landing screen into a screen that reads money. The obvious way to write it is to ask each card for its own month, which is seven queries per Space through the existing readers — a screen whose price goes up with how many Spaces a person has, on the one screen every session starts at.

So `movementsInMonthForSpaces` and `budgetItemsInMonthForSpaces` sit beside the single-Space readers and take an `IN`. `spacesToChooseFrom` costs six queries whether somebody has one Space or four, and both batches ride indexes that already existed for the Budget and the month's list.

They take whole Spaces and not identifiers, for the reason the single-Space readers do: every amount can only be read in the currency its own Space is denominated in (ADR-0001, ADR-0007), and a batch is precisely where a figure could end up written in a neighbour's money. Each row is turned into a domain object against the Space its own `space_id` names, and a row naming a Space that was not asked about is dropped rather than read against whichever Space is nearest.

Two rounds and not one. The batches cannot be asked until it is known which Spaces are really this Member's, because whose money is being totalled is the question `listSpacesForMember` answers — asking it first is what keeps a batch from being a way around it.

The arithmetic stays where it was. `spent` and `expected` are pure domain functions with their own tests, and both take the currency rather than reading it off the first row. That is what lets a Space nobody has planned a month for answer with a zero in its own money instead of a blank, which is an acceptance criterion of #38 and not a detail.

## The way into a card is a covering link named by the heading

The card is tappable end to end, the way the canvas draws it. There are two usual ways to write that and both are wrong here.

A link wrapping the whole card is announced as its entire contents — "Casa de Ana 2 miembros · COP Activo Gastado … Presupuesto …" — which is a paragraph where a name belongs.

A link on the name alone, stretched over the card by a `::after`, reads beautifully and measures 20px tall. `e2e/hit-targets.spec.ts` measures the box of every interactive element in a real browser, and a pseudo-element is invisible to it: the card would have passed the guard while being, as far as anything could check, a line of text.

So the link is an empty element covering the card, named by the heading through `aria-labelledby`. Its box is the card, so what a finger meets and what the browser measures are the same thing. Its name is "Casa de Ana". Everything else on the card stays ordinary text that a reader still meets on the way down it.

## The canvas draws a tab bar on this screen, and this screen does not

Every other pixel of `design/Espacios.dc.html` is copied. The bar at its foot is not: ADR-0027 settled that the four tabs belong to a Space, and this screen belongs to none — a "Presupuesto" tab here would have no money to be about. #38's acceptance criteria do not ask for it, and `e2e/shell.spec.ts` has asserted its absence since #5.

## What is a token and what is a literal

The canvas asks for two type sizes the scale does not have: 22px for the greeting and 16px for the figures. Both use the nearest existing step — `--text-2xl` (21px) and `--text-md` (15px) — rather than gaining a token each.

The scale exists so that screens stop answering "how big is this?" for themselves, which is the same argument ADR-0025 makes about width. What matters about those two numbers is not the pixel but the relationship: the greeting is the largest thing on the screen, and the figure is smaller than the Space's name above it. Both relationships survive the step, and neither survives a `--text-greeting` that names one use and can never be reused.

Three spacings the ticket names go the same way and for the same reason: the card's 15px of padding is `--space-8` (16px), the 22px between the two figures is `--space-9` (20px), and the create-slot's 14px corners are `--radius-lg` (13px). Each is within a step of what the canvas draws, and each would otherwise put a number in the global scale that nothing else in the app can want. The unnamed spacings around them — the greeting's padding, the divider's gap, the slot's inner gap — snap the same way.

The circles are 28px and 44px and the overlap is −9px, and those stay literals in `avatar.module.css` and `member-avatars.module.css`. A value used in one place is not a token, it is a value (ADR-0027 said the same of the tab bar's 3px). 44px is deliberately *not* `--hit-target`: the two happen to be equal and mean different things, and an avatar is not something a thumb aims at.

The dashed outline needed nothing new. `--color-border-dashed` was added by #34 for exactly this call to action and had been waiting for it.

## Consequences

The names of a Space's Members are no longer text on the card. They are the `aria-label` of each circle, which is what makes story 4 of #1 still answerable by somebody who is not reading the colours — and is why `Avatar` is a labelled image rather than a decorative letter. The Space-list specs that asserted "Nadia Junta · Omar Junta" as text now assert the circles, scoped past the greeting, which draws the reader once more at the top of the screen.

The `h1` is now the greeting. `e2e/shell.spec.ts` looked for "Espacios" at level 1 and looks for "Hola, Ana" instead. Where a session names nobody at all — which Auth.js allows, and which the e2e fixture is — the screen falls back to naming itself rather than greeting an empty name.

The greeting takes the name from the Member's own row and not from the session, for the reason the Fixed-item recap does (#13): a Movement is read under that row's name everywhere else, and greeting somebody by a stale Google profile would call them one thing here and another on every list.

`--column`'s guard measured the list's one `role="list"` slab. There are cards now, so `e2e/width.spec.ts` measures the first `article` — the thing that actually has a radius to be rounded against the glass.

The cards are `<li>`s of a labelled `<ul>` and not loose `<article>`s in a section. The `GroupedList` they replaced announced how many Spaces were in it for free; a column of cards does not, and being told "three Spaces" before reading any of them is worth the two elements.

## The greeting wears the accent, and that is ADR-0020 rather than an exception to it

The obvious thing to do with the greeting avatar is to give it the first Member seat, which is what the canvas draws. It is wrong, and only on this screen.

ADR-0020 decides which of two seats a Member holds *inside a Space*, by sorting the ids, so that "the blue one" names one person for both of them. The Space list draws the Reader twice: once at the top, and again inside every shared Space they are in. Which seat they hold in that Space depends on how the two ids happen to sort — so a Reader who sorts second would be blue in the greeting and pink on the card directly below it. One person, two colours, one screen: the exact confusion that ADR exists to prevent.

So the greeting wears `--color-accent`, which belongs to no seat and therefore can never collide with either. `readerColour` lives in `avatar.tsx` and not in `member-colour.ts`, because it is not a seat: that module answers "which of this Space's two Members is this", and keeping an exception beside it would have weakened the one guarantee it makes. A unit test on `Greeting` asserts the avatar carries neither seat's class, so the canvas's blue cannot be put back by accident.
