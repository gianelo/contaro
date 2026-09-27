# A row reveals removal and keeps a visible way in

Status: accepted design direction for #137, not shipped behavior.

The maintainer accepted B4 after reviewing six context-specific 390px artboards: Movements ([before](../../design/RetirarDeslizarMovimientos.dc.html), [revealed](../../design/RetirarDeslizarMovimientosRevelado.dc.html)), Budget Fixed ([before](../../design/RetirarDeslizarFijos.dc.html), [revealed](../../design/RetirarDeslizarFijosRevelado.dc.html)), and expanded Budget Variable ([before](../../design/RetirarDeslizarVariables.dc.html), [revealed](../../design/RetirarDeslizarVariablesRevelado.dc.html)). Swipe **left** only reveals the row's removal action; it never destroys by full swipe. An always-visible, bare 44×44 `⋯` on each eligible row provides the touch and non-touch route without knowing the gesture. These drawings were committed in `b84b39c`.

## Why this direction

A put removal on the correction screen: a clear existing route, but an extra trip from the list. B used only visible per-row overflow: discoverable, but hid the direct list gesture. C introduced multi-select: useful for bulk, but an additional mode and destructive selection cost for a per-row task. B4 instead keeps the list as the point of action and the visible overflow as its alternative; it does **not** add bulk mode. These are different flows, not styling variants.

A Movement still requires confirmation before being struck out, recording who did it (ADR-0015). Removing a plan item keeps today's unconfirmed semantics; neither act gains an invented undo. A paid Fixed row keeps its amount and `Pagado`, has no `⋯`, and opens the paid-item screen; only that screen links to its payment Movement (ADR-0034). Closed months offer no removal controls. The correction-screen trash button remains a bridge until the new path works (ADR-0047).

## Before implementation

The coachmark drawn only on Movement *before* illustrates discovery, not a global first-visit or persistence policy; Budget-first discovery is unresolved. A real pending Fixed row must retain its pay control **and** amount alongside the new `⋯` at 390×664, rather than trading payment away for removal. Test physical iOS Safari touch behavior (#107), keyboard and screen-reader operation, and confirmation paths before shipping. Neither CSS versus pointer-events mechanics nor coachmark policy is selected here. This ADR authorizes no runtime change.
