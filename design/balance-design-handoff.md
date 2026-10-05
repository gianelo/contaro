# Approved balance screen and monthly PDF handoff

Implement **screen A · Panorama**, keeping its multi-month reading. Add **Download PDF → month/year selection → one complete monthly report**. The PDF does not replace the screen and does not export the chart's multi-month interval.

## Authoritative design references

| Deliverable | Reference |
| --- | --- |
| Selected screen | `design/BalancePrototypeA.dc.html` in `design/contaro-app.html` / `design/canvas.json`. |
| Interactive screen exploration | `design/balance-prototype.html?variant=A`; B–E are retained research, not implementation targets. |
| Download selector | `design/monthly-pdf-download-prototype.html`. Standalone visual example, not runtime implementation. |
| Approved monthly PDF | `output/pdf/balance-mensual-design.pdf`. Three A4 pages with synthetic data. |
| PDF contents and integration constraints | `design/balance-pdf-design.md`. |
| Screen rationale | `design/balance-prototype.md`. |
| Reproducible PDF design fixture | `design/balance-pdf-prototype.py`, a local ReportLab mockup, not the application's generator. |

## Required information in the monthly report

1. Space, selected month/year, currency, open/closed status, generation time and page numbering.
2. Income, registered expenses, and their difference as the monthly balance.
3. Full budget: planned amounts, recorded spending, category differences, all planned items, and meaningful fixed-item payment states.
4. Complete monthly movements: date, name, category where applicable, recorder, direction and full amounts.

The sample reconciles income 5,100,000 minus expenses 4,800,000 to net +300,000 COP. Planned budget 5,000,000 minus expenses 4,800,000 leaves 200,000 of the plan. **These are different figures; planned items must not double-count recorded payments.**

## Functional-agent boundary

After this design PR is merged, update your own working branch from `dev` using the repository workflow, preserving any in-progress work. Read this handoff and the PDF specification before adapting the existing export implementation. Reuse its domain/export contract and security checks; do not import this static mockup generator into production.

- Another agent owns functionality. This PR contains design assets, mockups and design-bundle inventory maintenance, not routes, export APIs, storage or schema changes.
- #115 is the balance-screen design reference; #114 concerns the month report. Neither is claimed implemented or closed by this design-only publication.
- Keep the full selected month, not just rows visible on the phone. Additional rows need continuation pages with repeated headers and reconciled totals.
- Follow existing domain rules for provisional months, empty periods, pending/overdue fixed items, optional movement fields and annulled states. The sample is not a new policy for those cases.
- Remove synthetic-data marks and the prototype variant switcher in production; use real dates and data. Never generate another month's report from the September fixture.
- No design-only switcher or mock download is intended to ship as application code.

## Review and delivery

The maintainer approved A and the monthly PDF, and explicitly accepted one cohesive PR despite exceeding the 400-line review heuristic. PDF and screen designs were independently reviewed on Standards and Spec axes. Page rendering, sample totals, complete movement rows, selector behavior and design-bundle consistency were checked. Runtime functionality, accessibility certification and live export behavior remain the functional agent's responsibility.
