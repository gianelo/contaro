import { expect, test, type Page } from "./fixtures";
import { createMember, createSpaceFor, startSession } from "./session";

const MIN = 44;

/** Measures every element a finger can hit, in a real browser. */
async function undersizedTargets(page: Page) {
  const interactive = page.locator(
    "a:visible, button:visible, [role='button']:visible, input:visible, select:visible, textarea:visible, summary:visible",
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

test("every interactive element on the screen a Member lands on is at least 44px", async ({
  page,
}) => {
  await page.goto("/");
  const { undersized, count } = await undersizedTargets(page);

  // The list belongs to no Space, so it carries no tab bar (#5).
  expect(count).toBe(2); // the way out, and the empty-state button
  expect(undersized).toEqual([]);
});

test("every interactive element inside a Space is at least 44px", async ({
  page,
  context,
  baseURL,
}) => {
  // Over the fixture's session, which names a Member the database does not
  // have: rows on a screen need one it does.
  const member = await createMember("Nara Toca");
  const space = await createSpaceFor(member.id, "Casa", "ARS");
  await createSpaceFor(member.id, "Viaje", "USD");
  await startSession(context, baseURL!, member);

  await page.goto("/espacios");
  const list = await undersizedTargets(page);

  expect(list.count).toBe(4); // the way out, two Space rows, and the way to a new one
  expect(list.undersized).toEqual([]);

  await page.goto(`/espacios/${space.id}`);
  const inside = await undersizedTargets(page);

  expect(inside.count).toBe(5); // the way out and the four tabs
  expect(inside.undersized).toEqual([]);
});

test("every interactive element on a Space's catalogue is at least 44px", async ({
  page,
  context,
  baseURL,
}) => {
  const member = await createMember("Pili Toca");
  const space = await createSpaceFor(member.id, "Casa", "ARS");
  await startSession(context, baseURL!, member);

  await page.goto(`/espacios/${space.id}/categorias`);
  const catalogue = await undersizedTargets(page);

  // The way out, the four tabs, and the way to a new Category. The rows
  // themselves are not links yet: #7 gives a Category somewhere to lead.
  expect(catalogue.count).toBe(6);
  expect(catalogue.undersized).toEqual([]);

  await page.goto(`/espacios/${space.id}/categorias/nueva`);
  const form = await undersizedTargets(page);

  // The same six, plus the name field, the picker and the submit -- a form
  // filled with one hand at a till has to be reachable with one thumb.
  expect(form.count).toBe(9);
  expect(form.undersized).toEqual([]);
});

test("every base component is at least 44px, sheet included", async ({
  page,
}) => {
  await page.goto("/ui");
  await page.getByRole("button", { name: "Abrir la hoja" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();

  const { undersized, count } = await undersizedTargets(page);

  // Four buttons, an actionable list row, a text field, a picker, the scrim,
  // and the two sheet actions. If a component stops rendering, this catches it.
  expect(count).toBe(10);
  expect(undersized).toEqual([]);
});

test("every target on the screen an expense is recorded on is at least 44px", async ({
  page,
  context,
  baseURL,
}) => {
  const member = await createMember("Rita Toca");
  const space = await createSpaceFor(member.id, "Casa", "ARS");
  await startSession(context, baseURL!, member);

  await page.goto(`/espacios/${space.id}/movimientos/nuevo`);

  // Opened, so the day field is measured as well as the line that folds it
  // away. Everything on this screen is hit with one thumb at a till.
  await page.getByText("Cambiar").click();

  const { undersized } = await undersizedTargets(page);

  expect(undersized).toEqual([]);
});
