# Count unpaid Fixed items for Avisos

## Objective
Implement #155's independent read for unpaid Fixed items in one Space and an explicit month, to support the future #133 bell.

## Problem and why
The existing `tallyOf` lives inside the Creator's close recap and counts the oldest unclosed month, not the month the bell needs. The bell needs a read for the current calendar month of the Reader, even while viewing a different month, without tying the answer to a Creator-only close sheet.

## Scope and decisions
- The bell in #133 will supply the Reader's current calendar month; this task accepts an explicit `(space, month)` and does not wire UI or choose the Reader's month.
- Count all unpaid Fixed items in that month (including not-yet-due), not only overdue items; a voided payment makes a Fixed item unpaid again. Exclude paid Fixed items and non-Fixed items.
- Both Creator and invited Members may use the answer; this task adds no Creator gate. Preserve membership/access checks at the caller boundary when #133 consumes this query, and do not expose a new unauthenticated route.
- Space in view only, with pending invitations as the account-level exception established by #151. Do not modify Matt Pocock skills, #133 runtime, issues, or publish a branch without separate authorization.
- Strict TDD seam confirmed by the user: PostgreSQL integration through the public query, proving unpaid/paid/voided behavior; include Space/month isolation as applicable.

## Tasks
- [x] FIX-1 — Add the public explicit-Space/month unpaid Fixed-item count with integration tests at the confirmed seam (RED then GREEN), classify the new DB read in the closed-month source invariant, verify the work unit, and commit it with tests and this evidence. Route: delegated writer for query and integration tests, parent mechanical source-invariant correction. Work-unit commit: `51c5cba3dc237ff4efeacd290406ffa933c2d7bc` (76 authored changed lines including task document).

## Acceptance criteria
- For the requested Space and month, the query returns the number of unpaid Fixed items, including those not yet due.
- Paid Fixed items and other item kinds do not contribute; voiding a payment changes the answer back to unpaid.
- Different Spaces and months do not contaminate one another. It can be used for either Member without a Creator-only dependency.
- No bell UI, close-month tally behavior, membership write, or routing changes.

## Checks and delivery
- Strict TDD: on, source issue #1's Testing Decisions and the user's explicit confirmation of the PostgreSQL integration seam; RED must be observed before implementation, GREEN afterwards.
- Focused runner: `pnpm exec vitest run --config vitest.integration.config.ts src/db/budget-items.integration.test.ts`; database startup/migration if needed: `pnpm db:up && pnpm db:migrate`. Applicable full checks: `pnpm verify:all`; structural check: `git diff --check`.
- Runtime harness: focused PostgreSQL integration exercises the actual persistent read; no browser runtime is part of #155 because the bell is #133.
- RDD off; assess the writer diff and obey its returned verification plan. Forecast ~120 authored changed lines, delivery strategy `ask-on-risk`, one work-unit commit on the feature branch. No push/PR/merge authorization for this task.

## Progress
- Started from synchronized `dev` at `42c85297bae17593b7a748225b79e8cc57269bf0` on `feat/155-unpaid-fixed-items-query`; implemented and committed FIX-1 locally.
- Engram mirror pending: the current session reports `session has already ended`; local file is the recovery source. Feature complete locally; neither push nor PR was requested.
- Writer observed RED: the new query was absent while 53 other focused tests passed; GREEN: 54/54 focused DB integration tests and typecheck passed. First independent `pnpm verify:all` failed in unit tests (1 failure, 1,350 pass) because the new DB export needed classification in `src/db/closed-months.source.test.ts`; full DB and E2E were not reached in that run. Added the one-line READS classification and independently reran: focused DB 54/54, full `pnpm verify:all` 1,351/1,351 unit, 183/183 DB integration, 144/144 E2E; typecheck, lint, migrations, design checks passed. `git diff --check` passed. Runtime harness: the PostgreSQL integration test exercises the actual persistent read; no new browser behavior exists in this task. Rollback boundary: `src/db/budget-items.ts`, `src/db/budget-items.integration.test.ts`, `src/db/closed-months.source.test.ts`, and this task record. No outstanding functional failures. Work-unit commit: `51c5cba3dc237ff4efeacd290406ffa933c2d7bc`. Next: request separate authorization before publishing the branch or opening a PR to `dev`; #155 stays open until later promotion to `main`.
