# The app opens where a Member was last, and an Invitation still stops it

Issue #108.

`src/app/page.tsx` was ten lines and one of them was `redirect("/espacios")`. It read no session and asked no question, so it could not branch on anything. For a Member with one Space that meant a full screen, a heading, and a tap to read a card whose only job was to be the only option — on every opening of an app that is opened from a Home Screen. Signing in returns to `/` as well, so that one file decided the landing for arriving and for signing in both.

## The rule is not the count the ticket opened with

The obvious rule is "one Space → its Budget; more than one → the list". It is worth having and it is not the best rule available, because the product already knows something better than *how many* and has known it since #38.

`space_members.last_opened_at` is written by `markSpaceOpened` from inside `currentSpace`, which every route under `/espacios/[id]` comes through, and read by `lastOpenedSpace`. Its index's own comment names this exact question — *which of mine did I open last?* — and until now the whole of that fact was spent tinting a card the person was about to leave.

So the rule is:

> **the Space last opened; failing that, the only one there is; failing that, the list.**

A person with three Spaces who lives in one of them is thrown at the list by the count rule every single time, and they are the Member with the most to gain from not being. The count survives as the tie-breaker for somebody who has never opened anything — which is exactly the case `lastOpenedSpace` answers null for rather than guessing, because ADR-0029 decided a badge nothing supports is worse than no badge, and a landing nothing supports is worse still.

`whereToLand` in `src/app/landing.ts` is that rule and nothing else: three facts in, a destination out, pure and unit-tested. The page reads; the decision is somewhere a test can reach without a database.

## The Invitation is the reason this was not a one-line change

`/espacios` is the only screen in the product that shows a pending Invitation, and the justification written on that screen is that it is *where everyone lands*. This change makes that sentence false for precisely the person most likely to be invited: somebody with one Space, invited to their second, would sign in, be dropped into their own Budget, and never see the seat. There is no badge on a tab and no other surface — `invitationsWaitingFor` is called from that one file.

So the landing yields. `/` asks the third question, and a waiting Invitation sends a Member to the list whatever else is true of them.

**The yield is provisional, and this is the paragraph that says so.** #133 is the bell hanging off #65's header, where a waiting Invitation becomes visible from every screen in the product rather than from wherever somebody happens to land. Once it ships, seeing the seat no longer depends on where a redirect sent anybody, and this yield can be reconsidered or dropped. Until then it is the only surface an Invitation has outside `/espacios`, so it stays — and it stays as a stated debt rather than as a rule somebody later has to reverse-engineer.

## A moment that outlived its membership lands nobody

`lastOpenedSpace` can name a Space a Member has since left: the membership row goes and the moment written on it goes with it, but nothing says the *answer* cannot already be in flight. `listing.ts` guards the badge by comparing the id against the Spaces really on the list, and the landing compares it the same way.

The alternative — redirect and let `currentSpace` 404 — is the one that must not be taken. A stale badge marks nothing; a stale redirect is a broken landing on the route a person opens the app with, and they would have no way to tell it from the product being gone.

## Three reads, and not the six the list costs

`/` opens `listSpacesForMember` and `lastOpenedSpace` — the two reads `spacesToChooseFrom` already begins with — and `invitationsWaitingFor`, the same call `/espacios` makes. No new schema and no new query.

`spacesToChooseFrom` itself is deliberately **not** called. It goes on to read every Space's month in two more batches so that each card can carry what it has cost against what it was planned to, and this route draws no cards. Reading the money for a screen that is never rendered would be six queries to answer a question that needs three.

## ADR-0010 keeps its substance and loses one sentence

ADR-0010 states `/` → `/espacios` inside its decision text, and that sentence is now false. Its amendment says so.

Everything the ADR is actually *about* survives intact. There is still no current-Space cookie, no session field, no server-side current Space. The URL still names the Space and nothing else does. Every route inside `/espacios/[id]` still calls `currentSpace` and re-proves membership on arrival, so the redirect buys a destination and not an exemption — a landing into a Space a Member is not in is refused exactly as a typed URL would be.

What this spends is state that already exists. ADR-0029 crossed ADR-0010's line deliberately and said why: a moment on a *membership* row is not a current-Space pointer, because it belongs to the Member and not to the Space, and it is only ever written. Reading it to choose a destination adds nothing to that. ADR-0010's own Consequences already argued this change's case before it was made — ADR-0010 says "the list is two taps away and the Budget is where a person wants to be anyway."

## Consequences

**`/` stops being a way to reach the list.** Redirecting into a Space marks it opened, so the landing reinforces itself: today's answer is tomorrow's. For most Members the Espacios tab inside a Space becomes the only way back to the list, and that tab is the one thing that makes this reversible from inside the product.

**The specs that go through `/` say what they mean now.** `e2e/shell.spec.ts` asserted the list at `/` and still passes, because its fixture Member has no Spaces at all — but its comment claimed entering *means* landing on the list, which was the whole rule and is now one branch of three. The comment is corrected rather than the test.

**`e2e/landing.spec.ts` is new and every case in it goes through `/`.** That is the point: `e2e/invitations.spec.ts` navigates to `/espacios` directly and would not have caught the hole above, which is exactly the warning the ticket read off it. One Space lands in it; several unopened land on the list; one lived in lands back in it; a waiting Invitation holds the list; a left Space lands on the list and not on a 404.

**`leaveSpace` joins `joinSpace` in `e2e/session.ts`.** The product has no way to leave a Space, so the raw delete is the only way to reach the state the last of those tests is about. The state is real even though the path to it is not yet.
