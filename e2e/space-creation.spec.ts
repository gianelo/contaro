import { expect, test } from "@playwright/test";
import { createMember, startSession } from "./session";
import { readableCurrencies } from "../src/i18n/currency";
import { t } from "../src/i18n";

// Deliberately not the signed-in fixture: creating a Space writes a membership
// row, so the session has to belong to a Member the database really has.

test("a Member creates a Space and lands inside it", async ({
  page,
  context,
  baseURL,
}) => {
  await startSession(context, baseURL!, await createMember("Ana Crea"));

  await page.goto("/");
  await page.getByRole("link", { name: "Crear espacio" }).click();

  await expect(page).toHaveURL(/\/espacios\/nuevo$/);

  await page.getByLabel("Nombre").fill("Casa");
  await page.getByLabel("Moneda").selectOption("ARS");
  await page.getByRole("button", { name: "Crear el espacio" }).click();

  await expect(page).toHaveURL(
    /\/espacios\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
  );
  // It lands on the Budget screen, which names itself and says which Space it
  // is showing on the line under the title (#40).
  await expect(
    page.getByRole("heading", { name: "Presupuesto", level: 1 }),
  ).toBeVisible();
  await expect(page.getByText(/^Casa · /)).toBeVisible();
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

test("a Space with no currency chosen is not created", async ({
  page,
  context,
  baseURL,
}) => {
  await startSession(context, baseURL!, await createMember("Eze Sinmoneda"));

  await page.goto("/espacios/nuevo");
  await page.getByLabel("Nombre").fill("Casa");

  const picker = page.getByLabel("Moneda");

  // The picker starts on nothing: ADR-0012 says a default would answer, for
  // whoever does not look, a question ADR-0001 makes unaskable again.
  await expect(picker).toHaveValue("");

  await page.getByRole("button", { name: "Crear el espacio" }).click();

  // The URL alone would prove nothing — it was already this before the click.
  // What is asserted is that the browser itself refuses the submission, which
  // is only true because the unchosen option carries no value.
  const submittable = await picker.evaluate((el: HTMLSelectElement) =>
    el.checkValidity(),
  );

  expect(submittable).toBe(false);
  await expect(page).toHaveURL(/\/espacios\/nuevo$/);
});

test("the picker offers the currencies by name, in the order they are read", async ({
  page,
  context,
  baseURL,
}) => {
  await startSession(context, baseURL!, await createMember("Fer Lista"));

  await page.goto("/espacios/nuevo");

  const options = await page
    .getByLabel("Moneda")
    .locator("option")
    .allTextContents();

  // Derived and not written out, because ADR-0012 says the eleventh currency
  // is three edits: a test that lists them all would quietly make it four.
  // What this proves is that the browser really shows what i18n decided —
  // the order itself is pinned in src/i18n/currency.test.ts.
  expect(options).toEqual([
    t("space.new.currency.none"),
    ...readableCurrencies().map((currency) => currency.label),
  ]);
  expect(options).toContain("Peso colombiano (COP)");
});

// These two end on a formatted amount, and the separators are the reader's
// now (ADR-0014). Naming the conventions is what keeps the assertions about
// the Space's currency rather than about Playwright's default locale.
test.describe("a Member who reads numbers the Argentine way", () => {
  test.use({ locale: "es-AR" });

  test("in Colombian pesos, shows its amounts without centavos", async ({
    page,
    context,
    baseURL,
  }) => {
    await startSession(context, baseURL!, await createMember("Gabi Bogota"));

    await page.goto("/espacios/nuevo");
    await page.getByLabel("Nombre").fill("Bogotá");
    await page.getByLabel("Moneda").selectOption("COP");
    await page.getByRole("button", { name: "Crear el espacio" }).click();

    await expect(page.getByText("Peso colombiano (COP)")).toBeVisible();
    await expect(page.getByRole("region", { name: "Este mes" })).toContainText(
      "COP 0",
    );
  });

  test("is shown amounts in the Space's currency, never in their own", async ({
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
    await expect(page.getByRole("region", { name: "Este mes" })).toContainText(
      "US$ 0,00",
    );
  });
});

/**
 * Where a request comes from only ever sorts the picker (ADR-0013). Vercel
 * sets this header in production; Playwright sets it here, which is what makes
 * "a person in Bogotá" testable without a VPN.
 */
test.describe("a request from Colombia", () => {
  test.use({ extraHTTPHeaders: { "x-vercel-ip-country": "CO" } });

  test("sees Colombian pesos first, with the rest still alphabetical", async ({
    page,
    context,
    baseURL,
  }) => {
    await startSession(context, baseURL!, await createMember("Hugo Bogota"));

    await page.goto("/espacios/nuevo");

    const picker = page.getByLabel("Moneda");
    const options = await picker.locator("option").allTextContents();

    expect(options).toEqual([
      t("space.new.currency.none"),
      ...readableCurrencies("COP").map((currency) => currency.label),
    ]);
    // The code and not the name, so this says "COP is offered first" once
    // rather than restating a label the suite already pins elsewhere.
    await expect(picker.locator("option").nth(1)).toHaveAttribute(
      "value",
      "COP",
    );
  });

  test("still chooses nothing on its own", async ({
    page,
    context,
    baseURL,
  }) => {
    await startSession(context, baseURL!, await createMember("Ines Bogota"));

    await page.goto("/espacios/nuevo");

    // The whole point of the ticket: the list moved, the answer did not.
    await expect(page.getByLabel("Moneda")).toHaveValue("");
  });
});

test.describe("a request from a country whose currency contaro does not offer", () => {
  test.use({ extraHTTPHeaders: { "x-vercel-ip-country": "JP" } });

  test("gets the alphabetical list, and nothing fails", async ({
    page,
    context,
    baseURL,
  }) => {
    await startSession(context, baseURL!, await createMember("Jime Tokio"));

    await page.goto("/espacios/nuevo");

    const picker = page.getByLabel("Moneda");
    const options = await picker.locator("option").allTextContents();

    expect(options).toEqual([
      t("space.new.currency.none"),
      ...readableCurrencies().map((currency) => currency.label),
    ]);
    await expect(picker).toHaveValue("");
  });
});
