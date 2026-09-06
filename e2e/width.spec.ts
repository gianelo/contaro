import type { BrowserContext } from "@playwright/test";
import { expect, test } from "./fixtures";
import { createMember, createSpaceFor, startSession } from "./session";
import { box, gutterOf } from "./layout";

/** The width the canvas draws every artboard at (design/canvas.json). */
const COLUMN = 390;

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
  // A Space is a card of its own now rather than a row in one list (#38), so
  // the thing with a radius to be rounded against the glass is the article.
  const card = await box(page.locator("article").first());
  // Asked of the shell rather than written down here: ADR-0025 gave the gutter
  // one name so it cannot end up with two values, and a literal in a spec file
  // would keep passing while the app moved.
  const gutter = await gutterOf(page);

  // A 16px radius has nothing to be rounded against when the card runs edge to
  // edge (#36). The gutter is the same on both sides or it is not a gutter.
  expect(card.x).toBeCloseTo(gutter, 0);
  expect(card.x + card.width).toBeCloseTo(viewport.width - gutter, 0);
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
