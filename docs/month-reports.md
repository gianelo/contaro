# Prepare a closed-month report

The data and authorization for #114 are ready for a PDF renderer. The PDF
template, HTTP download route and visible entry point are deliberately pending
the separate design work; this change does not generate a PDF yet.

## Renderer entry point

Call `loadMonthReport(spaceId, month)` from
`src/app/espacios/[id]/informe/load.ts` on **every** generation request. It reads
the signed-in Member and verifies membership before reading financial details.
Both Members can obtain the report; only the existing monthly-close act is
Creator-only. An open month is refused, never closed as a generation side effect.

`ready` provides the Space and its locale, close attribution/date, full plan,
standing Movements, Fixed items with their paid state, Category lines, income,
plan/spending totals, final-month pace, surplus/deficit and Member names.
Amounts remain `Money` values in minor units for the renderer to format.
Struck Movements are absent, and a struck Fixed payment is pending.

Category headings roll up their children's spending. Heading and child lines
are detail, not additive totals: use `totals` for the month's figures. The pace
is measured at the last day of the reported month, never at today's date.
Surplus/deficit reuses the existing Budget rule, not income minus expenses;
an unplanned or exactly-on-plan month has no carry-over figure.

Refusals are `not-signed-in`, `no-such-space`, `no-such-month`, `month-open` or
`failed`. A Space the requester cannot access reads as no Space. Do not return
the internal `failed.cause` to the client. The future download route must keep
responses private and uncached, including refusals.

## Agreed scope

- Generate anew on every request; do not store PDF bytes or provision storage.
  The report remains reachable through the Space's closed month.
- Use Spanish and the Space's immutable `es-CO` locale, keeping its currency.
  The migration backfills existing Spaces and bridges older writers with a
  default; a database trigger refuses later locale changes. No new language
  picker or multilingual infrastructure is introduced.
- A template change can alter appearance. Space and Member names are current
  labels, not historical snapshots; regenerating does not promise identical
  bytes. Financial reads share a repeatable-read, read-only transaction.

The pre-existing close/write concurrency window documented in
`src/db/closed-months.ts` is not repaired by a read-only report. No new guarantee
against a write already in flight at closure is claimed here.

## Checks

Run `pnpm typecheck`, `pnpm lint`, `pnpm check:migrations`, and `pnpm test`.
Database tests include `src/db/month-reports.integration.test.ts` and the Space
and invitation round trips. Use a dedicated local Postgres and run migrations
before `pnpm exec vitest run --config vitest.integration.config.ts`.
