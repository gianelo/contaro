import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { createMember, createSpaceFor, startSession } from "./session";

// Deliberately not the signed-in fixture: planning money needs a session
// belonging to a Member the database really has.

// The Members here are Argentine, and `locale` is what sets `Accept-Language`,
// which is the whole input the separators are chosen from (ADR-0014). This
// file is about planning a month, so it fixes who is reading and stops asking.
test.use({ locale: "es-AR" });

/** A signed-in Member with a Space of their own, the way #4 makes one. */
async function aMemberWithASpace(
  name: string,
  context: BrowserContext,
  baseURL: string,
  currency = "ARS",
) {
  const member = await createMember(name);
  const space = await createSpaceFor(member.id, `Casa de ${name}`, currency);
  await startSession(context, baseURL, member);
  return { member, space };
}

/** Taps the amount in on the keypad, one number at a time, as a thumb does. */
async function type(page: Page, digits: string) {
  for (const digit of digits) {
    await page.getByRole("button", { name: digit, exact: true }).click();
  }
}

/** One Variable item, planned the way a person plans one. */
async function plan(page: Page, spaceId: string, digits: string) {
  await page.getByRole("link", { name: "Agregar un ítem" }).click();
  await type(page, digits);
  await page.getByRole("radio", { name: "Supermercado, Comida" }).click();
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page).toHaveURL(new RegExp(`/espacios/${spaceId}\\?mes=`));
}

test("a Member plans the month and reads it back", async ({
  page,
  context,
  baseURL,
}) => {
  const { space } = await aMemberWithASpace("Ana Planea", context, baseURL!);

  await page.goto(`/espacios/${space.id}`);

  // A month nobody has planned says what to do, not that there is nothing.
  // There is no Budget to create first: the first item is the plan.
  const budget = page.getByRole("group", { name: "El plan del mes" });
  await expect(budget).toContainText("Todavía no planeaste este mes.");

  await plan(page, space.id, "24000000");

  // The Category on the first line and the heading it sits under on the
  // second, the way the month's list writes a row.
  await expect(budget).toContainText("Supermercado");
  await expect(budget).toContainText("Comida");
  // The item, and the plan's total: the total of exactly the rows above it.
  await expect(budget).toContainText("Planeado");
  await expect(budget).toContainText("$ 240.000,00");
});

test("several items on one Category are read as one of their combined amount", async ({
  page,
  context,
  baseURL,
}) => {
  const { space } = await aMemberWithASpace("Beto Semanal", context, baseURL!);

  await page.goto(`/espacios/${space.id}`);

  // Four weeks of groceries, which is how a person plans a month they think
  // about in weeks. They stay four rows, so all four can still be corrected.
  await plan(page, space.id, "6000000");
  await plan(page, space.id, "6000000");
  await plan(page, space.id, "5500000");
  await plan(page, space.id, "6500000");

  const budget = page.getByRole("group", { name: "El plan del mes" });
  await expect(
    budget.getByRole("link", { name: /Supermercado/ }),
  ).toHaveCount(4);

  // And what the Category expects of the month is the four added up: one line
  // to be over or under, however many items make it.
  await expect(page.getByRole("group", { name: "Por categoría" })).toContainText(
    "$ 240.000,00",
  );
});

test("a Member plans next month before it starts", async ({
  page,
  context,
  baseURL,
}) => {
  const { space } = await aMemberWithASpace("Dani Adelanta", context, baseURL!);

  await page.goto(`/espacios/${space.id}`);

  // Forwards, which the month's list does not offer: a Movement is money that
  // already moved, and a plan is what a month is expected to cost.
  await page.getByRole("link", { name: "Mes siguiente" }).click();
  // The step is a client-side navigation, so the URL is read once it has
  // landed rather than in the same breath as the tap.
  await page.waitForURL(/\?mes=\d{4}-\d{2}$/);
  const next = new URL(page.url()).searchParams.get("mes")!;

  await plan(page, space.id, "9000000");
  await expect(page).toHaveURL(new RegExp(`\\?mes=${next}$`));

  const budget = page.getByRole("group", { name: "El plan del mes" });
  await expect(budget).toContainText("$ 90.000,00");

  // And this month is untouched by it.
  await page.getByRole("link", { name: "Mes anterior" }).click();
  await expect(budget).toContainText("Todavía no planeaste este mes.");
});

test("a Member corrects an item and takes another off the plan", async ({
  page,
  context,
  baseURL,
}) => {
  const { space } = await aMemberWithASpace("Cami Corrige", context, baseURL!);

  await page.goto(`/espacios/${space.id}`);
  await plan(page, space.id, "24000000");

  const budget = page.getByRole("group", { name: "El plan del mes" });
  await budget.getByRole("link", { name: /Supermercado/ }).click();

  // The keypad opens on what the item expects, so a correction is typed over
  // it rather than from nothing.
  await page.getByRole("button", { name: "Borrar el último número" }).click();
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(budget).toContainText("$ 24.000,00");

  await budget.getByRole("link", { name: /Supermercado/ }).click();
  await page.getByRole("button", { name: "Sacar del plan" }).click();

  await expect(budget).toContainText("Todavía no planeaste este mes.");
});
