# The URL names the Space, and nothing else does

A Member belongs to more than one Space, and every screen in contaro after the list is about exactly one of them: a Budget, a month's Movements, a Space's own Categories. Something has to say which. We considered a **current Space** held server-side — a cookie set when a row is tapped, read by `/` and `/movimientos` — which is what the first tab bar assumed, and which lets a person switch Space and stay on the tab they were reading.

We decided the Space is named in the **URL and nowhere else**. `/` redirects to `/espacios`, the list a Member lands on; from a row onwards every route is `/espacios/[id]/…` and carries the identifier. There is no current-Space cookie, session field or server state of any kind.

The reason is that "a Member sees only the Spaces they belong to" is the rule the whole product's privacy rests on, and a current Space is a second copy of the answer that can go stale — a Space deleted, a membership revoked, a cookie from another account — while the screen keeps rendering. With the identifier in the URL, every route re-asks `findSpaceForMember`, so membership is checked on the way into each screen rather than once on the way into the section, and there is no path that renders a Space without having just proved the reader is in it. A Space someone is not in is not found rather than forbidden, so knowing an identifier buys nothing.

It also means the address bar is honest: a screen can be bookmarked, opened in a second tab, and reasoned about from its URL alone. Switching Space is navigation, which is why it needs no sign-out.

## Consequences

Navigation lives inside a Space. `SpaceNavigation` builds every tab from the identifier it is given, so no destination can escape the Space it belongs to; the Space list and the creation screen carry no tab bar at all, because they belong to no Space and a "Presupuesto" tab there would have no money to be about. The way back to the list is a tab from inside a Space and an explicit `Cancelar` on the creation screen.

Every route inside `/espacios/[id]` calls `currentSpace(id)` rather than trusting a parent layout, which costs one lookup per screen and buys a membership check per screen. #6's Categories, #7's Movements and #10's Budgets all hang under the same identifier for the same reason.

Switching Space loses the tab a person was on: coming back from the list lands on the Budget rather than where they were. That is the price of holding no state, and it is small — the list is two taps away and the Budget is where a person wants to be anyway.
