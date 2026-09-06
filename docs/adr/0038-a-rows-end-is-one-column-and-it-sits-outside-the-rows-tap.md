# A row's end is one column, and it sits outside the row's tap

`design/Presupuesto.dc.html` draws a Fijos row as two things: the name with its
line beneath on the left, taking the width it needs, and on the right a column —
the amount over its badge, flush right.

The app drew three things on one line. `fixed.tsx` put the amount in
`GroupedListItem`'s `trailing` and the badge in its `beside`, and those two
slots are not siblings: `trailing` renders inside the row's link and `beside`
renders next to it. So the amount and the badge landed side by side with the
name column squeezed between the leading edge and both of them, and
"Alquiler · 1 sep" wrapped onto a second line.

That is #59, and it is a regression from #48. Before #48 both halves sat in
`trailing` inside a `.end` wrapper — `flex-direction: column; align-items:
flex-end` — and the whole row was a button that opened the pay sheet. #48 gave
the row a second thing to do: it became a link to the item, and the pay tap
moved to `beside`, which exists precisely because a button inside a link is not
a control a keyboard or a screen reader can reach. The badge went. The stacking
did not go with it.

## The decision

**A row's right-hand end is one column, and the whole of it sits outside the
row's own tap.**

`beside` is that column. It is not "a second thing to do to the line" any more;
it is the end of the row, laid out in `@/ui`:

```css
.beside {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
  gap: var(--space-1);
  flex-shrink: 0;
  padding-right: var(--space-7);
}
```

`--space-1` is 2px and the canvas draws 3px between the two halves. The scale
has no 3px step in it, so this is the step below rather than the canvas's own
number — ADR-0025 reads the numbers off the canvas, and a value off the scale
to match one would be the first of those.

Both halves come out of the link, and not only the half that has to be
reachable. A column does not straddle the link: the amount is inside it and the
badge is beside it, and there is no arrangement of those two boxes that stacks
them. So the amount leaves the row's tap and joins the badge. It loses nothing
by leaving — an amount is not a control, and the row it belonged to is still
opened by every other pixel of the line.

`trailing` stays, unchanged, for the row whose end really is one thing on one
line. `.end` — the wrapper that used to do this inside `trailing` — does not
come back. #48 deleted it along with the stacking (`eb550fa`), and the column
is now said once, in the component that draws rows, because the next list with
two things to do to one row will ask the same question.

## The tap is the column, because a finger is bigger than a badge

The badge is 17px tall. A touch target is 44px: `--hit-target` in `tokens.css`,
applied in `hit-target.module.css` and nowhere else, which
`hit-target.source.test.ts` keeps true and `e2e/hit-targets.spec.ts` measures in
a real browser.

Those two numbers do not both fit around the badge. Measured on an iPhone 13
with an ARS Space: the row is 60px, the amount's box ends 30px above the row's
bottom edge, and a 44px target centred on the badge under it reaches 11.5px up
into the amount and 1.5px down into the next row. There is nowhere for 44px to
go that is not already something else.

So the control is not the badge with room found around it. **The whole end
column is the control**, and it clears 44px by being what is drawn:

```tsx
<GroupedListItem
  beside={<><span>{amount}</span><Badge …/></>}
  besideAction={{ label: "Marcar Arriendo como pagado", onClick: … }}
/>
```

`GroupedListItem` says this rather than the Budget screen. A caller that had to
be the column itself would have to redraw the column, which is the stylesheet
this ADR exists to avoid. Given the pair, the component wears its own `.beside`
layout on a `<button>` instead of a `<span>`, adds `hitTarget`, and takes the
label — one object, so a label cannot arrive without a handler.

The label names what tapping does and not what the column says: a screen reader
hears "Marcar Arriendo como pagado" while eyes read the amount and the state it
is in. A paid row gets no `besideAction` at all — there is nothing left to pay,
and a tap that opened a sheet only to refuse is a tap that exists to say no.

**This makes the amount tappable, and #59 asked that it not be.** The ticket
wrote that constraint before anything was measured, and measured it cannot hold
at the same time as the 44px rule. Between the two, the touch size wins: it is
enforced by a test on every screen, and what it costs here is bounded — the tap
opens a confirmation naming what will be created, so a thumb that lands on the
amount is one "Cancelar" from where it meant to be. What the row must never do
is hide the seam, and it does not: the column is one visible shape, it dims
under a finger, and a keyboard's focus ring is drawn around all of it.

## What was ruled out

**A 44px target tucked over the badge, taking no room in the line.** An
absolutely positioned button, `inset: 0` with auto margins, keeps a real 44px
box and leaves the drawing untouched — the column's 2px gap and the row's 60px
both survive. It was built and measured, and it makes the amount tappable
too: 11.5 of its 18px, silently, with no shape to say where the tap begins. The
column being the control has the same reach and admits it.

**Leaving the amount inside the link and stacking it against the badge.** There
is no way to do it. `trailing` is inside the link, `beside` is beside it, and
CSS does not lay out across that boundary. Absolute positioning could fake it,
and would have to be re-faked for every width, currency and badge the product
grows.

**Growing the column so 44px fits under the amount without touching it.** The
one option that honours #59's constraint literally. It costs the drawing on
every row, forever: the column needs 18 + 44px plus its gap, so the row goes
from 60px to about 65, the badge floats some 13px under the amount instead of
2, and paid rows have to carry the same reserve or the list reads ragged. A
permanent change to every Fijos row to protect a mistap that a confirmation
sheet already catches.

## Where it is held

- `fixed.test.tsx` says the shape: the amount and the badge are one block, the
  whole block is outside the link, in both states, the pay tap holds both
  halves and wears a touch's worth of room, and a paid row has no tap at all.
- `e2e/budget.spec.ts` says the geometry, which is a question only a browser can
  answer: the badge begins below the amount ends, the two share a right edge,
  the line under the name is a single line box, and the tap measures at least a
  finger in both directions while covering both halves and staying inside the
  gutter. It fails on the pre-#59 code at the first of those.
- The finger it is measured against is read off the app's own `--hit-target`
  (`hitTargetOf` in `e2e/layout.ts`), for the reason ADR-0025 gave the gutter one
  name: a `44` in a spec file is a third place for the value to live, and it
  would keep passing while the app moved.
