# Ship the Avisos bell runtime

## Objective
Implement #133's bell in the Space header to surface pending account invitations, the oldest unclosed month for this Member and Space, and unpaid Fixed items in the Reader's current calendar month.

## Why and product boundaries
The artboard and ADR-0067 define an Avisos sheet; #151 settled scope (current Space plus pending account invitations), #154 supplied a passive waiting-month read, and #155 supplied the month-scoped unpaid Fixed count. The Creator's once-only close sheet and standing Budget row remain unchanged. The bell must not call opening writes merely to ask what is waiting.

## Decisions and constraints
- Pending invitations are account-scoped and use existing accept/reject actions; Space-local rows do not aggregate other Spaces.
- Unclosed month is read passively via `theWaitingMonth`, preserving joined-month and Creator/Member closing rules. A month row uses the existing local close confirmation, not an invented new action.
- Fixed count is for the Reader's current calendar month even when viewing another month; show it for both Creator and invited Members, include all unpaid Fixed items including future dues, and use the Budget destination/chevron established in ADR-0067.
- Preserve existing route permission checks, Member identity, invitation eligibility, Monthly close announcement and Budget row, and Matt Pocock skills. Do not close #133 or ship to main as part of this implementation. Push/PR/merge require separate user authorization.
- User-confirmed strict-TDD seams: composed Avisos data boundary, Avisos sheet component, and a browser E2E route flow. Observe RED→GREEN in vertical slices; no tests at private helper seams.
- For Next.js code, read the relevant installed guides under `node_modules/next/dist/docs/` before writing. UI follows `design/SheetAvisos.dc.html` and `docs/adr/0067-only-a-destination-gets-a-chevron-in-avisos.md`.

## Tasks
- [ ] AV-1 — Compose authorized Space-local and account invitation Avisos data using passive reads and the Reader's date. Prove scope, month and no write at the confirmed composition seam. Route: delegated writer (service plus integration tests); verification complete, awaiting work-unit commit.
- [ ] AV-2 — Build accessible Avisos sheet and header trigger from existing UI primitives, with inline invitations, in-place close confirmation and Budget destination. Prove interactions at the confirmed component seam. Route: delegated writer (multiple UI/test files).
- [ ] AV-3 — Wire Avisos to the common Space route and verify the visible browser flow in both roles without disturbing the Monthly close announcement; add confirmed E2E coverage. Route: delegated writer (route and browser tests).

## Acceptance
- On a Space screen, the bell opens an Avisos sheet with the relevant pending invitations, waiting month and this Space's current-month unpaid Fixed count. Empty state is intentional and accessible.
- Invite actions use existing security/redirect contracts, close is Creator-only, invited Members have the state-only text, and only the Fixed destination has a chevron.
- A passive Avisos read never advances `last_opened_at` or consumes the monthly announcement. The first actual Space route still owns it.
- No cross-Space Fixed/close information leaks; displayed month and locale follow the Reader. Screens that share the Space header show the same bell.

## Checks and delivery
- Strict TDD: on from issue #1's Testing Decisions; user explicitly confirmed composition, component and E2E seams. Exact unit runner `pnpm exec vitest run <test-path>`; DB runner `pnpm exec vitest run --config vitest.integration.config.ts <test-path>`; browser runner `pnpm exec playwright test <spec-path>`; applicable full suite `pnpm verify:all`, plus `git diff --check` and typecheck.
- RDD off. After each delegated writer, use native assess for its returned independent-verification plan. Verification workers run authorized commands. Each task closes in at least one work-unit commit with code, tests and this evidence. Delivery strategy: `ask-on-risk`, with user-selected `feature-branch-chain` toward `dev`; forecast ~550–800 authored changed lines total, likely multiple focused PR slices. Slice boundaries will follow independently useful work-unit commits, recorded before PR creation. This is a review forecast, not an artificial code-size cap.
- Runtime harness: the actual browser E2E for AV-3; for AV-1 use DB integration and for AV-2 use rendered component interactions. Rollback boundaries will name exact files per task.

## Progress
- Started from synchronized `dev` at `1882af9b2e2767f30a84890a381352c5200a2c47` on `feat/133-avisos-bell`; no source changes yet. PR #162 merged with CI green, #155 remains open until main promotion.
- Engram mirror pending: the current session reports `session has already ended`; this local document is the recovery source.
- The user selected `feature-branch-chain` for the review forecast; no main-directed stacked PRs. AV-1 writer observed RED (missing `./avisos`), then GREEN 1/1 DB integration; typecheck and diff check passed. Independent verifier repeated those passes but found the invited-Member composition scenario untested. The lower-level #155 query already tests paid/non-Fixed exclusions; the composer has no viewed-month parameter, so month-view independence follows from its explicit `monthOf(reader.today)` call. An invited-Member characterization test passed without production changes (no RED claimed for that additional case). Independent rerun passed 2/2 composition DB integration tests and typecheck. Initial RED for the absent composition module and subsequent GREEN were observed by the writer. The creator's `last_opened_at` remained unchanged; Member test proves own joined-month boundary and invitation isolation. `git diff --check` passed for tracked changes; because the new source/test and task file are untracked, stage before final structural check. Runtime harness: real PostgreSQL integration; browser E2E is AV-3. Rollback boundary: `src/app/espacios/[id]/avisos.ts`, `src/app/espacios/[id]/avisos.integration.test.ts` and this task document. No full suite yet; AV-1 awaiting its work-unit commit.
