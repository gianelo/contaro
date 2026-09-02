import { expect, test } from "@playwright/test";
import { createMember, startSession } from "./session";

// Deliberately not the signed-in fixture: creating a Space writes a membership
// row, so the session has to belong to a Member the database really has.

test("a Member creates a Space and lands inside it", async ({
  page,
  context,
  baseURL,
}) => {
  await startSession(context, baseURL!, await createMember("Ana Crea"));

  await page.goto("/");
  await page.getByRole("link", { name: "Crear un espacio" }).click();

  await expect(page).toHaveURL(/\/espacios\/nuevo$/);

  await page.getByLabel("Nombre").fill("Casa");
  await page.getByLabel("Moneda").selectOption("ARS");
  await page.getByRole("button", { name: "Crear el espacio" }).click();

  await expect(page).toHaveURL(
    /\/espacios\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
  );
  await expect(
    page.getByRole("heading", { name: "Casa", level: 1 }),
  ).toBeVisible();
});

test("the creation screen says the currency can never be changed", async ({
  page,
  context,
  baseURL,
}) => {
  await startSession(context, baseURL!, await createMember("Beto Lee"));

  await page.goto("/espacios/nuevo");

  await expect(page.getByRole("note")).toContainText(
    "La moneda no se puede cambiar nunca",
  );
});

test("a Space without a name is not created", async ({
  page,
  context,
  baseURL,
}) => {
  await startSession(context, baseURL!, await createMember("Cami Vacia"));

  await page.goto("/espacios/nuevo");
  await page.getByRole("button", { name: "Crear el espacio" }).click();

  // The browser refuses the submission itself; the domain refuses it again if
  // anything ever gets past that (see src/domain/space/space.test.ts).
  await expect(page).toHaveURL(/\/espacios\/nuevo$/);
});

test("amounts inside a Space are shown in that Space's currency", async ({
  page,
  context,
  baseURL,
}) => {
  await startSession(context, baseURL!, await createMember("Dani Dolar"));

  await page.goto("/espacios/nuevo");
  await page.getByLabel("Nombre").fill("Viaje");
  await page.getByLabel("Moneda").selectOption("USD");
  await page.getByRole("button", { name: "Crear el espacio" }).click();

  await expect(page.getByText("Dólar estadounidense (USD)")).toBeVisible();

  // Nothing is recorded yet (#7), but the figure that is there is already
  // denominated in the Space's money and not in the reader's.
  await expect(page.getByRole("group", { name: "Este mes" })).toContainText(
    "US$ 0,00",
  );
});
