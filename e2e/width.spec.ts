import type { BrowserContext, Locator } from "@playwright/test";
import { expect, test } from "./fixtures";
import { createMember, createSpaceFor, startSession } from "./session";

/** What the canvas puts down both sides of every list, on every screen. */
const GUTTER = 16;

/** The width the canvas draws every artboard at (design/canvas.json). */
const COLUMN = 390;

async function box(of: Locator) {
  const measured = await of.boundingBox();

  // A visible element with no box cannot be measured at all, and saying so
  // beats a null dereference three lines later.
  if (!measured) throw new Error("the element has no box to measure");

  return measured;
}

/** A Member with a Space, so the list has a row on it and the Space has screens. */
async function aSpaceToLookAt(context: BrowserContext, baseURL: string) {
  const member = await createMember("Uli Vera");
  const space = await createSpaceFor(member.id, "Casa", "ARS");
  await startSession(context, baseURL, member);

  return space;
}

test("no card touches the glass", async ({ page, context, baseURL }) => {
  await aSpaceToLookAt(context, baseURL!);

  await page.goto("/espacios");

  const viewport = page.viewportSize()!;
  const card = await box(page.getByRole("list").first());

  // A 16px radius has nothing to be rounded against when the card runs edge to
  // edge (#36). The gutter is the same on both sides or it is not a gutter.
  expect(card.x).toBeCloseTo(GUTTER, 0);
  expect(card.x + card.width).toBeCloseTo(viewport.width - GUTTER, 0);
});

test.describe("on a laptop", () => {
  // The only place in the suite that is not a phone. The product is
  // mobile-first and the default project says so; this one screen size exists
  // because #36 is about what happens when the screen is not a phone.
  test.use({ viewport: { width: 1280, height: 900 } });

  test("the column is centred rather than stretched", async ({
    page,
    context,
    baseURL,
  }) => {
    const space = await aSpaceToLookAt(context, baseURL!);

    await page.goto(`/espacios/${space.id}`);

    const viewport = page.viewportSize()!;
    const main = await box(page.getByRole("main"));

    expect(main.width).toBeCloseTo(COLUMN, 0);
    // Centred: the same amount of monitor left over on each side.
    expect(main.x).toBeCloseTo((viewport.width - COLUMN) / 2, 0);
  });

  test("the tab bar spans the bottom of the column, not the monitor", async ({
    page,
    context,
    baseURL,
  }) => {
    const space = await aSpaceToLookAt(context, baseURL!);

    await page.goto(`/espacios/${space.id}`);

    const viewport = page.viewportSize()!;
    const bar = await box(page.getByRole("navigation", { name: "Principal" }));

    // Its border-top is the line that shows how wide the app is. Run across a
    // 27-inch monitor it draws a rule under a phone-wide column.
    expect(bar.width).toBeCloseTo(COLUMN, 0);
    expect(bar.x).toBeCloseTo((viewport.width - COLUMN) / 2, 0);
  });
});
