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
  await page.getByRole("link", { name: "Anotar un movimiento" }).click();

  // Story 18 in #1: the amount first, on a large keypad, because it is the
  // only part a person might forget on the way home from the till.
  await type(page, "128400");
  // Story 19: the Category is one tap from a short list.
  await page.getByRole("radio", { name: "Supermercado, Comida" }).click();
  await page.getByRole("button", { name: "Guardar" }).click();

  await expect(page).toHaveURL(
    new RegExp(`/espacios/${space.id}/movimientos\\?mes=`),
  );

  const movements = page.getByRole("region", { name: "Movimientos" });
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

  // On the Budget tab. The month's own list carries both totals (#8); this
  // is the one figure the Budget tab has shown since #7, still adding up.
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
  await expect(page.getByRole("region", { name: "Movimientos" })).toContainText(
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

  await expect(page.getByRole("region", { name: "Movimientos" })).toContainText(
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

  await page.getByRole("button", { name: "Borrar el movimiento" }).click();
  // #1: actions that destroy data confirm first.
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Sí, borralo" }).click();

  await expect(page).toHaveURL(/\/movimientos\?mes=/);
  await expect(page.getByRole("region", { name: "Movimientos" })).toContainText(
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
  await expect(page.getByRole("region", { name: "Movimientos" })).toContainText(
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
  await expect(page.getByRole("region", { name: "Movimientos" })).toBeVisible();
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

test("a Member records income in the same flow as an expense", async ({
  page,
  context,
  baseURL,
}) => {
  const { space } = await aMemberWithASpace("Nico Cobra", context, baseURL!);

  await page.goto(`/espacios/${space.id}/movimientos/nuevo`);

  // #8: the same screen, the same keypad, one chip apart. Choosing income
  // takes the Category picker off the screen -- income carries none.
  await page.getByRole("radio", { name: "Un ingreso" }).click();
  await expect(page.getByRole("group", { name: "Categoría" })).toHaveCount(0);

  await type(page, "85000000");
  await page.getByRole("button", { name: "Guardar" }).click();

  await expect(page).toHaveURL(/\/movimientos\?mes=/);
  const movements = page.getByRole("region", { name: "Movimientos" });
  await expect(movements).toContainText("Ingreso");
  await expect(movements).toContainText(/\$\s?850\.000,00/);
});

test("the month's Movements are grouped by the day they happened on", async ({
  page,
  context,
  baseURL,
}) => {
  const { space } = await aMemberWithASpace("Vera Agrupa", context, baseURL!);

  // Two days of one month, so there is a grouping to see at all. Both are in
  // the past, which is the only kind of day a Movement can carry.
  const dayBefore = new Date();
  dayBefore.setDate(dayBefore.getDate() - 2);
  const other = dayBefore.toISOString().slice(0, 10);

  await page.goto(`/espacios/${space.id}/movimientos/nuevo`);
  await type(page, "1000");
  await page.getByRole("radio", { name: "Otros" }).click();
  await page.getByRole("button", { name: "Guardar" }).click();
  // Waited for, and not merely started: navigating away from a form whose
  // action is still in flight abandons it, and the row never appears.
  await expect(page).toHaveURL(/\/movimientos\?mes=/);

  await page.goto(`/espacios/${space.id}/movimientos/nuevo`);
  await type(page, "2000");
  await page.getByRole("radio", { name: "Otros" }).click();
  await page.getByText("Cambiar").click();
  await page.getByLabel("Día").fill(other);
  await page.getByRole("button", { name: "Guardar" }).click();

  const movements = page.getByRole("region", { name: "Movimientos" });
  // A day is a heading with its own Movements under it, and the most recent
  // day is read first: a person scanning a month starts from where they are.
  const days = movements.getByRole("group");
  await expect(days).toHaveCount(2);
  await expect(days.first()).toContainText("Hoy");
  await expect(days.first()).toContainText(/\$\s?10,00/);
  await expect(days.last()).toContainText(/\$\s?20,00/);
});

test("the month shows what came in and what went out, side by side", async ({
  page,
  context,
  baseURL,
}) => {
  const { space } = await aMemberWithASpace("Sol Cuenta", context, baseURL!);

  await page.goto(`/espacios/${space.id}/movimientos/nuevo`);
  await page.getByRole("radio", { name: "Un ingreso" }).click();
  await type(page, "500000");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page).toHaveURL(/\/movimientos\?mes=/);

  await page.goto(`/espacios/${space.id}/movimientos/nuevo`);
  await type(page, "120000");
  await page.getByRole("radio", { name: "Otros" }).click();
  await page.getByRole("button", { name: "Guardar" }).click();

  // Both figures and never their difference: a month where a salary arrived
  // and the rent was paid is not a month where nothing happened.
  const month = page.getByRole("group", { name: "Este mes" });
  await expect(month).toContainText(/Ingresos[\s\S]*\$\s?5\.000,00/);
  await expect(month).toContainText(/Gastos[\s\S]*\$\s?1\.200,00/);
});

test("in a shared Space every Movement says whose money it was", async ({
  page,
  context,
  baseURL,
}) => {
  const gian = await createMember("Gian Comparte");
  const ana = await createMember("Ana Comparte");
  const space = await createSpaceFor(gian.id, "Casa compartida", "ARS");
  await joinSpace(space.id, ana.id);
  await startSession(context, baseURL!, gian);

  await page.goto(`/espacios/${space.id}/movimientos/nuevo`);
  await type(page, "3000");
  await page.getByRole("radio", { name: "Otros" }).click();
  await page.getByText("Cambiar").click();
  await page.getByLabel("Es plata de").selectOption({ label: "Ana Comparte" });
  await page.getByRole("button", { name: "Guardar" }).click();

  // #8: it is the shared Space that makes this worth saying on every row.
  await expect(page.getByRole("region", { name: "Movimientos" })).toContainText(
    "Plata de Ana Comparte",
  );
});

test("a personal Space does not say whose money it was on every row", async ({
  page,
  context,
  baseURL,
}) => {
  const { space } = await aMemberWithASpace("Uno Solo", context, baseURL!);

  await page.goto(`/espacios/${space.id}/movimientos/nuevo`);
  await type(page, "4000");
  await page.getByRole("radio", { name: "Otros" }).click();
  await page.getByRole("button", { name: "Guardar" }).click();

  // Every Movement here is theirs, so a line saying so on every row says
  // nothing and costs a row's worth of width.
  await expect(
    page.getByRole("region", { name: "Movimientos" }),
  ).not.toContainText("Plata de");
});

test("the month in view can be changed, and stops at the one being lived in", async ({
  page,
  context,
  baseURL,
}) => {
  const { space } = await aMemberWithASpace("Tere Navega", context, baseURL!);

  await page.goto(`/espacios/${space.id}/movimientos/nuevo`);
  await type(page, "7000");
  await page.getByRole("radio", { name: "Otros" }).click();
  await page.getByRole("button", { name: "Guardar" }).click();

  const movements = page.getByRole("region", { name: "Movimientos" });
  await expect(movements).toContainText(/\$\s?70,00/);

  // Nothing can have happened after today, so there is nowhere forward to go.
  await expect(page.getByRole("link", { name: "Mes siguiente" })).toHaveCount(0);

  await page.getByRole("link", { name: "Mes anterior" }).click();
  await expect(movements).toContainText("Todavía no anotaste ningún movimiento acá.");

  await page.getByRole("link", { name: "Mes siguiente" }).click();
  await expect(movements).toContainText(/\$\s?70,00/);
});

test("a correction cannot turn an expense into income", async ({
  page,
  context,
  baseURL,
}) => {
  const { space } = await aMemberWithASpace("Pipe Da Vuelta", context, baseURL!);

  await page.goto(`/espacios/${space.id}/movimientos/nuevo`);
  await type(page, "5500");
  await page.getByRole("radio", { name: "Otros" }).click();
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page).toHaveURL(/\/movimientos\?mes=/);

  await page.getByRole("link", { name: /Otros/ }).click();
  // There is no control for it: which way the money went is what kind of
  // Movement this is, and a control whose only outcome is a refusal has no
  // business on a screen.
  await expect(page.getByRole("radio", { name: "Un ingreso" })).toHaveCount(0);

  // So this is the only way to ask for it, and it is refused rather than
  // half-saved. Without the action reading the hidden field, the four answers
  // it does understand would be written and the fifth silently dropped.
  await page.evaluate(() => {
    const carried = document.querySelector<HTMLInputElement>(
      'input[name="direction"]',
    );
    if (carried) carried.value = "income";
  });
  await page.getByRole("button", { name: "Guardar los cambios" }).click();

  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page).not.toHaveURL(/\/movimientos\?mes=/);
});
