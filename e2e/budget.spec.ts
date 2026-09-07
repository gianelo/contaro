import {
  expect,
  test,
  type BrowserContext,
  type Locator,
  type Page,
} from "@playwright/test";
import { createMember, createSpaceFor, startSession } from "./session";
import {
  box,
  foldOf,
  hitTargetOf,
  overlapping,
  withinTheGutter,
} from "./layout";
import { chooseMonth, months, openMonths } from "./months";

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

/**
 * One Variable item, planned the way a person plans one: how much, what it is
 * called, and what it is filed under (#79).
 *
 * Nothing is said about a day, and that is what leaves it Variable (#80). The
 * form asks -- the question is on the screen from the moment it loads -- and
 * "No vence" is where it starts, so planning a week of groceries costs the
 * same taps it did before the two ways in became one.
 */
async function plan(
  page: Page,
  spaceId: string,
  name: string,
  digits: string,
) {
  await page.getByRole("link", { name: "Agregar al plan" }).click();
  await type(page, digits);
  await page.getByLabel("Cómo se llama").fill(name);
  // The same two steps the entry screen asks for, because it is the same
  // question: picking a Category (#45).
  await categorise(page, "Comida", "Supermercado");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page).toHaveURL(new RegExp(`/espacios/${spaceId}\\?mes=`));
}

/**
 * Opens what a Category's row keeps inside it: the items its figure is made
 * of (#63).
 *
 * By clicking the row rather than by setting the attribute, because tapping
 * the comparison is the whole gesture -- and because every navigation away
 * from this screen closes it again. A `<details>` holds no state a server
 * render restores, so a journey that comes back here has to open it again,
 * which is what a person does too.
 */
async function openPlanOf(variables: Locator, category: string) {
  await variables.locator("summary").filter({ hasText: category }).click();
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
  const sheet = await openMonths(page);
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
  await plan(page, space.id, "Súper de la semana", "40000000");
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
  await expect(page.getByText("Todavía no planeaste este mes.")).toBeVisible();

  await plan(page, space.id, "Súper de la semana", "24000000");

  // One row for the Category, saying what it expects and what it has cost.
  // The screen used to draw a second list of the items beside this one, headed
  // "El plan del mes", so a planned Category appeared twice under two headings
  // and neither appearance said what the other was for (#63).
  const variables = page.getByRole("group", { name: "Variables" });
  await expect(variables).toContainText("Supermercado");
  await expect(variables).toContainText("/ 240.000,00");
  await expect(page.getByText("Todavía no planeaste este mes.")).toHaveCount(0);

  // And the item is inside it, under the figure it adds up to, read by the
  // name it was planned with (#79). Until items were called something, four
  // weeks of groceries were four rows nothing on the screen told apart.
  await openPlanOf(variables, "Supermercado");
  await expect(variables).toContainText("El plan de esta categoría");
  await expect(variables).toContainText("Súper de la semana");
  await expect(variables).toContainText("$ 240.000,00");

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
  await plan(page, space.id, "Súper de la semana", "24000000");

  const variables = page.getByRole("group", { name: "Variables" });
  await openPlanOf(variables, "Supermercado");
  await variables.getByRole("link", { name: /Súper de la semana/ }).click();

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
  await plan(page, space.id, "Semana 1", "6000000");
  await plan(page, space.id, "Semana 2", "6000000");
  await plan(page, space.id, "Semana 3", "5500000");
  await plan(page, space.id, "Semana 4", "6500000");

  const variables = page.getByRole("group", { name: "Variables" });

  // One row and never four: what the Category expects of the month is the four
  // added up, and that is the one thing there is to be over or under.
  await expect(variables.locator("summary")).toHaveCount(1);
  await expect(variables).toContainText("/ 240.000,00");

  // And the four are still four rows a thumb can aim at, one tap inside the
  // figure they make. That is the whole of #79 -- four rows called the same
  // thing are a plan a person can read down and cannot correct, because
  // nothing on the screen says which week is which -- and the whole of #63:
  // they are here, under what they add up to, and nowhere else.
  await openPlanOf(variables, "Supermercado");
  await expect(variables.getByRole("link")).toHaveCount(4);

  for (const week of ["Semana 1", "Semana 2", "Semana 3", "Semana 4"]) {
    await expect(
      variables.getByRole("link", { name: new RegExp(week) }),
    ).toHaveCount(1);
  }
});

/*
 * The half of #63 no component test can show: which items the read model files
 * under a Category, rather than which ones the tray draws once it has them.
 *
 * A Fixed item is read twice on this screen and that is the decision, not an
 * oversight. `expectedByCategory` sums every item of the Category, so the
 * figure the tray hangs under already has the rent in it -- and a tray that
 * left it out would not add up to the number above it. Fijos asks "have I paid
 * it"; the tray asks "what is this total made of". Two questions, two rows.
 */
test("a Fixed item is inside the Category it was planned on, as well as in Fijos", async ({
  page,
  context,
  baseURL,
}) => {
  const { space } = await aMemberWithASpace("Rita Reparte", context, baseURL!);

  await page.goto(`/espacios/${space.id}`);

  // Both kinds on one Category: a week of groceries, and a box of vegetables
  // that comes out of the same Category on the 1st every month.
  await plan(page, space.id, "Súper de la semana", "24000000");
  await planFixed(page, space.id, "Caja de verduras", "6000000", "1", [
    "Comida",
    "Supermercado",
  ]);

  const fijos = page.getByRole("group", { name: "Fijos" });
  const variables = page.getByRole("group", { name: "Variables" });

  // What the Category expects is both of them: the $240.000 planned in weeks
  // and the $60.000 that comes out on the 1st.
  await expect(variables).toContainText("/ 300.000,00");
  await expect(fijos).toContainText("Caja de verduras");

  await openPlanOf(variables, "Supermercado");
  await expect(variables).toContainText("Caja de verduras");
  await expect(variables).toContainText("Súper de la semana");

  // And the row opens the Fixed item's own screen, which is the same URL for
  // either kind (#48) -- so the tray needs to know nothing about kinds to send
  // a thumb to the right form.
  await variables.getByRole("link", { name: /Caja de verduras/ }).click();
  await expect(
    page.getByRole("heading", { name: "Corregir el gasto fijo" }),
  ).toBeVisible();
});

test("a Member is told when a Category has passed what it expected", async ({
  page,
  context,
  baseURL,
}) => {
  const { space } = await aMemberWithASpace("Euge Se Pasa", context, baseURL!);

  await page.goto(`/espacios/${space.id}`);
  await plan(page, space.id, "Súper de la semana", "40000000");

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
  await chooseMonth(page, `/espacios/${space.id}?mes=${next}`, next);

  await plan(page, space.id, "Súper de la semana", "9000000");
  await expect(page).toHaveURL(new RegExp(`\\?mes=${next}$`));

  const variables = page.getByRole("group", { name: "Variables" });
  await expect(variables).toContainText("/ 90.000,00");

  // And this month is untouched by it: no Category to compare, and the empty
  // state saying so about the whole plan rather than about half of it.
  await chooseMonth(page, `/espacios/${space.id}?mes=${thisMonth}`, thisMonth);
  await expect(page.getByText("Todavía no planeaste este mes.")).toBeVisible();
  await expect(variables).toHaveCount(0);
});

test("a Member corrects an item and takes another off the plan", async ({
  page,
  context,
  baseURL,
}) => {
  const { space } = await aMemberWithASpace("Cami Corrige", context, baseURL!);

  await page.goto(`/espacios/${space.id}`);
  await plan(page, space.id, "Súper de la semana", "24000000");

  const variables = page.getByRole("group", { name: "Variables" });
  await openPlanOf(variables, "Supermercado");
  await variables.getByRole("link", { name: /Súper de la semana/ }).click();

  // The keypad opens on what the item expects, so a correction is typed over
  // it rather than from nothing, and the name field on what it is called.
  await page.getByRole("button", { name: "Borrar el último número" }).click();
  await page.getByLabel("Cómo se llama").fill("Súper de la primera semana");
  await page.getByRole("button", { name: "Guardar" }).click();

  // The Category's own figure moves with the item, because the figure is what
  // the items add up to.
  await expect(variables).toContainText("/ 24.000,00");

  // Opened again, because coming back to the screen is a fresh render and a
  // `<details>` keeps nothing across one -- which is exactly what makes it
  // work before any JavaScript has loaded.
  await openPlanOf(variables, "Supermercado");
  await expect(variables).toContainText("Súper de la primera semana");
  await expect(variables).toContainText("$ 24.000,00");

  await variables
    .getByRole("link", { name: /Súper de la primera semana/ })
    .click();
  await page.getByRole("button", { name: "Sacar del plan" }).click();

  // The last item off the plan takes the Category's row with it, and the
  // month is unplanned again -- of either kind.
  await expect(page.getByText("Todavía no planeaste este mes.")).toBeVisible();
  await expect(variables).toHaveCount(0);
});

/**
 * One Fixed item, planned the way a person plans the rent: on the same screen,
 * out of the same button, one answer further along (#80).
 *
 * Nobody types the word "fijo" here and nobody taps it, which is the whole of
 * the change: what a person says is that this one vences, and the day they
 * then pick is what makes it Fixed.
 *
 * The Category is answered by the rent's own by default, because that is what
 * almost every journey here is about. It is asked for at all so that one of
 * them can put a Fixed item on the Category a Variable one is already on,
 * which is where the two kinds meet on this screen (#63).
 */
async function planFixed(
  page: Page,
  spaceId: string,
  name: string,
  digits: string,
  dueDay: string,
  filedUnder: readonly [heading: string, under: string] = ["Hogar", "Alquiler"],
) {
  await page.getByRole("link", { name: "Agregar al plan" }).click();
  await type(page, digits);
  await page.getByLabel("Cómo se llama").fill(name);
  // The one question the kind is decided by, answered with a day. The same
  // picker sits on the screen for a Variable item and is left on "No vence".
  await page.getByLabel("¿Vence un día del mes?").selectOption(dueDay);
  await categorise(page, filedUnder[0], filedUnder[1]);
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
  await plan(page, space.id, "Súper de la semana", "24000000");
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

  // And the row has nothing left to pay: a paid item keeps the link that
  // opens it and loses the control that would pay it again.
  await page.goto(`/espacios/${space.id}`);
  await expect(fijos.getByRole("button", { name: /Arriendo/ })).toHaveCount(0);
  await expect(fijos.getByRole("link", { name: /Arriendo/ })).toHaveCount(1);
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

/*
 * The whole of #48 in one journey, because the parts of it only mean anything
 * against each other: a Fixed item is corrected, then paid, and then it is
 * neither correctable nor removable until the Movement that paid it is gone.
 */
test("a Member corrects the rent, and cannot while it is paid", async ({
  page,
  context,
  baseURL,
}) => {
  const { space } = await aMemberWithASpace("Ana Corrige", context, baseURL!);

  await page.goto(`/espacios/${space.id}`);
  await planFixed(page, space.id, "Arriendo", "180000000", "1");

  const fijos = page.getByRole("group", { name: "Fijos" });

  // The row opens the item, the way a Variable row already did.
  await fijos.getByRole("link", { name: /Arriendo/ }).click();
  await expect(
    page.getByRole("heading", { name: "Corregir el gasto fijo" }),
  ).toBeVisible();

  // All four questions, opened on the answers the item already has. The
  // keypad opens on its amount, so a correction is typed over it: 1.800.000
  // loses a digit and becomes 180.000.
  await page.getByRole("button", { name: "Borrar el último número" }).click();
  await page.getByLabel("Cómo se llama").fill("Arriendo y expensas");
  await page.getByLabel("Qué día del mes vence").selectOption("5");
  await page.getByRole("button", { name: "Cambiar" }).click();
  await categorise(page, "Comida", "Supermercado");
  await page.getByRole("button", { name: "Guardar" }).click();

  await expect(page).toHaveURL(new RegExp(`/espacios/${space.id}\\?mes=`));
  await expect(fijos).toContainText("Arriendo y expensas");
  await expect(fijos).toContainText("$ 180.000,00");
  await expect(fijos).toContainText("Supermercado · 5");

  // Now pay it, which puts the figure in the ledger.
  await fijos.getByRole("button", { name: /Arriendo/ }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Marcar pagado" })
    .click();
  await expect(fijos).toContainText("Pagado");

  // And the item stops being correctable. Not a form that refuses on save --
  // no form at all, and the one thing that undoes it named as somewhere to go
  // (ADR-0034).
  await fijos.getByRole("link", { name: /Arriendo/ }).click();
  await expect(page.getByText("Este gasto fijo ya está pagado")).toBeVisible();
  await expect(page.getByRole("button", { name: "Guardar" })).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Sacar del plan" }),
  ).toHaveCount(0);

  // Follow it to the Movement and strike that out, which is the way back.
  await page.getByRole("link", { name: "Ver el movimiento" }).click();
  await page.getByRole("button", { name: "Borrar el movimiento" }).click();
  await page.getByRole("button", { name: "Sí, borralo" }).click();
  // The redirect the strike lands on, waited for before navigating away:
  // leaving early cancels the Action's own request mid-flight.
  await expect(page).toHaveURL(/\/movimientos\?mes=/);

  // Pending again, and correctable again -- which is the same rule read from
  // the other side.
  await page.goto(`/espacios/${space.id}`);
  await expect(fijos).toContainText("Pendiente");

  await fijos.getByRole("link", { name: /Arriendo/ }).click();
  await page.getByRole("button", { name: "Sacar del plan" }).click();

  // The section goes with its last item, and the struck Movement stays in the
  // ledger as an entry (ADR-0015): a plan being tidied takes nothing with it.
  await expect(fijos).toHaveCount(0);
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

  await plan(page, space.id, "Súper de la semana", "100000000");

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

/**
 * The widest figure the product can put on this screen, which is not the
 * widest one anybody typed.
 *
 * Two dials widen an amount independently and the product offers both on
 * purpose. The currency: `src/domain/money/currency.ts` holds ten, and COP,
 * CLP and PYG take no minor units while the other seven take two. The reader:
 * ADR-0014 writes an amount the way its reader reads numbers, so a phone set
 * to English looking at an Argentine Space is told "ARS" rather than "$" --
 * three characters and a space where there was one character.
 *
 * Turn both and the ceiling is twenty characters. Every screenshot that made
 * this card look settled was taken in COP or in `es-AR`, which is exactly why
 * it went unnoticed (ADR-0036).
 */
const WIDEST = /ARS\s9,999,999,999\.99/;

/**
 * The ceiling, in minor units, as a thumb would tap it in.
 *
 * One number for both halves of the card, because the domain deliberately
 * makes it one: `MAX_BUDGET_ITEM_AMOUNT` is `MAX_MOVEMENT_AMOUNT`, so that a
 * plan cannot hold a figure no Movement could ever reach (`budget.ts`). So it
 * is what gets planned here and what gets spent against it.
 */
const CEILING = "999999999999";

/** The figure a label names, which is the span right after it. */
const figureAfter = (label: Locator) =>
  label.locator("xpath=following-sibling::span[1]");

test.describe("read by a phone set to English, where the money is spelled out", () => {
  test.use({ locale: "en-US" });

  test("the month's two figures keep off each other at their widest", async ({
    page,
    context,
    baseURL,
  }) => {
    const { space } = await aMemberWithASpace("Wanda Ancha", context, baseURL!);

    await page.goto(`/espacios/${space.id}`);
    await plan(page, space.id, "Súper de la semana", CEILING);
    await spend(page, space.id, CEILING);
    await page.goto(`/espacios/${space.id}`);

    const summary = page.getByRole("region", { name: "Este mes" });
    await expect(summary).toContainText(WIDEST);

    const spent = await box(figureAfter(summary.getByText("Gastado")));
    const planned = await box(figureAfter(summary.getByText("Presupuestado")));

    // Neither figure is readable when the other is printed through it, and
    // "Gastado" is the answer to the question the screen exists to ask.
    expect(overlapping(spent, planned)).toBe(false);

    // And neither of them leaves the screen to get out of the other's way:
    // a figure past the gutter is a figure with digits behind the glass.
    await withinTheGutter(page, spent);
    await withinTheGutter(page, planned);

    // The same pair of figures again, in a tighter line: whatever the card
    // does when they do not fit, the meter rows do too (ADR-0036).
    const variables = page.getByRole("group", { name: "Variables" });
    await expect(variables).toContainText(WIDEST);

    const category = await box(variables.getByText("Supermercado"));
    const pair = await box(variables.getByText(WIDEST).last());

    // Off the Category as well as inside the gutters: a pair that stayed on
    // the screen by printing over the name it belongs to would pass a bounds
    // check on its own and still be unreadable.
    expect(overlapping(category, pair)).toBe(false);
    await withinTheGutter(page, pair);
  });
});

/**
 * The end of a Fijos row, which the canvas draws as one column: the amount
 * over its badge, flush right.
 *
 * It became a line when the badge moved out of the row (#48) so a keyboard
 * could reach it, leaving the amount behind inside. Two things beside the name
 * instead of one column squeezed the name column until "Alquiler · 1 sep"
 * wrapped and the row grew (#59). Measured here because a jsdom run has no
 * layout: whether two things stack is a question only a browser can answer.
 */
test("a Fijo's amount sits over its badge, and the line under the name keeps to one", async ({
  page,
  context,
  baseURL,
}) => {
  const { space } = await aMemberWithASpace("Vera Mide", context, baseURL!);

  await page.goto(`/espacios/${space.id}`);
  // A name of ordinary length, which is what the squeeze showed up on: a short
  // one fits however badly the rest of the row is laid out.
  await planFixed(page, space.id, "Arriendo y expensas", "180000000", "1");

  const fijos = page.getByRole("group", { name: "Fijos" });
  const amount = await box(fijos.getByText("$ 1.800.000,00"));
  const badge = await box(fijos.getByText("Pendiente"));

  // Stacked: the badge begins at or below where the amount ends.
  expect(badge.y).toBeGreaterThanOrEqual(amount.y + amount.height);

  // And one column rather than two things that happen to be stacked: they
  // share a right edge. A pixel of tolerance, because a browser lays text out
  // in fractions.
  const rightOf = (measured: { x: number; width: number }) =>
    measured.x + measured.width;
  expect(Math.abs(rightOf(badge) - rightOf(amount))).toBeLessThanOrEqual(1);

  await withinTheGutter(page, amount);
  await withinTheGutter(page, badge);

  // The line under the name, on one line. Counted in line boxes rather than
  // measured in pixels: a line that wrapped is two rects, whatever the font
  // decided its height was.
  const beneath = fijos.getByText(/·/);
  await expect(beneath).toBeVisible();
  expect(await beneath.evaluate((line) => line.getClientRects().length)).toBe(1);

  // The tap that marks it paid is the whole column, so it is a finger's worth
  // in both directions by being what is drawn rather than by growing past it.
  const tap = await box(fijos.getByRole("button", { name: /Arriendo/ }));
  const finger = await hitTargetOf(page);

  expect(tap.width).toBeGreaterThanOrEqual(finger);
  expect(tap.height).toBeGreaterThanOrEqual(finger);

  // And it is the column and nothing more: it holds both halves and stays on
  // the screen. A target that met its 44px by reaching past the gutter, or
  // over the row above, would pass the two lines above and still be wrong.
  expect(tap.y).toBeLessThanOrEqual(amount.y);
  expect(tap.y + tap.height).toBeGreaterThanOrEqual(badge.y + badge.height);
  await withinTheGutter(page, tap);
});

/**
 * One way into the plan, for both kinds (#80).
 *
 * There were two buttons here, reading almost the same, and choosing between
 * them meant knowing what "fijo" meant before you were allowed to write down a
 * number. The proof that the merge happened is not that the one button works —
 * the tests above already plan both kinds through it — but that the second one
 * is gone from the screen a person actually stands on.
 */
test("a Member is offered one way into the plan and never asked to pick a kind", async ({
  page,
  context,
  baseURL,
}) => {
  const { space } = await aMemberWithASpace("Vera Planea", context, baseURL!);

  await page.goto(`/espacios/${space.id}`);

  await expect(
    page.getByRole("link", { name: "Agregar al plan" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Agregar un gasto fijo" }),
  ).toHaveCount(0);

  // And the word for the kind is nowhere in the question the form asks. What a
  // person is asked is whether it vences, which is a word they already own.
  await page.getByRole("link", { name: "Agregar al plan" }).click();

  const vence = page.getByLabel("¿Vence un día del mes?");
  await expect(vence).toBeVisible();

  // "No vence" is where it starts and it is a real answer, not a prompt: what
  // the row reads is what gets filed, at every moment. There is no state here
  // that can say the item vences while the control says it does not.
  await expect(vence).toHaveValue("");
  await expect(vence.locator("option").first()).toHaveText("No vence");

  // Exactly the days this month has, plus "No vence", and never a day the
  // month does not have. Counted from the calendar rather than written down,
  // so a February plan offered a 30th fails here rather than at the domain.
  const { thisMonth } = months();
  const days = new Date(
    Date.UTC(Number(thisMonth.slice(0, 4)), Number(thisMonth.slice(5)), 0),
  ).getUTCDate();
  await expect(vence.locator("option")).toHaveCount(days + 1);

  // Nothing on this screen ever grows or shrinks: the question is one row from
  // the moment it loads, whichever way it is answered. That is the objection
  // recorded against merging the two ways in, answered as completely as it can
  // be -- Guardar does not move.
  const tall = () =>
    page.evaluate(() => document.documentElement.scrollHeight);
  const before = await tall();
  await vence.selectOption("5");
  expect(await tall()).toBe(before);
});

/**
 * The way into the plan is above the plan, and stays exactly as far from a
 * thumb however long the plan gets (#81).
 *
 * What is read is a distance and never a coordinate. A number here would be
 * this file's second opinion about how tall a row is, and it would fail the
 * day a badge grew a pixel while the thing it exists to catch -- the row
 * sliding back under the lists -- went on passing. Criterion #1 is not an
 * order but an invariant: the walk to this control is not a function of how
 * much has been planned, which is the whole reason it moved off the foot of
 * the screen.
 *
 * So the gap between the month's figures and the card under them is read on a
 * month with nothing planned, and again once both sections are real and long.
 * It is the same gap: five items bought the plan its two lists and moved the
 * door not at all. Measured on the card and not on the row inside it, because
 * the empty sentence leaves the card when the month stops being empty -- and
 * the summary above grows a meter and a line of pace in the same breath, both
 * of which are the plan appearing rather than the door moving.
 *
 * The order is asserted on the long plan too, which is that invariant said the
 * other way round: the whole of the row ends above where FIJOS begins.
 */
test("the way into the plan keeps its distance from the figures as the plan grows", async ({
  page,
  context,
  baseURL,
}) => {
  const { space } = await aMemberWithASpace("Lucía Larga", context, baseURL!);

  await page.goto(`/espacios/${space.id}`);

  const summary = page.getByRole("region", { name: "Este mes" });
  const card = page.getByRole("group", { name: "Presupuesto" });

  // How far the way in sits under the two figures, which is the reachability
  // #81 is about: everything above it on the screen is one card of fixed
  // shape, so this is the whole of the walk to it.
  const underTheFigures = async () => {
    const figures = await box(summary);
    const door = await box(card);

    return door.y - (figures.y + figures.height);
  };

  const onAnEmptyMonth = await underTheFigures();

  // Enough of both kinds that neither section is a single row: it is a long
  // FIJOS list that used to push the way in off the bottom of the screen.
  await planFixed(page, space.id, "Arriendo", "180000", "1");
  await planFixed(page, space.id, "Netflix", "44900", "5", ["Ocio", "Suscripciones"]);
  await planFixed(page, space.id, "Gimnasio", "120000", "25", ["Salud", "Farmacia"]);
  await plan(page, space.id, "Semana 1", "90000");
  await plan(page, space.id, "Semana 2", "90000");

  const onAPlannedMonth = await underTheFigures();

  // A pixel of tolerance, because a browser lays a card out in fractions. It
  // is a tolerance and not a measurement: any real regression here is a list's
  // worth of rows, not a rounding.
  expect(Math.abs(onAPlannedMonth - onAnEmptyMonth)).toBeLessThanOrEqual(1);

  const wayIn = await box(page.getByRole("link", { name: "Agregar al plan" }));
  const fijos = await box(page.getByRole("group", { name: "Fijos" }));
  const variables = await box(page.getByRole("group", { name: "Variables" }));

  expect(wayIn.y + wayIn.height).toBeLessThanOrEqual(fijos.y);
  expect(fijos.y).toBeLessThanOrEqual(variables.y);
});

/**
 * The address bar stays honest about a way in that no longer exists (ADR-0010).
 *
 * `/presupuesto/nuevo/fijo` shipped in #13 and was the second way into the
 * plan until #80. A link somebody kept, or a tab open since before the merge,
 * lands on the one form — still holding the month it was opened on, because
 * landing on "this month" would take somebody planning October in September
 * off the month they were working on.
 */
test("the Fixed item's old route lands on the one form, on the month it was asked for", async ({
  page,
  context,
  baseURL,
}) => {
  const { space } = await aMemberWithASpace("Beto Marcado", context, baseURL!);

  // Next month and not this one, because that is the month the old link
  // carried that landing on "hoy" would silently lose.
  const { next } = months();

  await page.goto(`/espacios/${space.id}/presupuesto/nuevo/fijo?mes=${next}`);

  await expect(page).toHaveURL(
    `/espacios/${space.id}/presupuesto/nuevo?mes=${next}`,
  );
  await expect(
    page.getByRole("heading", { name: "Nuevo gasto previsto" }),
  ).toBeVisible();
});

/**
 * The counterpart of ADR-0027, made a second time.
 *
 * The raised button in the middle of the tab bar is one of the two ways into
 * this screen; the other is the row above the plan (#81). What either of them
 * leads to is a screen with nothing else on it -- because by the time somebody
 * is here they have an amount and a name typed in, and a bar offering three
 * other places is three ways to lose both (#86).
 */
test("planning a gasto previsto is one thing, with nothing else offered", async ({
  page,
  context,
  baseURL,
}) => {
  const { space } = await aMemberWithASpace("Tere Planea", context, baseURL!);

  await page.goto(`/espacios/${space.id}/presupuesto/nuevo`);

  await expect(page.getByRole("navigation", { name: "Principal" })).toHaveCount(
    0,
  );

  // The way out is in the head, where a thumb reaching to leave already is,
  // rather than a scroll past the keypad at the foot of the page. It goes back
  // to the month this was opened on and never to "this month".
  await expect(page.getByRole("link", { name: "Cancelar" })).toHaveAttribute(
    "href",
    new RegExp(`^/espacios/${space.id}\\?mes=\\d{4}-\\d{2}$`),
  );

  // The screen names itself once. It used to say the Space in a heading and
  // then say what the screen was in a second one under it.
  await expect(
    page.getByRole("heading", { name: "Nuevo gasto previsto" }),
  ).toHaveCount(1);
});

/**
 * The plan's entry screen on a phone, whole, before and after it is answered.
 *
 * A form is only as good as the last answer a thumb can reach: a document
 * taller than the glass is a scroll between the name and Guardar, which is the
 * screen #1 says loses the entry (#60). Measured rather than eyeballed, the way
 * the Movement entry screen's fold is measured in `movements.spec.ts` -- and
 * measured in both states, because choosing a heading opens what is under it
 * (ADR-0022) and the picker is at its tallest after the questions are answered.
 *
 * A Space of one is not a weaker case here than a shared one, which is the
 * difference from the Movement screen: this screen has no pill naming who else
 * is in the Space, and its Category picker is one row however long the
 * catalogue grows (ADR-0037). Every block on it is a fixed height, so this
 * measurement is the measurement.
 */
test("a gasto previsto is planned on a phone without scrolling down", async ({
  page,
  context,
  baseURL,
}) => {
  const { space } = await aMemberWithASpace("Fina Justa", context, baseURL!);

  await page.goto(`/espacios/${space.id}/presupuesto/nuevo`);
  await expect(page.getByRole("status")).toBeVisible();

  const fold = () => foldOf(page, page.getByRole("button", { name: "Guardar" }));

  const offered = await fold();
  expect(offered.control).toBeLessThanOrEqual(offered.viewport);
  expect(offered.document).toBeLessThanOrEqual(offered.viewport);

  await type(page, "24000000");
  await page.getByLabel("Cómo se llama").fill("Súper de la semana");
  await categorise(page, "Comida", "Supermercado");
  await expect(
    page.getByRole("radio", { name: "Supermercado, Comida" }),
  ).toBeChecked();

  const answered = await fold();
  expect(answered.control).toBeLessThanOrEqual(answered.viewport);
  expect(answered.document).toBeLessThanOrEqual(answered.viewport);
});
