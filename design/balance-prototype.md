# Multi-month balance: five design proposals (#115)

Status: **A · Panorama selected and approved by the maintainer**. B–E remain exploration evidence, not alternative implementation targets. These are design artifacts, not production routes. See `balance-design-handoff.md` for the separate monthly PDF download scope.

## Preview

Open `design/balance-prototype.html` directly in a browser. No server or build is required. Use the bottom switcher or left/right arrow keys to compare A–E; `?variant=A` through `?variant=E` are shareable local preview selections.

The same five initial states are artboards in `canvas.json` / `contaro-app.html`. Their controls are static drawings; use the standalone preview for interactions. The prototype switcher exists only in this standalone design file, never in the production app.

| Proposal | Primary question | Visual structure | Tradeoff |
| --- | --- | --- | --- |
| A · Panorama | How did each month turn out? | Range total, signed bars, quiet cumulative line, month detail | Most direct overview; detail sits below the chart. |
| B · Recorrido | How did we reach this result? | Waterfall, cumulative line, chronological month list, detail | Explains contributions, but the floating bars need a short explanation. |
| C · Comparación | How do income and expenses compare? | Monthly results first, paired bars, detail, cumulative summary | Makes both magnitudes explicit; longest reading path. |
| D · Mapa de meses | Which months had surplus or deficit? | Signed month tiles, selected detail, cumulative line | Fast month selection; less precise visual comparison of magnitude. |
| E · Libro de balance | What are the exact numbers? | Range summary, compact table, signed bars, detail, secondary cumulative line | Auditable numbers; denser and less immediately visual. |

## Provisional design assumptions

- Six **manually closed** months by default, not all past calendar months. Presets: last three closed months, last six, all available, or inclusive custom month range. The fixture has only six closed months, so All and Six contain the same data.
- October is the example current month. It is excluded by default; including it makes the result provisional. It is available only when the selected range ends in September, keeping October adjacent to the range. This is an option to review, not an approved change to domain rules.
- All proposals preserve the three readings in #115: per-month surplus/deficit, selected income-versus-expense detail, and a secondary cumulative line.
- Monthly balance is income minus **registered expenses**, not planned amounts. No prior deficit is inserted into another month's arithmetic.
- The cumulative figure is the sum **within the selected range**, starting from zero, not cash available or a bank account balance. Changing the start resets its baseline.
- Months show a sign and a figure as well as color. Charts use COP millions; detail uses complete amounts. The examples include two deficit months.
- The preview's hamburger reproduces the Space-menu destination, without modifying `SpaceMenu`, authentication, routes, or storage. Settings and sign-out are deliberately disabled.
- No category breakdown, donut chart, forecast, or percentage trend is invented: these would introduce requirements not in #115.

## Example data

All variants use the same synthetic Casa / COP figures for April–September 2026: total income **29,800,000**, registered expenses **28,400,000**, net **+1,400,000**. The July–September subset nets **+600,000**. October is partial (+2,300,000) and is labeled separately.

## Next decision

Implement the reviewed screen A using its design as visual reference. Preserve B–E only as exploration evidence; do not implement a variant switcher in production. PDF download selects one month/year independently of this screen's chart range. The functional agent owns runtime integration; see `balance-design-handoff.md`.

## Observed verification

- `pnpm build:design` and `pnpm check:design`: passed; 34 artboards, zero hardcoded colors.
- `pnpm typecheck` and `pnpm lint`: passed.
- Focused design bundle/palette suite: 236 tests passed. Full unit suite: 99 files, 1,424 tests passed.
- Chromium: all five variants checked at 390px, URL switching, range totals, invalid-range feedback, provisional month, selected-month detail, menu, and keyboard switching. No runtime errors or horizontal overflow.
- Static artboard heights measured in Chromium and recorded in the manifest; full comparative screenshot visually inspected.
- Standards review: no findings. Spec review: two findings corrected (E monthly-first hierarchy and exclusive range-selection indicators).
- No runtime application build, database integration, real-device or production accessibility audit: this is a standalone visual prototype, not runtime implementation.
- No test-first claim: throwaway visual exploration; existing design test fixtures were updated for the five additional artboards after observing their coverage failures.
