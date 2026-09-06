import { type BrowserContext, devices } from "@playwright/test";
import { expect, test } from "./fixtures";
import { createMember, createSpaceFor, startSession } from "./session";
import { box, gutterOf, measureOf } from "./layout";

/**
 * The ceiling the app used to carry, and the reason #75 exists.
 *
 * Frozen history rather than a live number, which is why it may sit here as a
 * literal at all: what 390 names is the ceiling that was removed, and that
 * cannot move again. The ceiling in force is read off the running app through
 * `measureOf`, the way every other number in this suite is.
 */
const OLD_CEILING = 390;

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

test.describe("on a phone wider than the artboard", () => {
  // The gap #75 was hiding in. The suite pinned the width at 390 and at 1280 --
  // the one width where the ceiling and the screen edge are the same number,
  // and the one where centring is what is wanted -- and every phone shipped
  // since 2021 lives between them, drawing the app as a 390px column with dead
  // background down both sides.
  //
  // 440px, and the viewport alone: ADR-0025 keeps the emulated device a phone
  // because the run matrix says the product is mobile-first, and a question
  // about CSS width needs nothing else. The device is named rather than
  // measured so a reader knows whose screen this is -- #75 opens on this one,
  // an iPhone 16 Pro Max throwing away 50px of screen on each side. That the
  // ceiling clears every *other* handset too is a question about a number
  // rather than about a browser, and src/ui/width.source.test.ts asks it.
  test.use({ viewport: devices["iPhone 16 Pro Max"].viewport });

  test("the app fills the screen rather than sitting in dead bars", async ({
    page,
    context,
    baseURL,
  }) => {
    const space = await aSpaceToLookAt(context, baseURL!);

    await page.goto(`/espacios/${space.id}`);

    const viewport = page.viewportSize()!;
    const main = await box(page.getByRole("main"));

    // The premise of this whole block, asserted rather than assumed: a phone
    // Playwright silently renarrowed would leave these two tests passing
    // green over the exact width that hid #75 for four device generations.
    expect(viewport.width).toBeGreaterThan(OLD_CEILING);
    expect(viewport.width).toBeLessThanOrEqual(await measureOf(page));

    expect(main.x).toBeCloseTo(0, 0);
    expect(main.width).toBeCloseTo(viewport.width, 0);
  });

  test("the tab bar reaches both edges of the screen", async ({
    page,
    context,
    baseURL,
  }) => {
    const space = await aSpaceToLookAt(context, baseURL!);

    await page.goto(`/espacios/${space.id}`);

    const viewport = page.viewportSize()!;
    const bar = await box(page.getByRole("navigation", { name: "Principal" }));

    // What the phone actually shows, and what #75 was reported from: the bar
    // stopping short of both edges, read as double padding -- first the dead
    // bar the ceiling left, then the 16px gutter inside it.
    expect(bar.x).toBeCloseTo(0, 0);
    expect(bar.x + bar.width).toBeCloseTo(viewport.width, 0);
  });
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
    // Asked of the app for the same reason the gutter is. The ceiling moved
    // once already (#75); a literal here would have kept passing while it did.
    const measure = await measureOf(page);

    expect(main.width).toBeCloseTo(measure, 0);
    // Centred: the same amount of monitor left over on each side.
    expect(main.x).toBeCloseTo((viewport.width - measure) / 2, 0);
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
    const measure = await measureOf(page);

    // Its border-top is the line that shows how wide the app is. Run across a
    // 27-inch monitor it draws a rule under a far narrower column.
    expect(bar.width).toBeCloseTo(measure, 0);
    expect(bar.x).toBeCloseTo((viewport.width - measure) / 2, 0);
  });
});
