# The screen says the weight, and the icon says the shape

#43 reports that `Icon` cannot be drawn at the weight the canvas draws it. `Icon` fixes stroke width at 2, with two exceptions written into the module (`backspace` at 1.8, `check` at 2.6) — exactly what #34 asked for, and not what the canvas does. The canvas compensates optically: the smaller an icon comes out, the heavier its line, so a 13px glyph does not fade beside the text it sits in.

| Icon | Size | Weight |
|---|---|---|
| `chevron-down` | 13 | 2.5 |
| `alert-triangle` | 13 | 2.2 |
| `plus` | 18 | 2.2 |
| `plus` | 26 | 2.4 |

The same `plus` twice, at two weights. Nothing in the icon can tell them apart.

## The decision

`Icon` takes an optional `weight`. The screen doing the drawing says it.

Precedence, written down once in the module: **what the call site asks for beats an icon's own exception, which beats the common weight.**

## Why not derive it from the size

Deriving it is the tempting answer, and it is the wrong one for two reasons.

The first is that four samples are not a curve. Two of the four sit at 13px and disagree — `chevron-down` is 2.5 and `alert-triangle` is 2.2 — so no function of size alone reproduces the table this ADR opens with. Any curve fitted to it would be fitted to the wrong variable.

The second is that a curve would have to argue with the per-icon exceptions, and nothing would say which wins. `check` is 2.6 *at every size* because of what it draws: two strokes and nothing else, lighter than the row of text it marks. A size rule that says 13px means 2.5 and an icon rule that says `check` means 2.6 meet at a `check` drawn at 13px with no answer between them. The precedence above is that answer, and it is only writable because the weight is asked for rather than inferred.

The two rules are about different things and that is why they can be ordered rather than merged. The per-icon exception is a fact about the drawing — it travels with the icon to every screen. The weight is a fact about the screen — how small this one made it, and how loud it needs to be against the text beside it. The screen that shrank the icon is the one that knows.

## Consequences

The number is repeated at each call site that wants it. That is the cost, and it is bounded: an icon left alone still draws itself, so only a screen that departs from the common weight says anything at all. When this was written that was the over-plan alert in the Variables section, whose 13px triangle asks for 2.2, and #35's raised button, whose `plus` asks for 2.4 at 26px. Since then the month pill has joined them with a 13px `chevron-down` at 2.5, and ADR-0043 added two more: the `chevron-right` that says a Category's row opens, at 16, and the one on each row of the tray it opens, at 15 — both at 2.5, which is what the canvas draws them at (`design/Presupuesto63Plegado.dc.html`).

Those two are worth noting for what they say about the table above. It records 2.5 only against a 13px `chevron-down`, and the obvious reading of that row is optical compensation — small means heavy. The canvas draws the same 2.5 at 15 and at 16, so whatever governs a chevron's weight, it is not this one's size. Four samples were not a curve when this ADR was written and six are not one now; the weight stays a fact the screen states rather than one anything infers.

`Drawing.strokeWidth` keeps its meaning unchanged: only where the common weight reads wrong for the shape itself. Nothing about `backspace` or `check` moves.
