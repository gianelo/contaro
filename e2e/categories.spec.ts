import { expect, test, type BrowserContext } from "@playwright/test";
import { createMember, createSpaceFor, startSession } from "./session";

// Deliberately not the signed-in fixture: a catalogue needs a session
// belonging to a Member the database really has.

/** A signed-in Member with a Space of their own, the way #4 makes one. */
async function aMemberWithASpace(
  name: string,
  context: BrowserContext,
  baseURL: string,
) {
  const member = await createMember(name);
  const space = await createSpaceFor(member.id, `Casa de ${name}`, "ARS");
  await startSession(context, baseURL, member);
  return { member, space };
}

test("a Space is born with the whole catalogue, having recorded nothing", async ({
  page,
  context,
  baseURL,
}) => {
  const { space } = await aMemberWithASpace("Ana Cat", context, baseURL!);

  await page.goto(`/espacios/${space.id}/categorias`);

  // Story 12 in #1: nobody has to invent a taxonomy before recording anything.
  await expect(page.getByRole("group", { name: "Comida" })).toBeVisible();
  await expect(page.getByText("Supermercado")).toBeVisible();
  await expect(
    page.getByRole("group", { name: "Sin subcategorías" }),
  ).toContainText("Otros");
});

test("a Category holds its subcategories under it", async ({
  page,
  context,
  baseURL,
}) => {
  const { space } = await aMemberWithASpace("Beto Sub", context, baseURL!);

  await page.goto(`/espacios/${space.id}/categorias`);

  const food = page.getByRole("group", { name: "Comida" });
  await expect(food).toContainText("Supermercado");
  await expect(food).toContainText("Restaurantes y delivery");

  // And a subcategory is under its heading rather than beside it.
  await expect(
    page.getByRole("group", { name: "Sin subcategorías" }),
  ).not.toContainText("Supermercado");
});

test("a Member adds a Category their Space needs and the catalogue lacks", async ({
  page,
  context,
  baseURL,
}) => {
  const { space } = await aMemberWithASpace("Cami Agrega", context, baseURL!);

  await page.goto(`/espacios/${space.id}/categorias`);
  await page.getByRole("link", { name: "Agregar una categoría" }).click();

  await page.getByLabel("Nombre").fill("Mate");
  await page.getByRole("button", { name: "Agregar la categoría" }).click();

  await expect(page).toHaveURL(
    new RegExp(`/espacios/${space.id}/categorias$`),
  );
  const alone = page.getByRole("group", { name: "Sin subcategorías" });
  await expect(alone).toContainText("Mate");
  // Marked as theirs, so a Space's own naming reads apart from what shipped.
  await expect(alone).toContainText("Tuya");
});

test("a Member hangs their own Category under one that shipped", async ({
  page,
  context,
  baseURL,
}) => {
  const { space } = await aMemberWithASpace("Dani Panadera", context, baseURL!);

  await page.goto(`/espacios/${space.id}/categorias/nueva`);
  await page.getByLabel("Nombre").fill("Panadería");
  await page.getByLabel("Va dentro de").selectOption({ label: "Comida" });
  await page.getByRole("button", { name: "Agregar la categoría" }).click();

  // Story 15 in #1: the bakery is a kind of food, not a heading of its own.
  await expect(page.getByRole("group", { name: "Comida" })).toContainText(
    "Panadería",
  );
});

test("the picker never offers a subcategory as a place to put another", async ({
  page,
  context,
  baseURL,
}) => {
  const { space } = await aMemberWithASpace("Eli Plana", context, baseURL!);

  await page.goto(`/espacios/${space.id}/categorias/nueva`);

  const parent = page.getByLabel("Va dentro de");
  await expect(parent).toContainText("Comida");
  // Two levels and no more (#6), so what already sits under something is not
  // offered as somewhere to sit under.
  await expect(parent).not.toContainText("Supermercado");
});

test("a Category added in one Space is invisible from another", async ({
  page,
  context,
  baseURL,
}) => {
  const fede = await createMember("Fede Privado");
  const hers = await createSpaceFor(fede.id, "Casa", "ARS");
  const his = await createSpaceFor(fede.id, "Viaje", "USD");
  await startSession(context, baseURL!, fede);

  await page.goto(`/espacios/${hers.id}/categorias/nueva`);
  await page.getByLabel("Nombre").fill("Mate del sur");
  await page.getByRole("button", { name: "Agregar la categoría" }).click();
  await expect(page.getByText("Mate del sur")).toBeVisible();

  // Story 14 in #1: private naming does not leak, not even to the same
  // person's other Space.
  await page.goto(`/espacios/${his.id}/categorias`);
  await expect(page.getByText("Mate del sur")).toHaveCount(0);
  await expect(page.getByRole("group", { name: "Comida" })).toBeVisible();
});

test("another Member's catalogue is not reachable, identifier and all", async ({
  page,
  context,
  baseURL,
}) => {
  const gaby = await createMember("Gaby Curiosa");
  const hugo = await createMember("Hugo Reservado");
  const hidden = await createSpaceFor(hugo.id, "Casa de Hugo", "ARS");
  await startSession(context, baseURL!, gaby);

  const catalogue = await page.goto(`/espacios/${hidden.id}/categorias`);
  expect(catalogue?.status()).toBe(404);

  const form = await page.goto(`/espacios/${hidden.id}/categorias/nueva`);
  expect(form?.status()).toBe(404);
});

test("a name the Space already uses is refused, and says so", async ({
  page,
  context,
  baseURL,
}) => {
  const { space } = await aMemberWithASpace("Ines Repite", context, baseURL!);

  await page.goto(`/espacios/${space.id}/categorias/nueva`);
  await page.getByLabel("Nombre").fill("Mate");
  await page.getByRole("button", { name: "Agregar la categoría" }).click();
  await expect(page.getByText("Mate")).toBeVisible();

  await page.goto(`/espacios/${space.id}/categorias/nueva`);
  await page.getByLabel("Nombre").fill("mate");
  await page.getByRole("button", { name: "Agregar la categoría" }).click();

  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page).toHaveURL(/\/categorias\/nueva$/);
});

test("the catalogue is read on a phone without scrolling sideways", async ({
  page,
  context,
  baseURL,
}) => {
  const { space } = await aMemberWithASpace("Juli Teléfono", context, baseURL!);

  await page.goto(`/espacios/${space.id}/categorias`);
  await expect(page.getByRole("group", { name: "Comida" })).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );

  expect(overflow).toBeLessThanOrEqual(0);
});
