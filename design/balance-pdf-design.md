# Monthly PDF: complete budget, movements and balance

The download is for **one month and year**, not the multi-month chart interval. Screen A stays intact. The monthly PDF and download selector are design-only artifacts; another agent owns the functional implementation.

## Review first

- `output/pdf/balance-mensual-design.pdf`: the current **three-page A4** design.
- `design/monthly-pdf-download-prototype.html`: standalone visual example of A with a Download PDF button and month/year dialog. It can download the static September 2026 example, not generate reports.
- `design/balance-pdf-prototype.py`: reproducible ReportLab mockup source, not production export code.

The earlier local multi-month PDF draft is obsolete and excluded from this publication. The only current report design is `balance-mensual-design.pdf`.

## Intended interaction

**Screen A → Download PDF → choose month and year → download that month's complete report.** The report period is explicit and independent of the chart's multi-month range. The screen is neither removed nor replaced by the PDF.

The selector mockup offers other periods for visual review, but disables its static-example download for anything except September 2026. This avoids downloading a September file while claiming another month. Production offers only available closed periods through the existing generation contract, not these synthetic choices.

## Report composition

| Page | Content |
| --- | --- |
| 1 · Monthly overview | Space, month/year, currency and closed-month status; income, registered expenses and net balance; planned budget, spending and remaining planned amount; income-vs-expense bars; expense breakdown by category, final-month pace, and Budget surplus/deficit. |
| 2 · Complete budget | Every category's planned vs recorded expense and difference; all planned fixed/variable expense items, amount, category, and payment status where applicable. |
| 3 · Complete movements | Every example movement: movement date (the day the money moved), name, category where applicable, recorder, direction and full amount. Income/expense/net totals reconcile to the overview. |

The pages share document identity, generation time and page numbering. Their white background, typography and colors follow screen A's existing light semantic palette. The report has no app menu, filters, avatar, bell or back button.

## Arithmetic is deliberately separate

- **Month balance = registered income − registered expenses.** In the fixture: 5,100,000 − 4,800,000 = **+300,000 COP**.
- **Remaining planned amount = planned expenses − registered expenses.** 5,000,000 − 4,800,000 = **200,000 COP**.
- These are different figures. A planned item is not counted as a second expense when its payment already exists as a Movement.
- Income has no Category. Fixed-item payment status does not imply a paid/unpaid status for Variable items.
- The example contains every one of its 20 Movements (2 incomes, 18 expenses) and all eight planned items. Category totals reconcile to those movements.
- All figures, names and dates are synthetic design data. The generation timestamp is also an example, not a runtime clock.

## Scope and handoff limits

This task does not modify routes, export APIs, budgets, recorded movements, project dependencies, another agent's code, or GitHub issues. The preserved A–E screen prototypes remain valid design exploration, with A selected.

For the functional integration, preserve the actual existing export contract:

- Include the selected month only. Offer closed months only and record the actual generation time. An open month is refused; generating a report never closes it.
- Show all available budget items and movements, including their real statuses and optional fields. This sample does not define treatment of annulled movements or unsupported historical states; follow the existing domain/export rules rather than inventing them.
- No budget, no movements, larger amounts, long descriptions and more rows require clear states or continuation pages. Never truncate the report to fit this fixture.
- Repeat table headers on continuation pages, keep rows intact, preserve month identity, and reconcile totals once for the complete month.
- Fixed payment dates, pending/overdue states or additional supported movement metadata must follow the actual data model. This fixture illustrates all-fixed-paid, not every possible state.
- The generated PDF is not tagged or accessibility-certified. Text extraction does not establish accessibility.

## Observed design checks

Three A4 pages generated with embedded Arial fonts. Every page was rendered through Poppler and inspected for clipping, overlap, readable tables and page identity. Fixture assertions reconcile movements, categories, plan totals, income, expenses and net result. PDF text/geometry checks verify all 20 movement rows are present and text remains inside page bounds. Chromium checked month/year selection, the correct static-example download, unsupported-period guarding, dialog reopening and 390px width without overflow or runtime errors. Independent Standards and Spec reviews found no meaningful findings. These are mockup checks, not proof that the other agent's runtime functionality works.

## Next step

The functional renderer follows this layout, adding final-month pace and the Budget surplus/deficit required by #114. Production uses the movement date, not its registration timestamp. The static design fixture remains a visual reference, not runtime output. Do not publish the previously prepared screen-only implementation tasks: they do not represent this monthly PDF request.

## Production integration for #114

The Space Budget offers Download PDF with an independent month/year selector. It lists all closed months, including periods outside the screen picker window, so a lost file can be regenerated. Screen A remains a separate screen-design target; this monthly-report implementation does not replace the Budget with a balance prototype. The download is authorized for either Member, privately uncached, generated anew, and never stored.
