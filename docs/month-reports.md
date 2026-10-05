# Generate a closed-month report

The Space Budget offers **Download PDF**, with an independent month/year
selector containing every closed month. Either Member can generate a complete
report again; no PDF file is retained. The balance-screen prototypes remain
a separate design target, not a replacement for the Budget.

## Renderer entry point

The Node route `GET /api/espacios/[id]/informe?mes=YYYY-MM` calls
`downloadMonthReport` with the production ports in `informe/load.ts` on
**every** generation request. It reads
the signed-in Member and verifies membership before reading financial details.
Both Members can obtain the report; only the existing monthly-close act is
Creator-only. An open month is refused, never closed as a generation side effect.

`ready` provides the Space and its locale, close attribution/date, full plan,
standing Movements, Fixed items with their paid state, Category lines, income,
plan/spending totals, final-month pace, surplus/deficit and Member names. `net` is income minus recorded expenses;
`remaining` is planned minus recorded expenses (null without a plan). These
are separate from `balance`, the existing Budget carry-over.
Amounts remain `Money` values in minor units for the renderer to format.
The PDF renderer uses PDFKit with bundled Noto Sans and Unifont fallback fonts, without a browser
or network calls. Fonts are included in the Next.js route trace.
Struck Movements are absent, and a struck Fixed payment is unpaid.

Category headings roll up their children's spending. Heading and child lines
are detail, not additive totals: use `totals` for the month's figures. The pace
is measured at the last day of the reported month, never at today's date.
Surplus/deficit reuses the existing Budget rule, not income minus expenses;
an unplanned or exactly-on-plan month has no carry-over figure.

Refusals are `not-signed-in`, `no-such-space`, `no-such-month`, `month-open` or
`failed`. A Space the requester cannot access reads as no Space. Do not return
the internal `failed.cause` to the client. The download route keeps every response private and uncached, including
refusals. It responds with 401 when signed out, 404 for an inaccessible Space,
400 for an invalid month, 409 for an open month, and a generic 500 on failure.

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

The three A4 sections follow the approved monthly design: overview, complete
plan, and full movements. Longer tables continue with repeated headers and
intact measured rows. Each page states Space, period, currency, closed status,
generation time (UTC), and page numbering. Pace is measured at month end;
unpaid Fixed items say “Nunca se pagó”, without ongoing due notices (ADR 0054).
Movement dates are `occurredOn`, not registration timestamps.
Category headings roll up spending, so direct-category chart bars do not count
parent totals a second time. Empty periods have explicit states.

Run `pnpm typecheck`, `pnpm lint`, `pnpm check:migrations`, and `pnpm test`.
Database tests include `src/db/month-reports.integration.test.ts` and the Space
and invitation round trips. Use a dedicated local Postgres and run migrations
before `pnpm exec vitest run --config vitest.integration.config.ts`.

The approved test seams are full PDF content and continuation, the authorized
private download for either Member, and the closed-month selector. Run
`pnpm exec playwright test e2e/month-reports.spec.ts` against a dedicated
local database for the production download path, fonts, and browser interaction.
