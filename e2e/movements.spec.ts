import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import {
  createMember,
  createSpaceFor,
  joinSpace,
  startSession,
} from "./session";

// Deliberately not the signed-in fixture: recording money needs a session
// belonging to a Member the database really has.

// The Members here are Argentine, and `locale` is what sets `Accept-Language`,
// which is the whole input the separators are chosen from (ADR-0014). Without
// it the phone reads en-US and an ARS amount is written "ARS 1,284.00" — which
// is correct, and is what e2e/reading-amounts.spec.ts is for. This file is
// about recording money, so it fixes who is reading and stops asking.
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

test("a Member records an expense in a few taps and finds it in the month", async ({
  page,
  context,
  baseURL,
}) => {
  const { space } = await aMemberWithASpace("Ana Gasta", context, baseURL!);

  await page.goto(`/espacios/${space.id}/movimientos`);
  await page.getByRole("link", { name: "Anotar un gasto" }).click();

  // Story 18 in #1: the amount first, on a large keypad, because it is the
  // only part a person might forget on the way home from the till.
  await type(page, "128400");
  // Story 19: the Category is one tap from a short list.
  await page.getByRole("radio", { name: "Supermercado, Comida" }).click();
  await page.getByRole("button", { name: "Guardar" }).click();

  await expect(page).toHaveURL(
    new RegExp(`/espacios/${space.id}/movimientos\\?mes=`),
  );

  const movements = page.getByRole("group", { name: "Movimientos" });
  await expect(movements).toContainText("Supermercado");
  // es-AR puts a space between the symbol and the figure, and it is a
  // non-breaking one. The regex is about not asserting a space character
  // Intl chose, not about being vague: symbol, then that exact figure.
  await expect(movements).toContainText(/\$\s?1\.284,00/);
  await expect(movements).toContainText("Hoy");
});

test("the amount reads as money while it is being typed", async ({
  page,
  context,
  baseURL,
}) => {
  const { space } = await aMemberWithASpace("Beto Teclea", context, baseURL!);

  await page.goto(`/espacios/${space.id}/movimientos/nuevo`);

  const amount = page.getByRole("status");
  await expect(amount).toHaveText(/^\$\s?0,00$/);

  await type(page, "1284");
  // ADR-0014: the separators are the reader's, the currency is the Space's.
  // What a person watches themselves type is what they read back afterwards.
  await expect(amount).toContainText("12,84");

  await page.getByRole("button", { name: "Borrar el último número" }).click();
  await expect(amount).toContainText("1,28");
});

test("what the month has cost is the sum of what was recorded", async ({
  page,
  context,
  baseURL,
}) => {
  const { space } = await aMemberWithASpace("Cami Suma", context, baseURL!);
  const record = async (digits: string) => {
    await page.goto(`/espacios/${space.id}/movimientos/nuevo`);
    await type(page, digits);
    await page.getByRole("radio", { name: "Otros" }).click();
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page).toHaveURL(/\/movimientos\?mes=/);
  };

  await record("100000");
  await record("50000");

  // On the Budget tab, which is where the figure has always been: the totals
  // on the month's list itself belong to #8.
  await page.goto(`/espacios/${space.id}`);
  await expect(
    page.getByRole("group", { name: "Este mes" }),
  ).toContainText(/\$\s?1\.500,00/);
});

test("today and the Member are already filled in, and say so", async ({
  page,
  context,
  baseURL,
}) => {
  const { space } = await aMemberWithASpace("Dani Hoy", context, baseURL!);

  await page.goto(`/espacios/${space.id}/movimientos/nuevo`);

  // Story 20 in #1: the ordinary case requires no decisions at all.
  await expect(page.getByText("Hoy · Dani Hoy")).toBeVisible();
});

test("the recorder can never be changed, and is not offered as something to change", async ({
  page,
  context,
  baseURL,
}) => {
  const { space } = await aMemberWithASpace("Eli Anota", context, baseURL!);

  await page.goto(`/espacios/${space.id}/movimientos/nuevo`);
  await page.getByText("Cambiar").click();

  // Story 22 in #1. There is a field for whose money it was and there is no
  // field for who typed it in, which is the strongest form of "never editable".
  await expect(page.getByLabel("Día")).toBeVisible();
  await expect(page.getByLabel("Anotado por")).toHaveCount(0);
});

test("a Member records something their partner spent, and it says whose it was", async ({
  page,
  context,
  baseURL,
}) => {
  const gian = await createMember("Gian Anota");
  const ana = await createMember("Ana Gastó");
  const space = await createSpaceFor(gian.id, "Casa compartida", "ARS");
  await joinSpace(space.id, ana.id);
  await startSession(context, baseURL!, gian);

  await page.goto(`/espacios/${space.id}/movimientos/nuevo`);
  await type(page, "5000");
  await page.getByRole("radio", { name: "Otros" }).click();

  // Story 21 in #1: the case a couple actually argues about.
  await page.getByText("Cambiar").click();
  await page.getByLabel("Es plata de").selectOption({ label: "Ana Gastó" });
  await page.getByRole("button", { name: "Guardar" }).click();

  await expect(page).toHaveURL(/\/movimientos\?mes=/);
  await expect(page.getByRole("group", { name: "Movimientos" })).toContainText(
    /\$\s?50,00/,
  );
});

test("the line above the keypad follows who the money is attributed to", async ({
  page,
  context,
  baseURL,
}) => {
  const gian = await createMember("Gian Mira");
  const ana = await createMember("Ana Cambia");
  const space = await createSpaceFor(gian.id, "Casa compartida", "ARS");
  await joinSpace(space.id, ana.id);
  await startSession(context, baseURL!, gian);

  await page.goto(`/espacios/${space.id}/movimientos/nuevo`);
  await expect(page.getByText("Hoy · Gian Mira")).toBeVisible();

  await page.getByText("Cambiar").click();
  await page.getByLabel("Es plata de").selectOption({ label: "Ana Cambia" });

  // The form would have saved the right person either way. What this is about
  // is the screen not saying the wrong one while it does.
  await expect(page.getByText("Hoy · Ana Cambia")).toBeVisible();
});

test("a Member corrects an expense they got wrong", async ({
  page,
  context,
  baseURL,
}) => {
  const { space } = await aMemberWithASpace("Fede Corrige", context, baseURL!);

  await page.goto(`/espacios/${space.id}/movimientos/nuevo`);
  await type(page, "1284000");
  await page.getByRole("radio", { name: "Otros" }).click();
  await page.getByRole("button", { name: "Guardar" }).click();

  // Story 27 in #1: a typo must not poison every figure downstream.
  await page.getByRole("link", { name: /Otros/ }).click();
  await page.getByRole("button", { name: "Borrar el último número" }).click();
  await page.getByRole("button", { name: "Guardar los cambios" }).click();
  await expect(page).toHaveURL(/\/movimientos\?mes=/);

  await expect(page.getByRole("group", { name: "Movimientos" })).toContainText(
    /\$\s?1\.284,00/,
  );
  await page.goto(`/espacios/${space.id}`);
  await expect(
    page.getByRole("group", { name: "Este mes" }),
  ).toContainText(/\$\s?1\.284,00/);
});

test("the recorder is on the correction screen, and is not a field", async ({
  page,
  context,
  baseURL,
}) => {
  const gian = await createMember("Gian Tecleó");
  const ana = await createMember("Ana Corrige");
  const space = await createSpaceFor(gian.id, "Casa compartida", "ARS");
  await joinSpace(space.id, ana.id);
  await startSession(context, baseURL!, gian);

  await page.goto(`/espacios/${space.id}/movimientos/nuevo`);
  await type(page, "7700");
  await page.getByRole("radio", { name: "Otros" }).click();
  await page.getByRole("button", { name: "Guardar" }).click();
  await page.getByRole("link", { name: /Otros/ }).click();

  // Story 22 in #1, the half a screen owes: "never editable" is enforced by
  // there being no field, and this is what makes it a record somebody reads.
  await expect(page.getByRole("note")).toContainText("Anotado por Gian Tecleó");
  await expect(page.getByLabel("Anotado por")).toHaveCount(0);
});

test("a Member deletes an expense, and is asked first", async ({
  page,
  context,
  baseURL,
}) => {
  const { space } = await aMemberWithASpace("Guada Borra", context, baseURL!);

  await page.goto(`/espacios/${space.id}/movimientos/nuevo`);
  await type(page, "9999");
  await page.getByRole("radio", { name: "Otros" }).click();
  await page.getByRole("button", { name: "Guardar" }).click();
  await page.getByRole("link", { name: /Otros/ }).click();

  await page.getByRole("button", { name: "Borrar el gasto" }).click();
  // #1: actions that destroy data confirm first.
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Sí, borralo" }).click();

  await expect(page).toHaveURL(/\/movimientos\?mes=/);
  await expect(page.getByRole("group", { name: "Movimientos" })).toContainText(
    "Todavía no anotaste ningún movimiento acá.",
  );
  // And it stops counting: a deleted expense that still moved the total would
  // be the worst of both.
  await page.goto(`/espacios/${space.id}`);
  await expect(page.getByRole("group", { name: "Este mes" })).toContainText(
    /\$\s?0,00/,
  );
});

test("the list lands on the month the money is in, not the server's", async ({
  page,
  context,
  baseURL,
}) => {
  const { space } = await aMemberWithASpace("Kari Frontera", context, baseURL!);

  await page.goto(`/espacios/${space.id}/movimientos/nuevo`);
  await type(page, "6600");
  await page.getByRole("radio", { name: "Otros" }).click();
  // A day in a month that is not this one, which is the same hole a reader
  // west of UTC falls into for a few hours at every month's end.
  const lastMonth = new Date();
  lastMonth.setDate(1);
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  const day = lastMonth.toISOString().slice(0, 10);
  await page.getByText("Cambiar").click();
  await page.getByLabel("Día").fill(day);
  await page.getByRole("button", { name: "Guardar" }).click();

  await expect(page).toHaveURL(new RegExp(`mes=${day.slice(0, 7)}`));
  await expect(page.getByRole("group", { name: "Movimientos" })).toContainText(
    /\$\s?66,00/,
  );
});

test("a month nobody has is the month it would have shown anyway", async ({
  page,
  context,
  baseURL,
}) => {
  const { space } = await aMemberWithASpace("Lucho Basura", context, baseURL!);

  // A month arrives from a URL, and every reader of one builds days out of it.
  const junk = await page.goto(
    `/espacios/${space.id}/movimientos?mes=septiembre`,
  );

  expect(junk?.status()).toBe(200);
  await expect(page.getByRole("group", { name: "Movimientos" })).toBeVisible();
});

test("another Member's Movements are not reachable, identifier and all", async ({
  page,
  context,
  baseURL,
}) => {
  const hugo = await createMember("Hugo Reservado");
  const hidden = await createSpaceFor(hugo.id, "Casa de Hugo", "ARS");
  const gaby = await createMember("Gaby Curiosa");
  await startSession(context, baseURL!, gaby);

  const list = await page.goto(`/espacios/${hidden.id}/movimientos`);
  expect(list?.status()).toBe(404);

  const form = await page.goto(`/espacios/${hidden.id}/movimientos/nuevo`);
  expect(form?.status()).toBe(404);
});

test("a Movement that is not this Space's is not found", async ({
  page,
  context,
  baseURL,
}) => {
  const { space } = await aMemberWithASpace("Ines Ajena", context, baseURL!);

  const found = await page.goto(
    `/espacios/${space.id}/movimientos/3f2b0c1e-0000-4000-8000-0000000000ff`,
  );

  expect(found?.status()).toBe(404);
});

test("an expense is recorded on a phone without scrolling sideways", async ({
  page,
  context,
  baseURL,
}) => {
  const { space } = await aMemberWithASpace("Juli Teléfono", context, baseURL!);

  await page.goto(`/espacios/${space.id}/movimientos/nuevo`);
  await expect(page.getByRole("status")).toBeVisible();

  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );

  expect(overflow).toBeLessThanOrEqual(0);
});
