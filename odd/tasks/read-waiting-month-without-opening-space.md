# Read the waiting month without opening a Space

## Objective
Implement issue #154: answer which month is waiting to be closed for a Member and Space without writing `last_opened_at` or spending the once-only announcement.

## Problem and why
The existing `theCloseWaiting` needs a `SpaceOpening`, obtained only from `openSpace()`/`markSpaceOpened()`; a passive bell query would falsely record that the Member entered the Space and could consume #153's first-route announcement. `closedMonthsFrom` and `theMonthWaitingToBeClosed` already contain the month decision.

## Scope and constraints
- Return only the waiting month (`Month | null`), not `announces`, tally, or a UI row; a passive read must never claim an opening occurred.
- Scope membership reads by both `spaceId` and `memberId` and return no month for a non-member or malformed id. Reuse the existing Reader date/timezone conversion for the join date, the Member's own join boundary, and oldest ended unclosed month.
- Preserve `markSpaceOpened`, active-Space selection, Creator-only auto-announcement and standing Budget row. No bell runtime (#133), unpaid Fixed-item query (#155), issue mutation, Matt skill changes, push, or PR in this work unit.
- The user prefers accumulating about five changes on `dev` before promoting to `main`; #153 remains open until that later promotion.

## Tasks
- [x] WAIT-1 — Add a membership-scoped read-only history lookup and DB integration tests for joined/last-opened timestamps, non-member and malformed IDs, and no write to `last_opened_at`. Route: delegated writer, because production and integration tests are non-trivial files. Work-unit commit: `05168524eaf153dd0d41dfae3f46a586206f4697` (102 authored changed lines including task document).
- [x] WAIT-2 — Compose the read-only waiting-month answer from membership history, Reader day and closed months without invoking `openSpace()`. Prove oldest-open month, join boundary, closed/all-closed cases and that the lookup does not consume a later first-route announcement; run applicable checks and commit. Route: delegated writer for service and integration tests. Work-unit commit: `98f29cb665f0d0d562f02ea7dfa51ac911708600` (111 authored changed lines including task document).

## Acceptance criteria
- A Member can ask about a Space they belong to and receive its oldest ended, unclosed month or null; no `last_opened_at` change occurs.
- A non-member receives no history/month and learns nothing about another Space through this query.
- The Reader's date/timezone, not the server's day, determines month-end and join-date interpretation.
- The first actual route opening still owns the Creator's once-only announcement after any passive reads.

## Checks and delivery
- Strict TDD: on, from issue #1's Testing Decisions. User-confirmed seams: PostgreSQL integration for read/no-write and the composed month query; reuse existing pure-domain month tests. RED observed before production changes, GREEN and review afterwards.
- Focused DB runner: `pnpm exec vitest run --config vitest.integration.config.ts src/db/spaces.integration.test.ts` and the new waiting-query integration test; start/migrate DB with `pnpm db:up && pnpm db:migrate` if necessary. Full checks: `pnpm verify:all` at feature closure where applicable; `git diff --check` per task.
- RDD: off; after delegated writers, use native assess and its returned verification plan. Risk assessment failure is treated as high.
- Forecast ~300 authored changed lines; delivery strategy `ask-on-risk`, likely one focused PR to `dev` after both reviewable commits. Work-unit commits include tests and evidence; push/PR remain separate user decisions.

## Progress
- Status: complete on `feat/154-read-waiting-month`, branched from synchronized `dev` at `b23dab1`; WAIT-1 committed as `05168524eaf153dd0d41dfae3f46a586206f4697` and WAIT-2 as `98f29cb665f0d0d562f02ea7dfa51ac911708600` (with task-evidence follow-up commits). No push or PR yet.
- Issue #153 is merged in `dev` but remains OPEN until later `main` promotion. #154 does not change its open/write contract.
- WAIT-1 verification: observed RED in `src/db/spaces.integration.test.ts` because `readSpaceMembershipHistory` was missing; after implementation the focused DB suite passed 33/33 and `pnpm typecheck` passed. An initial GREEN run failed on a Date/string assertion in the new test, corrected before the 33/33 result. An independent verifier repeated 33/33, typecheck and `git diff --check` successfully. Native assess was unassessable with the untracked task document and RDD off; independent verification was therefore required. No DB schema or opening-write behavior changed. Next: compose the read-only waiting-month answer in WAIT-2 without spending the opening signal.
- WAIT-2 verification: integration tests observed RED (6 failures: `theWaitingMonth` missing) before implementation, then GREEN 6/6. Existing waiting unit tests passed 15/15; `pnpm typecheck` passed. Independent `pnpm verify:all` passed 1,351 unit tests, 182 DB integration tests and 144 E2E tests with no reported failures/skips; `git diff --check` passed. A test-only triangulation after the full run proved that two passive reads leave the prior timestamp intact and that the subsequent `markSpaceOpened` snapshot yields `announces: true` through `closeWaitingOn`; the focused 6/6 integration tests were independently rerun. This does not claim a browser route was exercised for #154. Native assess was unassessable while the integration test was untracked and RDD is off; independent verification was performed. Next: publish a focused PR to `dev` when requested; #154 stays open until a later `dev → main` promotion.
- Engram mirror: pending because this session's memory service reports `session has already ended`; the local file is the recovery source until it accepts updates.
