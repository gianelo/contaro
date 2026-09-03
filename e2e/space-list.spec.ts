import { expect, test } from "@playwright/test";
import {
  createMember,
  createSpaceFor,
  joinSpace,
  startSession,
} from "./session";

// Deliberately not the signed-in fixture: a list of Spaces needs a session
// belonging to a Member the database really has.

test("a Member lands on the list of the Spaces they belong to", async ({
  page,
  context,
  baseURL,
}) => {
  const ana = await createMember("Ana Lista");
  await createSpaceFor(ana.id, "Casa de Ana", "ARS");
  await createSpaceFor(ana.id, "Viaje de Ana", "USD");
  await startSession(context, baseURL!, ana);

  await page.goto("/");

  await expect(page).toHaveURL(/\/espacios$/);
  await expect(page.getByRole("link", { name: "Casa de Ana" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Viaje de Ana" })).toBeVisible();

  // The page title says "Espacios"; the list's own heading does not say it a
  // second time. It is still there to name the group for a screen reader, so
  // this measures the box rather than looking for the word.
  const title = await page
    .getByRole("heading", { name: "Espacios", level: 1 })
    .boundingBox();
  const groupHeading = await page
    .getByRole("heading", { name: "Espacios", level: 2 })
    .boundingBox();

  expect(title!.height).toBeGreaterThan(1);
  expect(groupHeading!.height).toBeLessThanOrEqual(1);
  await expect(page.getByRole("group", { name: "Espacios" })).toBeAttached();
});

test("each row names who is in the Space and what money it holds", async ({
  page,
  context,
  baseURL,
}) => {
  const beto = await createMember("Beto Fila");
  await createSpaceFor(beto.id, "Casa de Beto", "PYG");
  await startSession(context, baseURL!, beto);

  await page.goto("/espacios");

  const row = page.getByRole("link", { name: "Casa de Beto" });
  await expect(row).toContainText("Beto Fila");
  await expect(row).toContainText("PYG");
});

test("a shared Space names both Members, so it reads apart from a personal one", async ({
  page,
  context,
  baseURL,
}) => {
  const nadia = await createMember("Nadia Junta");
  const omar = await createMember("Omar Junta");
  const shared = await createSpaceFor(nadia.id, "Casa compartida", "ARS");
  await joinSpace(shared.id, omar.id);
  await createSpaceFor(nadia.id, "Personal de Nadia", "ARS");
  await startSession(context, baseURL!, nadia);

  await page.goto("/espacios");

  // The point of story 4 in #1: which is the pooled money and which is her
  // own, without opening either.
  await expect(
    page.getByRole("link", { name: "Casa compartida" }),
  ).toContainText("Nadia Junta · Omar Junta");
  await expect(
    page.getByRole("link", { name: "Personal de Nadia" }),
  ).toContainText("Nadia Junta");
  await expect(
    page.getByRole("link", { name: "Personal de Nadia" }),
  ).not.toContainText("Omar Junta");
});

test("a Member sees only the Spaces they belong to", async ({
  page,
  context,
  baseURL,
}) => {
  const cami = await createMember("Cami Propia");
  const dani = await createMember("Dani Ajena");
  await createSpaceFor(cami.id, "Casa de Cami", "ARS");
  await createSpaceFor(dani.id, "Casa de Dani", "ARS");
  await startSession(context, baseURL!, cami);

  await page.goto("/espacios");

  await expect(page.getByRole("link", { name: "Casa de Cami" })).toBeVisible();
  await expect(page.getByText("Casa de Dani")).toHaveCount(0);
});

test("a Space is not found by someone who is not in it, identifier and all", async ({
  page,
  context,
  baseURL,
}) => {
  const eli = await createMember("Eli Curiosa");
  const fede = await createMember("Fede Reservado");
  const hidden = await createSpaceFor(fede.id, "Casa de Fede", "ARS");
  await startSession(context, baseURL!, eli);

  // Knowing the identifier is the whole point: it buys nothing.
  const response = await page.goto(`/espacios/${hidden.id}`);

  expect(response?.status()).toBe(404);
  await expect(page.getByText("Casa de Fede")).toHaveCount(0);

  // And no route inside it is a way around the front door either.
  const movements = await page.goto(`/espacios/${hidden.id}/movimientos`);
  expect(movements?.status()).toBe(404);
});

test("a Member switches between Spaces without signing out", async ({
  page,
  context,
  baseURL,
}) => {
  const gaby = await createMember("Gaby Cambia");
  await createSpaceFor(gaby.id, "Casa", "ARS");
  await createSpaceFor(gaby.id, "Viaje", "USD");
  await startSession(context, baseURL!, gaby);

  await page.goto("/espacios");
  await page.getByRole("link", { name: "Casa" }).click();
  await expect(page.getByText("Peso argentino (ARS)")).toBeVisible();

  await page.getByRole("link", { name: "Espacios" }).click();
  await expect(page).toHaveURL(/\/espacios$/);
  await page.getByRole("link", { name: "Viaje" }).click();

  await expect(page.getByText("Dólar estadounidense (USD)")).toBeVisible();
  // Still the same session throughout: switching is navigation, not a new
  // sign-in.
  await expect(page.getByRole("region", { name: "Tu sesión" })).toContainText(
    "Gaby Cambia",
  );
});

test("two Spaces of the same Member never show each other's money", async ({
  page,
  context,
  baseURL,
}) => {
  const hugo = await createMember("Hugo Aparte");
  const pesos = await createSpaceFor(hugo.id, "Casa", "ARS");
  const dolares = await createSpaceFor(hugo.id, "Viaje", "USD");
  await startSession(context, baseURL!, hugo);

  await page.goto(`/espacios/${pesos.id}`);
  await expect(page.getByRole("group", { name: "Este mes" })).toContainText(
    "$ 0,00",
  );
  await expect(page.getByText("Dólar estadounidense")).toHaveCount(0);

  await page.goto(`/espacios/${dolares.id}`);
  await expect(page.getByRole("group", { name: "Este mes" })).toContainText(
    "US$ 0,00",
  );
  await expect(page.getByText("Peso argentino")).toHaveCount(0);
});

test("the tab bar inside a Space stays inside that Space", async ({
  page,
  context,
  baseURL,
}) => {
  const ines = await createMember("Ines Navega");
  const space = await createSpaceFor(ines.id, "Casa", "ARS");
  await startSession(context, baseURL!, ines);

  await page.goto(`/espacios/${space.id}`);
  await page.getByRole("link", { name: "Movimientos" }).click();

  await expect(page).toHaveURL(new RegExp(`/espacios/${space.id}/movimientos$`));
  await expect(
    page.getByRole("link", { name: "Movimientos" }),
  ).toHaveAttribute("aria-current", "page");
  await expect(
    page.getByRole("heading", { name: "Casa", level: 1 }),
  ).toBeVisible();
});
