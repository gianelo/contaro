import { expect, type Page } from "@playwright/test";

/**
 * The months the run is standing in and either side of it, written `YYYY-MM`
 * in the zone the whole suite is pinned to.
 *
 * `playwright.config.ts` fixes the browser and the server's header together,
 * so this and the screen agree about which month "this month" is — and which
 * month that is, is the Reader's question and never the server's (ADR-0018):
 * at nine at night on the 30th in Bogota the server is already in the next one.
 *
 * Calendar arithmetic and never anything the screen decides: reproducing a
 * figure the app computes would be a test that agrees with itself.
 */
export function months() {
  const inBogota = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());

  const [year, month] = inBogota.split("-").map(Number) as [number, number];

  return {
    thisMonth: inBogota,
    previous: new Date(Date.UTC(year, month - 2, 1)).toISOString().slice(0, 7),
    next: new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 7),
  };
}

/**
 * Moves to another month through the pill at the top of the screen (#40, #61).
 *
 * Two taps for any month of the year, where the `‹ Septiembre ›` walker it
 * replaced took one tap and one page load per month stepped over. Shared by
 * the plan and the month's list because they wear the same pill and reach the
 * same months out of the same function (`monthChoices`) — a second copy of
 * these two taps is a second thing to keep in step with the component.
 *
 * The row is picked by where it goes rather than by the month's name, so this
 * does not have to hold a second copy of how Spanish names a month. `href` is
 * the screen's own, which is what makes it a check and not only a tap: the
 * ledger's pill must offer ledger URLs.
 */
export async function chooseMonth(page: Page, href: string, month: string) {
  const sheet = await openMonths(page);
  await sheet.locator(`a[href="${href}"]`).click();
  // A client-side navigation, so the URL is read once it has landed rather
  // than in the same breath as the tap.
  await page.waitForURL(new RegExp(`\\?mes=${month}$`));
}

/**
 * The sheet the pill opens, with the fourteen months in it.
 *
 * Named here rather than spelled out per spec because "Elegir el mes" is the
 * sheet's title and the group's label both, so a bare `getByRole("dialog")`
 * is the honest way to point at it once and the name is what a failure reads.
 */
export async function openMonths(page: Page) {
  await page.getByRole("button", { name: /elegir el mes$/ }).click();
  const sheet = page.getByRole("dialog", { name: "Elegir el mes" });
  await expect(sheet).toBeVisible();

  return sheet;
}
