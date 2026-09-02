import { expect, test, type Page } from "@playwright/test";

const MIN = 44;

/** Measures every element a finger can hit, in a real browser. */
async function undersizedTargets(page: Page) {
  const interactive = page.locator(
    "a:visible, button:visible, [role='button']:visible, input:visible, select:visible, textarea:visible",
  );
  const count = await interactive.count();
  const undersized: string[] = [];

  for (let i = 0; i < count; i += 1) {
    const element = interactive.nth(i);
    const box = await element.boundingBox();
    const name = (await element.textContent())?.trim() || `element #${i}`;

    // A visible interactive element with no box is itself a failure: it cannot
    // have a touch target at all.
    if (!box) {
      undersized.push(`${name} (no box)`);
      continue;
    }
    if (box.width < MIN || box.height < MIN) {
      undersized.push(`${name} (${box.width}x${box.height})`);
    }
  }

  return { undersized, count };
}

test("every interactive element on the home screen is at least 44px", async ({
  page,
}) => {
  await page.goto("/");
  const { undersized, count } = await undersizedTargets(page);

  expect(count).toBe(4); // three tabs and the empty-state button
  expect(undersized).toEqual([]);
});

test("every base component is at least 44px, sheet included", async ({
  page,
}) => {
  await page.goto("/ui");
  await page.getByRole("button", { name: "Abrir la hoja" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();

  const { undersized, count } = await undersizedTargets(page);

  // Four buttons, an actionable list row, the scrim, and the two sheet
  // actions. If a component stops rendering, this count catches it.
  expect(count).toBe(8);
  expect(undersized).toEqual([]);
});
