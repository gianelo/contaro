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

/**
 * Moves to another month through the pill at the top of the screen (#40).
 *
 * Two taps for any month of the year, where the `‹ Septiembre ›` walker it
 * replaced took one tap and one page load per month stepped over. Picked by
 * where the row goes rather than by the month's name, so this does not have to
 * hold a second copy of how Spanish names a month.
 */
async function chooseMonth(page: Page, spaceId: string, month: string) {
  await page.getByRole("button", { name: /elegir el mes$/ }).click();
  await page
    .getByRole("dialog")
    .locator(`a[href="/espacios/${spaceId}?mes=${month}"]`)
    .click();
  // A client-side navigation, so the URL is read once it has landed rather
  // than in the same breath as the tap.
  await page.waitForURL(new RegExp(`\\?mes=${month}$`));
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

test("the Budget screen names itself and holds the month's two figures", async ({
  page,
  context,
  baseURL,
}) => {
  const { space } = await aMemberWithASpace("Elsa Encabeza", context, baseURL!);
  const { thisMonth, next } = months();

  await page.goto(`/espacios/${space.id}`);

  // The screen says what it is, and which Space you are in is the quiet line
  // under it, with the money everything below is written in (#40).
  await expect(
    page.getByRole("heading", { name: "Presupuesto", level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByText("Casa de Elsa Encabeza · Peso argentino (ARS)"),
  ).toBeVisible();

  // The month is a pill on the title's row, and picking one is a single act
  // rather than a walk: the sheet holds the whole year at once.
  await page.getByRole("button", { name: /elegir el mes$/ }).click();
  const sheet = page.getByRole("dialog", { name: "Elegir el mes" });
  await expect(
    sheet.locator(`a[href="/espacios/${space.id}?mes=${thisMonth}"]`),
  ).toBeVisible();
  // Including a month that has not started, which is what a plan needs and a
  // ledger does not (ADR-0019).
  await expect(
    sheet.locator(`a[href="/espacios/${space.id}?mes=${next}"]`),
  ).toBeVisible();
  // Escape rather than the scrim: a year of months fills the sheet, so the
  // middle of the scrim -- which is where a click lands -- is behind it.
  await page.keyboard.press("Escape");
  await expect(sheet).toHaveCount(0);

  // A month nobody has planned still owes both figures, and draws no meter:
  // there is no plan to be a share of.
  const summary = page.getByRole("region", { name: "Este mes" });
  await expect(summary).toContainText("Gastado");
  await expect(summary).toContainText("Presupuestado");
  await expect(summary.locator("[data-meter-fill]")).toHaveCount(0);

  // Planned and spent, the card draws the month against its plan -- #11's last
  // criterion, which never shipped because the card it names arrives here.
  await plan(page, space.id, "40000000");
  await spend(page, space.id, "10000000");
  await page.goto(`/espacios/${space.id}`);

  await expect(summary).toContainText("$ 100.000,00");
  await expect(summary).toContainText("$ 400.000,00");
  await expect(summary.locator("[data-meter-fill]")).toHaveAttribute(
    "style",
    /width:\s*25%/,
  );
});

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
  await expect(budget).toContainText("$ 240.000,00");

  // And the plan's total is on the card at the top of the screen now, beside
  // the figure it is meant to be read against (#40).
  const summary = page.getByRole("region", { name: "Este mes" });
  await expect(summary).toContainText("Presupuestado");
  await expect(summary).toContainText("$ 240.000,00");
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

  const { thisMonth, next } = months();

  await page.goto(`/espacios/${space.id}`);

  // Forwards, which the month's list does not offer: a Movement is money that
  // already moved, and a plan is what a month is expected to cost.
  await chooseMonth(page, space.id, next);

  await plan(page, space.id, "9000000");
  await expect(page).toHaveURL(new RegExp(`\\?mes=${next}$`));

  const budget = page.getByRole("group", { name: "El plan del mes" });
  await expect(budget).toContainText("$ 90.000,00");

  // And this month is untouched by it.
  await chooseMonth(page, space.id, thisMonth);
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
  const summary = page.getByRole("region", { name: "Este mes" });
  await expect(summary).toContainText("Presupuestado");
  await expect(summary).toContainText("$ 1.800.000,00");

  // Both kinds add into the month's total, because both are what the month
  // expects to cost (#13).
  await plan(page, space.id, "24000000");
  await expect(summary).toContainText("$ 2.040.000,00");

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
  // The rows themselves, which are links to one Movement each. The raised
  // button in the tab bar lives under the same path and carries no text at
  // all -- its name is an aria-label -- so it is excluded by where it goes.
  const rows = page.locator(
    `a[href*="/espacios/${space.id}/movimientos/"]:not([href$="/nuevo"])`,
  );
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("Alquiler");
  await expect(rows.first()).toContainText("$ 1.800.000,00");

  // And the row has nothing left to do to it: a paid item is not a button.
  await page.goto(`/espacios/${space.id}`);
  await expect(fijos.getByRole("button", { name: /Arriendo/ })).toHaveCount(0);
});

test("a Member deletes the payment, and the rent goes back to pending", async ({
  page,
  context,
  baseURL,
}) => {
  const { space } = await aMemberWithASpace("Nico Anula", context, baseURL!);

  await page.goto(`/espacios/${space.id}`);
  await planFixed(page, space.id, "Arriendo", "180000000", "1");

  const fijos = page.getByRole("group", { name: "Fijos" });
  await fijos.getByRole("button", { name: /Arriendo/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Marcar pagado" }).click();
  await expect(fijos).toContainText("Pagado");

  // Strike out the Movement the payment created, from the ledger side --
  // which is the only place a Member can reach it.
  await page.goto(`/espacios/${space.id}/movimientos`);
  await page.getByRole("link", { name: /Alquiler/ }).click();
  await page.getByRole("button", { name: "Borrar el movimiento" }).click();
  await page.getByRole("button", { name: "Sí, borralo" }).click();
  // The redirect the strike lands on, waited for before navigating away:
  // leaving early cancels the Action's own request mid-flight.
  await expect(page).toHaveURL(/\/movimientos\?mes=/);

  // The plan and the ledger say the same thing about the same money (#49):
  // nothing was spent on the rent, so the rent is not paid.
  await page.goto(`/espacios/${space.id}`);
  await expect(fijos).toContainText("Pendiente");
  await expect(fijos).not.toContainText("Pagado");

  // Pending means payable: the row is a button again, and paying it is an
  // ordinary payment rather than an undo.
  await fijos.getByRole("button", { name: /Arriendo/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Marcar pagado" }).click();
  await expect(fijos).toContainText("Pagado");

  // One standing Movement and not two: the struck one is still an entry
  // (ADR-0015) and counts towards nothing.
  await page.goto(`/espacios/${space.id}/movimientos`);
  await expect(
    page.locator(
      `a[href*="/espacios/${space.id}/movimientos/"]:not([href$="/nuevo"])`,
    ),
  ).toHaveCount(1);
});

/**
 * Which day of the month the run is standing in, in the zone the whole suite
 * is pinned to (`playwright.config.ts` fixes the browser and the header
 * together, so the screen and this agree). Calendar arithmetic and never the
 * even-pace figure: reproducing that here would be the domain written twice,
 * and a test that agrees with itself proves nothing.
 */
function today() {
  const inBogota = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const [year, month, day] = inBogota.split("-").map(Number) as [
    number,
    number,
    number,
  ];

  // Day zero of the next month is the last day of this one, whatever length
  // it happens to be.
  return { day, days: new Date(Date.UTC(year, month, 0)).getUTCDate() };
}

/**
 * The month the run is standing in and the one after it, written `YYYY-MM` in
 * the zone the suite is pinned to. Calendar arithmetic and nothing the screen
 * decides, the way `today` above is.
 */
function months() {
  const inBogota = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());

  const [year, month] = inBogota.split("-").map(Number) as [number, number];
  const after = new Date(Date.UTC(year, month, 1));

  return {
    thisMonth: inBogota,
    next: after.toISOString().slice(0, 7),
  };
}

test("a Member reads whether the month is ahead of its pace", async ({
  page,
  context,
  baseURL,
}) => {
  const { space } = await aMemberWithASpace("Vera Ritmo", context, baseURL!);
  const { day, days } = today();

  await page.goto(`/espacios/${space.id}`);

  const summary = page.getByRole("region", { name: "Este mes" });

  // A month with nothing planned has no pace: there is nothing anybody meant
  // to spread across it, and "vas justo en el ritmo" would be a reassurance
  // nobody earned.
  await expect(summary).not.toContainText("del ritmo");

  await plan(page, space.id, "100000000");

  // One line of words, and it names its own scope out loud so nobody has to
  // know why the rent is not in it. Nothing spent yet, so the month is behind
  // whatever an even pace expected by today — whichever day that is.
  await expect(summary).toContainText(`Día ${day} de ${days}`);
  await expect(summary).toContainText("en gastos variables");
  await expect(summary).toContainText("abajo del ritmo");

  // Three times the whole month's plan: ahead of the pace on any day of it.
  await spend(page, space.id, "300000000");
  await page.goto(`/espacios/${space.id}`);

  await expect(summary).toContainText("arriba del ritmo");

  // The pace as it stands, to be compared against itself across the payment
  // below. Read off the screen rather than written out here, because what
  // this asserts is that it does not move — not what it says. The sentence and
  // not the whole card: planning the rent does move "Presupuestado", which is
  // the plan growing and exactly what that figure is for.
  const sentence = summary.locator("p");
  const before = await sentence.textContent();

  // "Paying a Fixed item does not move the pace figure" (#14). Marking one
  // paid creates a real Movement (ADR-0023), and the pace has to be blind to
  // it: rent falls due on its own day rather than evenly across the month.
  await planFixed(page, space.id, "Arriendo", "180000000", "1");
  await page
    .getByRole("group", { name: "Fijos" })
    .getByRole("button", { name: /Arriendo/ })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Marcar pagado" })
    .click();
  await expect(page).toHaveURL(new RegExp(`/espacios/${space.id}\\?mes=`));

  await expect(summary).toContainText("arriba del ritmo");
  expect(await sentence.textContent()).toBe(before);
});
