# Redraw the Avisos sheet

## Objective
Record the selected Avisos sheet interaction model in the design canvas so issue #133 has an implementable visual contract.

## Problem
The previous concept showed a chevron on all three rows, but only unpaid Fixed items navigate. Invitation actions are answered inline and the monthly-close row opens its confirmation in place.

## Why
Issue #133 was blocked until the sheet's destination and row affordances were explicit. The canvas must not preserve controls that answer nothing.

## Scope
- Add the selected Avisos sheet artboard to `design/`.
- Show pending invitation with inline Aceptar/Rechazar actions and no chevron.
- Show the unclosed-month row opening its confirmation and no chevron.
- Show unpaid Fixed items as the only navigable row with a chevron.
- Record the rationale in a new ADR.
- Keep implementation of #133 out of scope.

## Constraints
- Preserve existing design tokens, mobile canvas dimensions, Spanish product copy, and design bundle conventions.
- Do not add application code or invent behavior not already decided in the project context.

## Authorized scope
Design artifact and ADR only; no runtime implementation, issue mutation, push, or PR.

## Tasks
- [x] AVISOS-1 — Create the Avisos sheet artboard and register it in the design bundle. Route: delegated writer, because the artboard and registration touch multiple non-trivial design files. Estimated authored changes: 180 lines.
- [x] AVISOS-2 — Write ADR documenting the row affordance decision and implementation boundary. Route: delegated writer, paired with AVISOS-1. Estimated authored changes: 90 lines.
- [ ] AVISOS-3 — Register the new artboard in the exhaustive header/menu test lists, run the required checks, and commit the design work on `feat/133-avisos-sheet-design`. Route: inline for the one-file mechanical test registration, delegated verifier for checks. Existing failing test is RED evidence: `pnpm exec vitest run scripts/design-bundle.test.ts` (132 passed, 2 failed). TDD: on, from issue #1's strict-TDD testing decision; focused runner: `pnpm exec vitest run scripts/design-bundle.test.ts`.

## Acceptance criteria
- The canvas contains one Avisos sheet matching the selected interaction model.
- The design bundle validates and the artboard is registered in `canvas.json` with the correct bucket.
- The ADR explains why invitation and close rows have no chevron and Fixed items do.
- No application/runtime files change.

## Checks
- `pnpm build:design`
- `pnpm check:design`
- `pnpm test`
- `pnpm typecheck`
- `pnpm lint`

## Progress
- Status: in progress; AVISOS-1/2 produced the design and ADR, but AVISOS-3 is not verified or committed.
- Verification evidence: RED was observed before the test-list correction (132 passed, 2 failed). After adding `SheetAvisos.dc.html` to `withoutHeader`, focused Vitest passed (136/136); `pnpm build:design` rebuilt the bundle from 21 sources with no content change; `pnpm check:design` passed (20 artboards, 0 hardcoded colours); `pnpm verify` passed (typecheck, lint, migrations, design, 97 test files / 1,351 tests); `git diff --check` passed. Node 22.23.3 resolved the earlier Node 20.5.1 tooling blocker. Database integration and E2E were not run for this design-only change. Native risk assessment was unassessable because of untracked files; RDD is off, and an independent verifier ran the applicable full suite.
- Delivery evidence: commit pending. Branch: `feat/133-avisos-sheet-design` from synchronized `dev` at `9208841`.
- Next step: commit this verified design-only work and record its identity. Issue #133 runtime behavior remains separate.
