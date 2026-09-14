# The header is a banner the shell stacks, and the menu is one control

ADR-0059 decided the header: what it holds, which screens carry it, and which
screens deliberately carry none of it. It decided all of that on the canvas,
and #65 said so out loud -- "scope of this issue is the artboard." So the
running app kept drawing the row the canvas had just replaced: a name and a
green, unconfirmed `Salir`, above every screen inside a Space and on the list
above them.

This is that decision in code. It re-argues nothing ADR-0059 settled. What it
records is the handful of questions a canvas cannot answer -- where the seam
between the server and the sheet goes, what the shell's slot is called now,
what the menu is about for a Member who has never opened a Space -- and the
two rows the canvas drew that this change deliberately does not ship.

## The seam: one control, and the server half above it

The hamburger and the sheet are one component (`src/app/space-menu.tsx`),
because they are one control. Handed out separately, every screen that drew a
hamburger would be holding the open state of a menu it does not otherwise care
about -- on four screens, in two shapes, with the sheet's `open` prop being the
kind of state that is wrong in exactly one place and never noticed.

It is a client component, so the session cannot be read inside it. `AppHeader`
(`src/app/header.tsx`) is the server half: it reads `auth()`, decides whether
there is anybody to name, and hands the menu a name and a Space. That split is
not new here -- `SpaceHead` was pulled out of `SpaceScreen` for the same
reason, so that a test wanting the heading did not have to stand up a session.
The difference is which half is testable: the behaviour worth pinning is the
menu's (a shut door, a Space it is about, a way out that costs a second tap),
and the menu takes plain props, so `src/app/space-menu.test.tsx` drives all of
it with no session, no database and no route.

Sign-out is handed in rather than reached for: `signOutAction`
(`src/app/sign-out.ts`) is a module of its own because the inline
`"use server"` the old row used only works inside a server component, and the
row that replaces it is behind a sheet.

### A click, and no longer a form

The old row posted a `<form>`. A form buys two things -- it works before any
JavaScript has loaded, and it cannot fire twice while the first one is in the
air -- and the first of those is already spent: this row sits inside a sheet
that needs JavaScript to open at all. The second is bought back in the
component, by refusing a second call while one is in flight (`useTransition`).
A form whose no-JS path is unreachable is a form kept for the shape of it.

## The slot is called `header`, and it survives on what it does

`AppShell`'s slot was `account`, and the row it held is the pair ADR-0059 broke
up. It is now `header`, and only one caller passes it -- `SpaceScreen`.

One caller is a fair question about whether a slot should exist. It survives
because what it does is not "render a thing a screen gave it": it stacks that
thing **above the content and outside it**. Inside `main`, the header would
scroll away with what it heads, and it would be inset twice -- once by
`.content`'s gutter and once by its own. The slot is the shell saying where the
top of a screen is, which is the same standing `navigation` has, and neither of
those is the caller's to decide.

### Which screens the seam actually reaches

ADR-0059 names three screens: the Budget screen, the month's list, the expanded
Budget. The seam reaches more than three, and on purpose: the header goes
through `SpaceScreen`, which is every screen inside a Space -- `categorias`,
`ajustes` and `miembros` included.

That is inherited and not new scope. `SpaceScreen` has rendered the account row
on all of them since before the canvas existed, which is the same sentence
ADR-0059 uses about the three it names, and for the same reason: the artboards
draw the screens a Member lands on, not every route. Giving the header to the
three and withholding it from their siblings would mean `SpaceScreen` deciding,
per tab, whether a screen has a top -- and the screens in question are the same
shape as the three, with a title, a tab bar, and no typed-but-unsaved state.
The exempt screens are exempt because they leave `SpaceScreen` altogether, and
that is how ADR-0047 and #105 already drew the line.

## What the menu is about where there is no Space

The Space menu's navigational rows are Space-scoped -- ADR-0059 is explicit
that `Ajustes` and the multi-month balance belong to a Space -- and the Spaces
list is the one shell screen not inside one. ADR-0059 answered that with the
last-opened Space, the one the `Activo` badge on a card already points at. In
code that costs no new read: `spacesToChooseFrom` has already folded
`lastOpenedSpace` into every card as `lastOpened`, so the screen picks the
Space off the list it is already rendering.

`ReadableSpace` gains one field for it, `currency`. The currency is already
inside `who` ("Compartido con Ana · COP"), but a sentence about who else is in
a Space is not the answer to which Space this menu is about, and the menu says
that the way the canvas draws it: "Casa · COP".

**And where there is no last-opened Space at all**, which is a Member who has
never opened one: the menu offers none of the rows that are a Space's, and
still offers the way out. That is not a graceful degradation, it is the same
argument ADR-0059 used to put the hamburger on this screen in the first place
-- it is the one shell screen with no tab bar under it to reach `Ajustes` from,
so it cannot be the screen where signing out is out of reach either. A Member
with no Spaces has a session, and a session has to be leavable.

## Two rows the canvas draws that this does not ship

ADR-0059 draws three things in the header and three rows in the sheet. Two of
them belong to tickets that have not shipped, and a control that renders and
answers nothing teaches a Member that this one is broken:

- **The bell is #133's.** ADR-0059 says its behaviour is that ticket's. The
  header leaves it the place it goes -- between the name and the hamburger --
  and draws nothing there yet.
- **`Balance de varios meses` is #115's.** The screen does not exist, so the
  row would be a chevron pointing at nothing. The sheet ships `Ajustes` and
  `Cerrar sesión`; the middle row lands with the screen it opens.

Both are additive, and both land in a place this change has already shaped,
which is the whole reason the header went first.

One element is drawn and dropped rather than deferred: **the sheet's own
avatar.** The canvas titles the menu with a 36px circle beside the name.
`BottomSheet` titles itself with a string, and a `leading` slot on a shared
primitive -- used by five sheets, four of which want nothing in it -- is a prop
added for one caller. The sheet keeps the name it is titled with; the circle
stays on the header that opened it, one row above.

## `Salir` became `Cerrar sesión`, and that is the whole of it

Two strings for one act, and the second is the one that survives. The old row
sat beside a title where one word had to fit; a row inside a menu has the width
to say which session is being closed rather than which door is being left. The
keys moved with the words: `account.signOut` and `account.label` are both gone,
and the menu's copy lives under `space.menu.*`. "Tu sesión" survives as
`space.menu.session`, doing a narrower job -- it named the account row's own
region, and it is now what the sheet titles itself with where there is nobody
to title it with. The group the way out sits in is named for that row instead,
off the screen: a group heading repeating the dialog's own name is a heading a
reader hears twice and learns nothing from either time.

## Creating a Space lost a row it was never drawn with

`espacios/nuevo/page.tsx` rendered `AppShell account={<Account />}`, and
`CrearEspacio.dc.html` has never drawn it. ADR-0059 names that screen as one
that carries none of the header, for the reason it carries no tab bar: a
Space's name and currency are typed and not yet saved, and a screen holding
that trades the shell for room. The account row was drift, not a decision, and
it goes with the rest of it. Nothing else about that screen is touched --
its `Cancelar` still stands at the foot where the code puts it rather than in
the head the canvas draws, which is a separate gap and #138's to catch.

## Two icons, and why `menu` is not `list`

`menu` (`M4 7h16M4 12h16M4 17h16`) and `leave` are new entries in
`src/ui/icon.tsx`, taken from the paths the canvas already draws. `menu` is
close enough to `list` to look like a duplicate and is not: `list` cuts its
third stroke short, because a list is items of unequal length, and a menu's
three strokes are one length because they stand for nothing -- they are the
button. Two icons rather than one, so neither is drawn at the other's meaning.

## Where it is held

- `src/app/space-menu.test.tsx` -- the menu's behaviour, at the component
  seam: shut until pressed, the Space it is about, sign-out costing a second
  tap, the no-Space case still answering the way out, and the two titles -- the
  name a person is called by, and the session where there is no name.
- `src/app/espacios/greeting.test.tsx` -- the greeting holds what is set beside
  it, and is the same row with nothing there.
- `src/ui/components.test.tsx` -- the shell's slot, by its new name.
- `src/ui/icon.test.tsx` -- `menu` drawn as three strokes of one length, and
  both new names in the manifest that pins the set.
- `e2e/shell.spec.ts` -- the header on a Space screen and the menu it opens;
  the Spaces list carrying the hamburger with no banner around it; `Salir` gone
  from all three screens that carried it; `espacios/nuevo` carrying neither.
- `e2e/sign-in.spec.ts` -- signing out, two deliberate taps in, still landing
  on `/ingresar`.

Nothing here is measured against a viewport. The header costs the three screens
that carry it exactly what the account row it replaces already cost them, which
is why ADR-0059 could spend it without re-measuring anything: it is not new
weight, it is the weight the shipped app was already carrying. The fold paths
ADR-0047 measures are on screens that carry none of this.
