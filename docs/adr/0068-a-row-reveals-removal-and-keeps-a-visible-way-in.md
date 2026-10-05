# A row reveals removal and keeps a visible way in

Status: accepted design direction for #137, not shipped behavior.

The maintainer accepted B4 after reviewing six context-specific 390px artboards: Movements ([before](../../design/RetirarDeslizarMovimientos.dc.html), [revealed](../../design/RetirarDeslizarMovimientosRevelado.dc.html)), Budget Fixed ([before](../../design/RetirarDeslizarFijos.dc.html), [revealed](../../design/RetirarDeslizarFijosRevelado.dc.html)), and expanded Budget Variable ([before](../../design/RetirarDeslizarVariables.dc.html), [revealed](../../design/RetirarDeslizarVariablesRevelado.dc.html)). Swipe **left** only reveals the row's removal action; it never destroys by full swipe. An always-visible, bare 44×44 `⋯` on each eligible row provides the touch and non-touch route without knowing the gesture. These drawings were committed in `b84b39c`.

## Why this direction

A put removal on the correction screen: a clear existing route, but an extra trip from the list. B used only visible per-row overflow: discoverable, but hid the direct list gesture. C introduced multi-select: useful for bulk, but an additional mode and destructive selection cost for a per-row task. B4 instead keeps the list as the point of action and the visible overflow as its alternative; it does **not** add bulk mode. These are different flows, not styling variants.

A Movement still requires confirmation before being struck out, recording who did it (ADR-0015). Removing a plan item keeps today's unconfirmed semantics; neither act gains an invented undo. A paid Fixed row keeps its amount and `Pagado`, has no `⋯`, and opens the paid-item screen; only that screen links to its payment Movement (ADR-0034). Closed months offer no removal controls. The correction-screen trash button remains a bridge until the new path works (ADR-0047).

## Original B4 implementation constraints

The original Movement-only coachmark left Budget-first discovery unresolved; the accepted iteration below supplies the first-encounter design, but does not establish production persistence. A real pending Fixed row must retain its pay control **and** amount alongside the new `⋯` at 390×664, rather than trading payment away for removal. Test physical iOS Safari touch behavior (#107), keyboard and screen-reader operation, and confirmation paths before shipping. Neither CSS versus pointer-events mechanics nor coachmark policy is selected here. This ADR authorizes no runtime change.

## Accepted design iteration — 2026-10-04

The maintainer visually approved the revised interactive prototype and its menus after review. This accepts the design, not production implementation, physical Safari behavior or assistive-technology proof.

The first refinement put the destructive action below the name and reserved taller rows. The maintainer rejected it: the intended interaction moves the row left and reveals a button on its **right**, with animation and no height change. That rejected layout is not an accepted policy.

The revised [interactive prototype](../../design/removal-review.prototype.html) uses simulated data only. Tapping a Movement row opens editing directly; `⋯` is a secondary route that opens a sheet with Edit, Strike and Cancel. Pending Fixed and Variable sheets instead offer Edit, Remove from plan and Cancel. A full left swipe only reveals; it never executes removal. The foreground retreats and compacts from its trailing edge, keeping the name visible instead of sliding a short name completely off-screen; the sheet identifies the complete item.

The maintainer confirmed that removing “Mercado semanal” removes **only that planned expense**, leaving sibling items and every real Movement intact. It changes planned money, not spent money. No category-wide deletion, undo or bulk mode is introduced.

First encounter is demonstrated by a small leftward movement and return of the first eligible visible row, whichever list is visited first. The preview never exposes an executable destructive action, stops when interaction begins and does not run under reduced-motion preferences; a static hint and visible `⋯` remain. This prototype remembers the demonstration only in memory during the current visit. Cross-session/member persistence remains an implementation decision, not proof supplied by this demo.

Paid Fixed rows remain without removal or `⋯`. The accepted explanatory-sheet design is reached by tapping the paid row: it names the payment restriction and offers **View payment Movement**, not Delete. The payment view has a separate explicit strike confirmation. Striking it makes the Fixed item pending but leaves it in the plan; removing that now-pending item is a second deliberate action. This visually accepted shortcut does not authorize the plan to rewrite the ledger or auto-remove the item. The existing paid-item route remains the runtime policy under ADR-0034.

Three menu artboards, the Movement confirmation, paid-Fixed explanation and payment confirmation are registered alongside the six before/revealed screens. Canvas sources are static drawings; the standalone prototype demonstrates gestures, sheets and simulated state changes. Physical iOS Safari, real screen-reader behavior and production gesture/scroll mechanics remain unverified, and the correction-screen bridge remains until separate runtime work is proven.
