import { expect, test } from "./fixtures";
import { createMember, createSpaceFor, startSession } from "./session";

test("the app runs and renders the shell in Spanish", async ({ page }) => {
  await page.goto("/");

  // There is no screen above a Space, so entering means landing on the list
  // of them (#5).
  await expect(page).toHaveURL(/\/espacios$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  // The screen greets whoever landed on it rather than naming itself (#38).
  await expect(
    page.getByRole("heading", { name: "Hola, Ana", level: 1 }),
  ).toBeVisible();
});

test("the list a Member lands on carries no tab bar", async ({ page }) => {
  await page.goto("/espacios");

  // It belongs to no Space, so a "Presupuesto" tab here would have no money
  // to be about. Navigation begins once a Space is chosen.
  await expect(
    page.getByRole("navigation", { name: "Principal" }),
  ).toHaveCount(0);
});

test("every screen inside a Space opens with the header, and the way out is inside its menu", async ({
  page,
  context,
  baseURL,
}) => {
  const ana = await createMember("Ana Cabecera");
  const casa = await createSpaceFor(ana.id, "Casa", "COP");
  await startSession(context, baseURL!, ana);

  await page.goto(`/espacios/${casa.id}`);

  // The row the canvas never drew and the app always rendered, now shaped and
  // drawn: identity above the title, controls at the trailing end (ADR-0059).
  const header = page.getByRole("banner");
  await expect(header).toContainText("Ana");

  await header.getByRole("button", { name: "Abrir menú del Espacio" }).click();

  // Which Space the menu is about, and the two rows it carries today. The
  // bell (#133) and the multi-month balance (#115) land in it later.
  //
  // Scoped to the sheet, and it has to be: `Ajustes` is also a tab on the bar
  // underneath, and the line under the title already says "Casa · COP". What
  // is asserted here is what the menu holds, not what the screen does.
  const menu = page.getByRole("dialog");
  await expect(menu.getByText("Casa · COP")).toBeVisible();
  await expect(menu.getByRole("link", { name: "Ajustes" })).toHaveAttribute(
    "href",
    `/espacios/${casa.id}/ajustes`,
  );
  await expect(
    menu.getByRole("button", { name: "Cerrar sesión" }),
  ).toBeVisible();
});

test("the Spaces list carries the hamburger without a header around it", async ({
  page,
  context,
  baseURL,
}) => {
  const ana = await createMember("Ana Lista Menu");
  const casa = await createSpaceFor(ana.id, "Casa", "COP");
  await startSession(context, baseURL!, ana);

  // Opened once, so there is a last-opened Space for the menu to be about.
  // That is the scoping ADR-0059 chose for this screen, and it points at the
  // same Space the `Activo` badge on its card does.
  await page.goto(`/espacios/${casa.id}`);
  await page.goto("/espacios");

  // It is not inside a Space, so a second copy of the identity the greeting
  // already draws would buy nothing. But it is also the one shell screen with
  // no tab bar under it (ADR-0027), so it cannot be the screen where signing
  // out is out of reach -- it gets the icon, not the row.
  await expect(page.getByRole("banner")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Abrir menú del Espacio" })
    .click();

  const menu = page.getByRole("dialog");
  await expect(menu.getByText("Casa · COP")).toBeVisible();
  await expect(menu.getByRole("link", { name: "Ajustes" })).toBeVisible();
});

test("a Member who has never opened a Space still finds the way out", async ({
  page,
  context,
  baseURL,
}) => {
  const ana = await createMember("Ana Sin Abrir");
  await createSpaceFor(ana.id, "Casa", "COP");
  await startSession(context, baseURL!, ana);

  await page.goto("/espacios");
  await page
    .getByRole("button", { name: "Abrir menú del Espacio" })
    .click();

  // No Space has been opened, so the menu is about none: the rows that belong
  // to a Space go missing and the way out does not. A Member with no Space
  // still has a session, and this screen has no tab bar to reach Ajustes from
  // anyway (ADR-0060).
  const menu = page.getByRole("dialog");
  await expect(menu.getByRole("link", { name: "Ajustes" })).toHaveCount(0);
  await expect(
    menu.getByRole("button", { name: "Cerrar sesión" }),
  ).toBeVisible();
});

test("the green Salir beside a title is gone from the screens that carried it", async ({
  page,
  context,
  baseURL,
}) => {
  const ana = await createMember("Ana Sin Salir");
  const casa = await createSpaceFor(ana.id, "Casa", "COP");
  await startSession(context, baseURL!, ana);

  for (const url of ["/espacios", `/espacios/${casa.id}`, "/espacios/nuevo"]) {
    await page.goto(url);

    // One unconfirmed tap from ending a session, on every screen inside a
    // Space and on the list above them. There is now exactly one place a
    // Member signs out, and it is two deliberate taps deep.
    await expect(page.getByRole("button", { name: "Salir" })).toHaveCount(0);
  }
});

test("creating a Space carries neither the header nor the hamburger", async ({
  page,
  context,
  baseURL,
}) => {
  const ana = await createMember("Ana Crea");
  await startSession(context, baseURL!, ana);

  await page.goto("/espacios/nuevo");

  // A Space's name and currency are typed and not yet saved, so this screen
  // trades the shell for room -- the same trade the Movement entry screen and
  // both plan-item correction screens make (ADR-0047, ADR-0059). It used to
  // render the account row anyway, which is the drift this closes.
  await expect(page.getByRole("banner")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Abrir menú del Espacio" }),
  ).toHaveCount(0);
});
