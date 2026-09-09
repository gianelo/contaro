# The account row becomes the header, and three screens still carry none of it

#65 named a row nothing on the canvas ever drew: `AppShell` renders identity
and a green, unconfirmed `Salir` above every screen inside a Space, one
thumb-width from the title, while `Ajustes` already sits in the tab bar as
where that control belongs. It is two jobs wearing one row, and the fix this
change makes is not deleting the row — it is redesigning it as the header of
the product and drawing that header where it belongs, which turns out to be
fewer places than "every screen" and a different shape than "a row".

## What the header holds, and why three things and not two

Identity, a bell, a hamburger. Identity is the row's first job kept: who is
signed in. The bell is #133 — pending invitations, an unclosed month, unpaid
Fixed items — reflecting ADR-0053's own row rather than replacing it, and its
behaviour is that ticket's, not this one's. The hamburger opens the Space
menu, drawn here as `SheetMenuEspacio.dc.html`: `Ajustes` and, once #115 ships
it, the multi-month balance screen. #115 was explicit that this is a
hamburger's job and not a fifth tab — ADR-0027 already closed the tab bar at
four, for the same reason a Member list never asked to be the fifth.

`Salir` is answered by the same sheet, and that is the whole of what changed
about it: it was a button in accent green beside the title, and it is now a
row inside a menu a thumb has to open on purpose first. Two deliberate taps
where there was one accidental one is the confirmation the old row never had,
without adding a sheet whose entire purpose is asking "are you sure" — the
same trade ADR-0047 made for a struck Movement, folded into the menu instead
of standing beside it.

## Which screens carry it, measured against what each one already is

**Get it: `Presupuesto.dc.html`, `Movimientos.dc.html`,
`Presupuesto63Desplegado.dc.html`.** These are the ordinary screens a Member
lands on inside a Space — a title, a month pill, a tab bar — and none of them
held typed-but-unsaved state. The header sits above the title on all three,
identity left and the bell and hamburger right, and it costs each of them
52px: exactly the height ADR-0047 measured for the account row it replaces.
That number is not invented for this change. `AppShell` has rendered that row
on every one of these screens since before the canvas existed; the artboards
simply never drew it. This change does not add weight the shipped product did
not already carry — it draws, for the first time, the weight that was already
there, and gives it a shape worth carrying.

**Gets something else: `Espacios.dc.html`.** The Spaces list is not inside a
Space, so there is no Space menu to open from it — no `Ajustes` for a Space
not yet chosen, no balance screen for one either. But `espacios/page.tsx`
renders `AppShell` with no `navigation` prop at all (ADR-0027: the four tabs
are a Space's and the list is not inside one), which means the account row's
`Salir` is, today, the *only* reachable sign-out on that screen — there is no
tab bar underneath it to fall back to `Ajustes`. Giving this screen the full
header would duplicate the identity the greeting already draws — "Hola,
Gian", with an avatar — for no reason beyond consistency with screens that
have a Space to hang a menu off of. So it keeps the greeting exactly as
drawn, and the greeting's row gains one thing: a quiet, grey `Salir` at its
trailing edge, sized as an ordinary 44px target and coloured `#8E8E93` rather
than the accent green the old row wore. Identity is not repeated — it is
answered once, by the avatar and the name already there — and sign-out stays
reachable from the one screen that would otherwise lose it.

**Gets none of it, and stays that way on purpose:**

- **`Main.dc.html`, `CargarGastoOscuro.dc.html`** — the Movement entry
  screen, ADR-0028. It never carried an account row or a Space heading to
  begin with; #60 fit it to a phone on that emptiness and this change reaches
  nothing there.
- **`CorregirElGastoPrevisto.dc.html`, `CorregirElGastoFijo.dc.html`,
  `CorregirElGastoFijoPagado.dc.html`** — the three screens `nota-correcciones`
  already named as a gap: they are calcated from the shipped app and still
  draw the old account row, because "staying inside the shell was never a
  written decision — it's a gap." That gap is #105's, not this change's:
  #105 already lists redrawing the first two without the shell, extending
  ADR-0047's own reasoning to a plan item. Drawing the new header onto a
  screen a sibling ticket is about to pull out of the shell entirely would be
  a header this design deletes again in the next commit — narrated in the
  section below, appended to ADR-0047 itself.
- **`CrearEspacio.dc.html`** — its own `Cancelar` / `Crear` head, the same
  shape an entry screen wears, and for the same reason: a Space's name and
  currency are typed and not yet saved, and creating a Space is the path to
  one, not a screen inside one.
- **`AgregarUnFormulario.dc.html`, `MasHoja.dc.html`, `MasIntacto.dc.html`** —
  the three explored ideas for where the plan's "+" belongs. `nota-mas`
  describes "today" as two links at the Budget screen's foot; `Presupuesto.dc.html`
  has drawn one merged "Agregar al plan" row above `FIJOS` since
  before this change touched it, which is idea C, already adopted. These
  three document a question that is no longer open, not a screen anybody
  lands on, and drawing new chrome onto a settled exploration is upkeep on a
  file nobody will look at again.
- **`ArrastreDeficit.dc.html`** — a state fragment, not a screen: 560px tall,
  no tab bar, sitting beside `SheetArrastre.dc.html` to show what the déficit
  card looks like. It was cropped short of full-screen chrome by whoever drew
  it first, and this change does not go back and finish a crop that was never
  meant to be a screen.
- **Every sheet** — `SheetPagar`, `SheetCopiar`, `SheetArrastre`,
  `SheetCerrar`, and the new `SheetMenuEspacio` — carries no tab bar today and
  gets no header either. A sheet rises over whichever screen opened it; that
  screen's header is still on it, dimmed, in the backdrop.

## Checked against #60

#60 asked whether the entry screen still fits after #65, because its
acceptance criteria said to check. It does, at no cost: `Main.dc.html` and
`CargarGastoOscuro.dc.html` are named above as screens that never carried the
account row and do not carry the header either. The 52px this change spends
on `Presupuesto.dc.html`, `Movimientos.dc.html` and
`Presupuesto63Desplegado.dc.html` is money already being spent by the running
app on those routes; the entry screen is the one route that was never asked
to spend it, and this change does not ask it to start.

## CONTEXT.md is not amended

Nothing here names a domain term. The header, the bell, the hamburger and the
Space menu are navigation chrome — the same standing as the tab bar and
`Notice`, neither of which has an entry either. `Space` already avoids
"Account" as a synonym for itself; this change does not touch that line, and
does not add "Header" or "Menu" beside it, for the same reason ADR-0058 left
`CONTEXT.md` alone: a UI primitive getting a shape is not a domain concept
getting a definition.

## Where it is held

`scripts/design-bundle.test.ts`, in "the header (#65), drawn on the screens
that carry it and nowhere else": it names every artboard the header applies
to and every one it does not, matched against the header's hamburger icon
path so the two lists cannot drift from what is actually drawn, and it names
every artboard the manifest lists so a nineteenth screen with an unnamed
opinion cannot be added silently. It also pins the Space menu sheet's three
rows — `Ajustes`, `Balance de varios meses`, `Cerrar sesión` — by their
Spanish text, the same way the rest of this canvas's copy is checked.

Nothing here is measured against a viewport the way ADR-0047's screens are:
these three screens were never on a fold path this change moves, and adding
an e2e assertion for a header that does not exist in code yet would be a test
written for a screen nobody can load. That measurement is #133's and #115's
to add, once the bell and the Space menu are more than an artboard.

## ADR-0047 is amended

See the section appended to it below: the account row it sent away now has a
name, and the exception it drew still holds.
