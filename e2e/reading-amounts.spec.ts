import { expect, test } from "@playwright/test";
import {
  createMember,
  createSpaceFor,
  joinSpace,
  startSession,
} from "./session";

/**
 * #24, end to end: only the separators are the reader's.
 *
 * Playwright's `locale` is what sets `Accept-Language`, which is the whole
 * input this feature has — so "a Member who reads numbers the Mexican way" is
 * testable without a second device. What the unit tests cannot prove is the
 * part in the middle: that Next hands the header to the page at all.
 */

test("two Members of one Space each read its money their own way", async ({
  browser,
  baseURL,
}) => {
  const rita = await createMember("Rita Lectora");
  const memo = await createMember("Memo Lector");
  const shared = await createSpaceFor(rita.id, "Casa compartida", "MXN");
  await joinSpace(shared.id, memo.id);

  const argentine = await browser.newContext({ baseURL, locale: "es-AR" });
  const mexican = await browser.newContext({ baseURL, locale: "es-MX" });
  await startSession(argentine, baseURL!, rita);
  await startSession(mexican, baseURL!, memo);

  const ritaSees = await argentine.newPage();
  const memoSees = await mexican.newPage();
  await ritaSees.goto(`/espacios/${shared.id}`);
  await memoSees.goto(`/espacios/${shared.id}`);

  const month = (page: typeof ritaSees) =>
    page.getByRole("group", { name: "Este mes" });

  // The same amount, written two ways. Nothing is recorded yet (#7), so the
  // decimal separator is the only one there is to invert — which is the very
  // character the ticket is about. The grouping separator gets its own
  // assertion the moment there is a figure with thousands in it.
  await expect(month(ritaSees)).toContainText("MXN 0,00");
  await expect(month(memoSees)).toContainText("$0.00");

  // And it is the Space's money for both of them, never the reader's.
  await expect(ritaSees.getByText("Peso mexicano (MXN)")).toBeVisible();
  await expect(memoSees.getByText("Peso mexicano (MXN)")).toBeVisible();
  await expect(ritaSees.getByText("Peso argentino")).toHaveCount(0);

  await argentine.close();
  await mexican.close();
});

/**
 * A reader whose conventions are unknown. No browser omits `Accept-Language`,
 * so this is what the header being useless looks like in practice: a language
 * contaro has no separators for at all.
 */
test.describe("a Member whose browser asks for a language we cannot read", () => {
  test.use({ locale: "zz-ZZ" });

  test("still gets a figure, in the documented fallback", async ({
    page,
    context,
    baseURL,
  }) => {
    const nadie = await createMember("Nadie Sabe");
    const space = await createSpaceFor(nadie.id, "Casa", "ARS");
    await startSession(context, baseURL!, nadie);

    await page.goto(`/espacios/${space.id}`);

    await expect(page.getByRole("group", { name: "Este mes" })).toContainText(
      "$ 0,00",
    );
  });
});
