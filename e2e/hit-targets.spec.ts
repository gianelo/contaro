import { expect, test, type Page } from "./fixtures";
import { createMember, createSpaceFor, startSession } from "./session";
import { createDatabase, databaseUrl } from "../src/db/connection";
import { inviteToSpaceByEmail } from "../src/db/invitations";
import type { Space } from "../src/domain/space/space";

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

  // The way out, the four tabs and the raised button between them, the two
  // steps of the month the plan is read in, the two ways to plan an item -- a
  // Variable one (#10) and a Fixed one (#13) -- and the row to who shares this
  // Space (#9). The plan itself is empty on a Space this new, and an empty
  // state is a line of words rather than something to tap; so is a month with
  // no Fixed items, which draws no Fijos section at all.
  expect(inside.count).toBe(11);
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

  // The way out, the four tabs and the raised button, and the way to a new
  // Category. The rows themselves are not links yet: #7 gives a Category
  // somewhere to lead.
  expect(catalogue.count).toBe(7);
  expect(catalogue.undersized).toEqual([]);

  await page.goto(`/espacios/${space.id}/categorias/nueva`);
  const form = await undersizedTargets(page);

  // The same seven, plus the name field, the picker and the submit -- a form
  // filled with one hand at a till has to be reachable with one thumb.
  expect(form.count).toBe(10);
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

test("every target on the screen that shares a Space is at least 44px", async ({
  page,
  context,
  baseURL,
}) => {
  const member = await createMember("Sara Comparte");
  const space = await createSpaceFor(member.id, "Casa", "ARS");
  await startSession(context, baseURL!, member);

  // The seat free: the form that offers it is on the screen.
  await page.goto(`/espacios/${space.id}/miembros`);
  const offering = await undersizedTargets(page);

  // The way out, the four tabs and the raised button, and the address field
  // with the button under it.
  expect(offering.count).toBe(8);
  expect(offering.undersized).toEqual([]);

  // The seat held: the form is gone and the way to free it is there instead.
  await invite(space, member.id, "invitada@example.com");
  await page.reload();
  const holding = await undersizedTargets(page);

  // The way out, the four tabs and the raised button, and Cancelar.
  expect(holding.count).toBe(7);
  expect(holding.undersized).toEqual([]);
});

test("every target on an invitation waiting on the list is at least 44px", async ({
  page,
  context,
  baseURL,
}) => {
  const sender = await createMember("Tere Invita");
  const invited = await createMember("Uli Espera");
  const space = await createSpaceFor(sender.id, "Casa", "ARS");
  await invite(space, sender.id, invited.email);

  await startSession(context, baseURL!, invited);
  await page.goto("/espacios");
  const { undersized, count } = await undersizedTargets(page);

  // The way out, the empty-state button -- Uli is in no Space yet -- and the
  // two answers the invitation offers.
  expect(count).toBe(4);
  expect(undersized).toEqual([]);
});

/**
 * A seat offered, written the way the product writes one. Building it through
 * the form would spend a page load to prove something `invitations.spec.ts`
 * already proves; this spec is about what a thumb can hit.
 */
async function invite(space: Space, invitedBy: string, email: string) {
  const { db, sql } = createDatabase(databaseUrl(), { max: 1 });
  try {
    await inviteToSpaceByEmail(db, { space, invitedBy }, email);
  } finally {
    await sql.end();
  }
}
