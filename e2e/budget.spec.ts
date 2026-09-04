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

/**
 * The Category, answered the way the picker asks (#45): the heading first,
 * and what it holds only if something more precise is wanted.
 */
async function categorise(page: Page, heading: string, under?: string) {
  // Exact, because a heading's name is the start of every name under it:
  // "Comida" is a substring of "Supermercado, Comida".
  await page.getByRole("radio", { name: heading, exact: true }).click();
  if (under !== undefined) {
    await page.getByRole("radio", { name: `${under}, ${heading}` }).click();
  }
}

/** One Variable item, planned the way a person plans one. */
async function plan(page: Page, spaceId: string, digits: string) {
  await page.getByRole("link", { name: "Agregar un ítem" }).click();
  await type(page, digits);
  // The same two steps the entry screen asks for, because it is the same
  // question: picking a Category (#45).
  await categorise(page, "Comida", "Supermercado");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page).toHaveURL(new RegExp(`/espacios/${spaceId}\\?mes=`));
}

/** One expense, recorded the way a person records one on the way home. */
async function spend(page: Page, spaceId: string, digits: string) {
  await page.goto(`/espacios/${spaceId}/movimientos`);
  await page.getByRole("link", { name: "Anotar un movimiento" }).click();
  await type(page, digits);
  await categorise(page, "Comida", "Supermercado");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page).toHaveURL(
    new RegExp(`/espacios/${spaceId}/movimientos\\?mes=`),
  );
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

test("correcting an item opens on the branch its Category sits in", async ({
  page,
  context,
  baseURL,
}) => {
  const { space } = await aMemberWithASpace("Bruno Repasa", context, baseURL!);

  await page.goto(`/espacios/${space.id}`);
  await plan(page, space.id, "24000000");

  const budget = page.getByRole("group", { name: "El plan del mes" });
  await budget.getByRole("link", { name: /Supermercado/ }).click();

  // The same picker the entry screen asks with, opened the same way: on the
  // branch the saved Category sits in, with the Category itself chosen.
  await expect(
    page.getByRole("radio", { name: "Supermercado, Comida" }),
  ).toBeChecked();
  await expect(
    page.getByRole("group", { name: "¿Algo más preciso?" }),
  ).toBeVisible();
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
  await expect(page.getByRole("group", { name: "Variables" })).toContainText(
    "/ 240.000,00",
  );
});

test("a Member is told when a Category has passed what it expected", async ({
  page,
  context,
  baseURL,
}) => {
  const { space } = await aMemberWithASpace("Euge Se Pasa", context, baseURL!);

  await page.goto(`/espacios/${space.id}`);
  await plan(page, space.id, "40000000");

  const variables = page.getByRole("group", { name: "Variables" });
  // Planned and nothing spent yet: the comparison is a figure, not a blank.
  await expect(variables).toContainText("/ 400.000,00");

  // Three shops, each of them comfortably inside a plan of four hundred
  // thousand. Nothing here refuses any of them: the Budget measures what a
  // month cost and never blocks a Movement from being recorded.
  await spend(page, space.id, "15000000");
  await spend(page, space.id, "15000000");
  await spend(page, space.id, "15000000");

  await page.goto(`/espacios/${space.id}`);

  // And the month is fifty thousand over, which no single one of them was.
  // Said in words as well as in red, so somebody who cannot see the colour
  // is told too.
  await expect(variables).toContainText("Te pasaste $ 50.000,00");

  // Correcting the last one back down puts the Category inside its plan
  // again: the comparison is read off the Movements every time and never
  // carried along beside them.
  await page.goto(`/espacios/${space.id}/movimientos`);
  await page.getByRole("link", { name: /Supermercado/ }).first().click();
  await page.getByRole("button", { name: "Borrar el último número" }).click();
  await page.getByRole("button", { name: "Guardar los cambios" }).click();
  // Waited for rather than navigated over: the correction lands on a server
  // action, and leaving for another screen in the same breath abandons it.
  await expect(page).toHaveURL(/\/movimientos\?mes=/);

  await page.goto(`/espacios/${space.id}`);
  await expect(variables).not.toContainText("Te pasaste");
  await expect(variables).toContainText("$ 315.000,00 / 400.000,00");

  // And deleting one takes its money back out of the comparison too. A
  // struck Movement stops counting towards every figure (ADR-0015), and this
  // is one of the figures.
  await page.goto(`/espacios/${space.id}/movimientos`);
  await page.getByRole("link", { name: /Supermercado/ }).first().click();
  await page.getByRole("button", { name: "Borrar el movimiento" }).click();
  await page.getByRole("button", { name: "Sí, borralo" }).click();
  await expect(page).toHaveURL(/\/movimientos\?mes=/);

  await page.goto(`/espacios/${space.id}`);
  await expect(variables).toContainText("$ 300.000,00 / 400.000,00");
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

/** One Fixed item, planned the way a person plans the rent. */
async function planFixed(
  page: Page,
  spaceId: string,
  name: string,
  digits: string,
  dueDay: string,
) {
  await page.getByRole("link", { name: "Agregar un fijo" }).click();
  await type(page, digits);
  await page.getByLabel("Cómo se llama").fill(name);
  await page.getByLabel("Qué día del mes vence").selectOption(dueDay);
  await categorise(page, "Hogar", "Alquiler");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page).toHaveURL(new RegExp(`/espacios/${spaceId}\\?mes=`));
}

test("a Member plans the rent and marks it paid", async ({
  page,
  context,
  baseURL,
}) => {
  const { space } = await aMemberWithASpace("Gian Paga", context, baseURL!);

  await page.goto(`/espacios/${space.id}`);

  // A month with no Fixed items has no section at all: an empty heading over
  // nothing is a promise the plan has not made yet.
  await expect(page.getByRole("group", { name: "Fijos" })).toHaveCount(0);

  await planFixed(page, space.id, "Arriendo", "180000000", "1");

  const fijos = page.getByRole("group", { name: "Fijos" });
  await expect(fijos).toContainText("Arriendo");
  await expect(fijos).toContainText("$ 1.800.000,00");
  // Pending in words, and never in a colour alone.
  await expect(fijos).toContainText("Pendiente");

  // A month with the rent on it and nothing else has been planned. It used to
  // say "Todavía no planeaste este mes." and show no total at all, because the
  // empty state and the total were both asked of the Variable half alone.
  await expect(page.getByText("Todavía no planeaste este mes.")).toHaveCount(0);
  const budget = page.getByRole("group", { name: "El plan del mes" });
  await expect(budget).toContainText("Planeado");
  await expect(budget).toContainText("$ 1.800.000,00");

  // Both kinds add into the month's total, which is the total of exactly the
  // rows above it (#13).
  await plan(page, space.id, "24000000");
  await expect(budget).toContainText("$ 2.040.000,00");

  // Marking it paid confirms first, because it brings money into existence in
  // the ledger -- and the recap names the Space the money lands in and whose
  // it will be, the two things a stray tap would get wrong.
  await fijos.getByRole("button", { name: /Arriendo/ }).click();

  const sheet = page.getByRole("dialog");
  await expect(sheet).toContainText("¿Marcar Arriendo como pagado?");
  await expect(sheet).toContainText("Espacio");
  await expect(sheet).toContainText("Registrado por");
  await expect(sheet).toContainText("Atribuido a");

  await sheet.getByRole("button", { name: "Marcar pagado" }).click();

  await expect(page).toHaveURL(new RegExp(`/espacios/${space.id}\\?mes=`));
  await expect(fijos).toContainText("Pagado");

  // Exactly one Movement, for its amount and its Category, carrying who typed
  // it in like any other. Counted as rows in the ledger rather than as
  // sightings of the figure: the month's total says $1.800.000 too, and it
  // says it because of this one row.
  await page.goto(`/espacios/${space.id}/movimientos`);
  // The rows themselves, which are links to one Movement each. The way to
  // record another one lives under the same path, so it is excluded by name
  // rather than by URL shape.
  const rows = page
    .locator(`a[href*="/espacios/${space.id}/movimientos/"]`)
    .filter({ hasNotText: "Anotar" });
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("Alquiler");
  await expect(rows.first()).toContainText("$ 1.800.000,00");

  // And the row has nothing left to do to it: a paid item is not a button.
  await page.goto(`/espacios/${space.id}`);
  await expect(fijos.getByRole("button", { name: /Arriendo/ })).toHaveCount(0);
});
