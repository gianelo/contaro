# Ship the Avisos bell runtime

## Objective
Implement #133's Space-header bell for pending account invitations, the oldest unclosed month for this Member and Space, and unpaid Fixed items in the Reader's current calendar month.

## Boundaries and decisions
- #151 fixed scope: current Space plus account invitations. #154 supplies a passive waiting-month read; #155 supplies an explicit Space/month unpaid Fixed count.
- The bell must not spend an opening or replace the Creator's once-only close announcement or the standing Budget row. Only the Creator can close; invited Members see state. Both see the current Reader-month unpaid Fixed count even while viewing another month; future-due unpaid items count.
- ADR-0067 and `design/SheetAvisos.dc.html`: invitation actions inline, existing close confirmation in place, only Fixed links to its Budget destination and gets a chevron.
- Preserve authentication, membership boundaries and Matt Pocock skills. Do not close #133 until promotion to `main`; do not push, open PRs or merge without separate authorization.
- Strict TDD seams confirmed by the user: composition DB integration, rendered sheet component, browser E2E route flow. For Next code, read the installed `node_modules/next/dist/docs/` guide before editing.

## Tasks
- [x] AV-1 — Compose authorized passive Avisos data for Member/Space and Reader month, with PostgreSQL integration tests. Route: delegated writer. Commit `8919901178506a5cda4165234bdb14948f6be941` (140 authored changed lines including initial task document).
- [x] AV-2 — Build accessible bell and sheet with inline invitations, reused close confirmation and sole Fixed destination, with component tests. Route: delegated writer. Commit `dcb75ec93b17ef10544d2f47c2ae52e7418086c6` (194 changed lines), followed by invariant/touch-target correction `d7079fa71c1336bd75ebc55ce6b8d6bbf99f7d95` (13 changed lines). Reopened until those corrections passed full verification.
- [x] AV-3 — Mount the bell on Space-header screens and cover both roles, month choice, first-route announcement and hit-targets in browser tests. Route: delegated writer. Commit `21f6fa84623b2191f2879a7803bc24a3521b347d` (155 changed lines including task evidence); evidence commit `fca85c6`.

## Acceptance
- The bell on Space-header screens shows account invitations and only the authorized Space's waiting month and current-month unpaid Fixed count; empty state is explicit.
- Existing invitation actions retain their form fields/redirect behavior. The Creator can launch the existing close confirmation without another automatic announcement; an invited Member cannot close. Only Fixed has a destination and chevron.
- Passive reads leave `last_opened_at` alone; the first real opening still owns the monthly announcement and Budget retains its standing row. A nonmember receives no Space-scoped notices.

## Checks and delivery
- Strict TDD: on, from issue #1's Testing Decisions; seams confirmed by the user. RED observed for absent AV-1 module, absent AV-2 component and absent AV-3 browser button before GREEN. The later invited-Member case passed as characterization: no false RED claim.
- Exact focused runners: `pnpm exec vitest run --config vitest.integration.config.ts src/app/espacios/[id]/avisos.integration.test.ts` (2/2); `pnpm exec vitest run src/app/espacios/[id]/avisos-sheet.test.tsx src/app/espacios/[id]/close-notice.test.tsx` (16/16); `pnpm exec playwright test e2e/hit-targets.spec.ts e2e/avisos.spec.ts` (10/10). PostgreSQL and real browser are the runtime harnesses for AV-1/AV-3; AV-2 uses rendered component interactions.
- Independent final `pnpm verify:all`: typecheck, lint, migrations and design passed; 1,353/1,353 unit, 185/185 DB integration, 147/147 E2E; no reported failures or skips. Staged `git diff --cached --check` passed separately before each work-unit commit. Prior full runs exposed icon inventory/local link source failures and stale hit-target counts; these were fixed, not waived. Avisos close action measured 25px in browser before its minimum became 44px.
- RDD off. Assess after delegated writer was unassessable with untracked files; required independent verifier ran. Rollback AV-1: `src/app/espacios/[id]/avisos.ts`, `.integration.test.ts`; AV-2: `avisos-sheet.tsx`, `.test.tsx`, `.module.css`, `close-notice.tsx`, `src/i18n/messages.es.ts`, `src/ui/icon.tsx`, `src/ui/icon.test.tsx`; AV-3: `src/app/header.tsx`, `src/app/espacios/[id]/waiting.ts`, `e2e/session.ts`, `e2e/avisos.spec.ts`, `e2e/hit-targets.spec.ts`. This task document carries evidence for each.
- Review forecast exceeded ~400 authored lines; user selected `feature-branch-chain` toward `dev`. First proposed review slice: `8919901` + `dcb75ec` + `d7079fa` (~347 changed lines). Second: `21f6fa8` + `fca85c6` and this documentation evidence (~159 lines). The first slice is preparatory; the live bell arrives with the second. Slice delivery awaits separate user approval.

## Progress
- Started from synchronized `dev` at `1882af9b2e2767f30a84890a381352c5200a2c47` on `feat/133-avisos-bell`. All three tasks are implemented and verified locally; no push or PR authorized yet. #155 was merged to `dev` with CI green and remains open until `main` promotion.
- Engram mirror pending because this session reports `session has already ended`; this local file is the recovery source.
- Next: ask whether to publish the two review slices toward `dev`. Do not merge or close #133 through the first preparatory slice.
