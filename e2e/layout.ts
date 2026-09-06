import { expect, type Locator, type Page } from "@playwright/test";

/**
 * What something takes up on the glass.
 *
 * The e2e run is the only place in the product that does real layout, so it is
 * the only place that can answer a question about where things land. These are
 * the four numbers every such question is asked in.
 */
export type Box = { x: number; y: number; width: number; height: number };

export async function box(of: Locator): Promise<Box> {
  const measured = await of.boundingBox();

  // A visible element with no box cannot be measured at all, and saying so
  // beats a null dereference three lines later.
  if (!measured) throw new Error("the element has no box to measure");

  return measured;
}

/**
 * How far the app holds itself off the glass, asked of the app rather than
 * written down again here.
 *
 * ADR-0025 gave the gutter one name -- `--gutter`, itself `var(--space-8)` --
 * because "a value with two places to change it is a value that eventually
 * disagrees with itself". A `16` in a spec file is a second place, and a spec
 * file is the worst of them: it would keep passing while the app moved.
 *
 * Read off `main`, which is the element the shell puts the padding on
 * (`app-shell.module.css`), so the day the canvas moves the gutter every
 * assertion written against this moves with it.
 */
export async function gutterOf(page: Page) {
  const padding = await page
    .getByRole("main")
    .evaluate((main) => getComputedStyle(main).paddingLeft);

  return Number.parseFloat(padding);
}

/**
 * Two boxes sharing a single pixel are two things printed over each other.
 *
 * Measured on whatever carries the text, never on a column holding it: a
 * column allowed to shrink under its own content still reports a narrow box
 * while the content paints straight out of it, which is how a layout overlaps
 * without anything looking too wide.
 */
export function overlapping(a: Box, b: Box) {
  return (
    a.x < b.x + b.width &&
    b.x < a.x + a.width &&
    a.y < b.y + b.height &&
    b.y < a.y + a.height
  );
}

/**
 * None of this is behind the glass.
 *
 * A pixel of tolerance each side: a browser lays text out in fractions and the
 * gutter is a whole number, so an exact comparison would fail on a rounding
 * this is not about.
 */
export async function withinTheGutter(page: Page, measured: Box) {
  const gutter = await gutterOf(page);

  expect(measured.x).toBeGreaterThanOrEqual(gutter - 1);
  expect(measured.x + measured.width).toBeLessThanOrEqual(
    page.viewportSize()!.width - gutter + 1,
  );
}

/**
 * The 44px minimum touch size, asked of the app rather than written down again
 * here -- the same reason `gutterOf` reads the gutter off `main`.
 *
 * `--hit-target` is a root token (`ui/tokens.css`), and hit-target.module.css
 * is the one place that applies it. A `44` in a spec file would be a third
 * place, and it would keep passing while the app moved.
 */
export async function hitTargetOf(page: Page) {
  const size = await page
    .locator(":root")
    .evaluate((root) => getComputedStyle(root).getPropertyValue("--hit-target"));

  return Number.parseFloat(size);
}
