# Announce the Monthly close on the first Space route

## Objective
Fix issue #153: when the Creator first enters a Space after a month has ended, show the once-only Monthly close sheet on that route, including Movements and full-screen entry/correction routes.

## Problem and why
Every in-Space route calls `openSpace` (directly or via `currentSpace`) and replaces the Member's `last_opened_at`, but only the Budget root uses the previous value to announce the close. Entering elsewhere consumes the first-opening signal without showing the sheet. ADR-0053 calls the first load an announcement; the standing Budget row alone is not a substitute.

## Scope and decisions
- The user chose the first route visited, not a deferred Budget-only announcement, and explicitly approved coverage of every in-Space route, including full-screen entry/edit routes.
- Keep `last_opened_at` as the per-Member active-Space history; do not add a second opening write or a persistent-layout read that loses the prior value.
- The automatic sheet belongs to the Creator only. The Budget's standing row and the invited Member's status remain unchanged.
- #154's independent read-only waiting-month query, #155's unpaid Fixed-item query, and #133's bell runtime remain outside this fix.
- Preserve the Matt Pocock skills, `CONTEXT.md` vocabulary, and existing ADRs; amend ADR-0053 only if its recorded behavior must change.

## Tasks
- [x] CLOSE-1 — Observe RED at the cross-route boundary (Creator enters Movements after month end, then Budget), then carry the prior opening through shared Space-screen routes and render the automatic sheet on the first route. Prove one-shot behavior, the Budget standing row, and invited-Member behavior; finish GREEN and commit this coherent work unit. Route: delegated writer (multiple non-trivial files), then risk-gated verification. Focused runner: `pnpm test:e2e e2e/space-announcement.spec.ts`. Work-unit commit: `0ad6785727fd8cde9f00b63458e9350ad2ffef26` (250 authored changed lines, including task document).
- [x] CLOSE-2 — Cover every remaining direct-AppShell entry/correction route with the same announcement contract, extend regression coverage, run focused and applicable full checks, and commit the complete behavior. Route: delegated writer (multiple route files), then risk-gated verification. Work-unit commit: `1f6c97572cd4601601619556959555e1e2bf0989` (251 authored changed lines, including task document).

## Acceptance criteria
- The Creator entering any in-Space route first after month end sees the automatic close sheet on that route, not on a later one; the sheet is not automatically shown twice.
- An invited Member never receives the Creator-only automatic sheet.
- The Budget's standing close row remains until the month is closed; active Space selection still reflects the last Space entered by that Member.
- No write to a different Space is introduced just to ask whether a close is waiting.

## Checks and execution
- TDD: on, from issue #1's strict-TDD decision. The user confirmed the public test seams: a real Playwright route transition with session and database, plus unit tests for pure rules; RED must be observed before behavior changes. Focused E2E runner: `pnpm test:e2e e2e/space-announcement.spec.ts`; focused unit runner: `pnpm exec vitest run <affected-test-file>`.
- Per-task focused tests, then `pnpm verify` and the affected E2E scenario. Runtime harness: the cross-route E2E test against Postgres and Playwright WebKit.
- `git diff --check`; inspect changed paths, and record failures/skips honestly.
- RDD switch: off at planning. Assess delegated writer diffs and follow the native verification plan; no native review is started while off.
- Forecast: ~600 authored changed lines, a planning estimate rather than a code limit. Delivery strategy: ask-on-risk, resolved by the user to two successive PRs targeting `dev`: shared routes first, then full-screen routes after the first is integrated. Keep tests and behavior together in each reviewable work unit; #153 closes only with the second PR.

## Progress
- Status: both work units verified and committed. CLOSE-1 `0ad6785727fd8cde9f00b63458e9350ad2ffef26` merged via PR #159 into `dev` as `c7003f3cf5557b8a4f094dbe818438e39256074a`; CLOSE-2 `1f6c97572cd4601601619556959555e1e2bf0989` is on `fix/153-close-announcement-fullscreen` based on that merge. #153 remains open until the second PR merges to `dev`.
- Mapping evidence: `openSpace` writes previous-per-member opening on every route; Budget alone previously read it for `CloseNotice`. Next.js 16.3.4 layouts persist and cannot safely replace per-request route entry.
- Verification: Playwright observed RED on the Creator's first Movements route (no close dialog), then GREEN (2/2 tests) after shared-route wiring. The regression checks no standing row on Movements, a named standing close group on Budget, and no automatic sheet for the invited Member. Focused Vitest passed 29/29; `pnpm typecheck`, `pnpm verify` (97 files / 1,351 tests), and `git diff --check` passed. An isolated Playwright retry initially failed before tests with transient EADDRINUSE on port 3100; separate process inspection found the port free and the one subsequent rerun passed 2/2. Native assessment was unassessable because the new E2E file is untracked; RDD is off, so independent verification was performed. Next: publish and review the second PR to `dev`; close #153 on merge if its acceptance is confirmed. #154/#155/#133 remain separate.
- CLOSE-2 verification: the new Movement-entry route first failed RED in focused Playwright (1 of 3 failed: no dialog), then passed GREEN; the extended nine-scenario E2E passed 9/9, covering both new routes, editable and closed correction branches, and invited-Member exclusion. Carry-over correction has structural branch wiring but no dedicated announcement fixture; existing budget E2E covers paid Fixed-item refusal without the announcement combination. Independent `pnpm verify:all` passed: 1,351 unit tests (97 files), 175 DB integration tests (8 files), 144 Playwright E2E tests (including 9 announcement tests); `git diff --check` passed. Native assess returned `schema-incompatible` and RDD is off, so independent verification was required and performed. No checks failed or were skipped in that suite.
- Engram mirror: pending resynchronization; the memory service rejected the update with `session has already ended`. The local document is authoritative until the mirror can be refreshed.
