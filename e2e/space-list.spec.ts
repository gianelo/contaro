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
});

test("the screen greets whoever landed on it instead of naming itself", async ({
  page,
  context,
  baseURL,
}) => {
  const ana = await createMember("Ana Saluda");
  await createSpaceFor(ana.id, "Casa", "ARS");
  await startSession(context, baseURL!, ana);

  await page.goto("/espacios");

  // #38: a heading that said "Espacios" named the screen to somebody who had
  // just arrived on it and could see that for themselves. Greeted by the name
  // they go by, not by the whole of the one Google handed over.
  await expect(
    page.getByRole("heading", { name: "Hola, Ana", level: 1 }),
  ).toBeVisible();
  await expect(page.getByText("Elegí un espacio para entrar")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Espacios", level: 1 }),
  ).toHaveCount(0);
});

test("each card names who is in the Space and what money it holds", async ({
  page,
  context,
  baseURL,
}) => {
  const beto = await createMember("Beto Fila");
  await createSpaceFor(beto.id, "Casa de Beto", "PYG");
  await startSession(context, baseURL!, beto);

  await page.goto("/espacios");

  // The names moved off the card and onto the circles (#38), so this is where
  // story 4 of #1 is now answered for anybody not reading the colours. Scoped
  // to the list: the greeting draws the same person at the top of the screen.
  const list = page.getByRole("list", { name: "Tus espacios" });

  await expect(list.getByRole("img", { name: "Beto Fila" })).toBeVisible();
  await expect(list.getByText("Solo vos · PYG")).toBeVisible();
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
  // own, without opening either. Scoped past the greeting, which draws Nadia
  // once more at the top of the screen.
  const list = page.getByRole("list", { name: "Tus espacios" });

  // Nadia is on both cards; Omar is only on the one they share.
  await expect(list.getByRole("img", { name: "Nadia Junta" })).toHaveCount(2);
  await expect(list.getByRole("img", { name: "Omar Junta" })).toHaveCount(1);
  await expect(list.getByText("2 miembros · ARS")).toBeVisible();
  await expect(list.getByText("Solo vos · ARS")).toBeVisible();
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

/*
 * Which Space is the one being used (#38). Driven in a real browser and not in
 * jsdom, because what could break it lives there: opening a Space is what
 * marks it, so a router that fetched the other cards on the way past would
 * mark those too and the badge would land on whichever request finished last.
 */
test.describe("the Space being used", () => {
  test("says nothing until a Member has opened one", async ({
    page,
    context,
    baseURL,
  }) => {
    const iris = await createMember("Iris Nueva");
    await createSpaceFor(iris.id, "Casa", "ARS");
    await createSpaceFor(iris.id, "Viaje", "USD");
    await startSession(context, baseURL!, iris);

    await page.goto("/espacios");

    // A badge on a Space nobody has ever been inside is a statement nothing
    // supports.
    await expect(page.getByText("Activo")).toHaveCount(0);
  });

  test("marks the one just opened, and only that one", async ({
    page,
    context,
    baseURL,
  }) => {
    const juan = await createMember("Juan Vuelve");
    const casa = await createSpaceFor(juan.id, "Casa", "ARS");
    await createSpaceFor(juan.id, "Viaje", "USD");
    await startSession(context, baseURL!, juan);

    await page.goto("/espacios");
    await page.getByRole("link", { name: "Casa" }).click();
    await expect(page).toHaveURL(new RegExp(`/espacios/${casa.id}$`));

    await page.goto("/espacios");

    // Exactly one, and it is the card of the Space that was opened.
    await expect(page.getByText("Activo")).toHaveCount(1);
    const marked = page
      .locator("article")
      .filter({ hasText: "Activo" });
    await expect(marked).toContainText("Casa");
    await expect(marked).not.toContainText("Viaje");
  });

  test("moves when a Member goes back to the other one", async ({
    page,
    context,
    baseURL,
  }) => {
    const kira = await createMember("Kira Cambia");
    const casa = await createSpaceFor(kira.id, "Casa", "ARS");
    const viaje = await createSpaceFor(kira.id, "Viaje", "USD");
    await startSession(context, baseURL!, kira);

    await page.goto("/espacios");
    await page.getByRole("link", { name: "Casa" }).click();
    // The landed-on URL and not the heading it renders: the heading streams in
    // before the navigation has committed, and a `goto` fired at that moment
    // cancels the very request that does the marking.
    await expect(page).toHaveURL(new RegExp(`/espacios/${casa.id}$`));

    await page.goto("/espacios");
    await page.getByRole("link", { name: "Viaje" }).click();
    await expect(page).toHaveURL(new RegExp(`/espacios/${viaje.id}$`));

    await page.goto("/espacios");

    await expect(page.getByText("Activo")).toHaveCount(1);
    await expect(
      page.locator("article").filter({ hasText: "Activo" }),
    ).toContainText("Viaje");
  });
});

/*
 * Story 5 of #1, which no ticket ever carried until #38: what the month has
 * cost against what it was planned to, before opening anything. The
 * separators are the reader's (ADR-0014), so a spec pinning a written amount
 * has to say who is reading it.
 */
test.describe("a Member who reads numbers the Argentine way", () => {
  test.use({ locale: "es-AR" });

  test("sees what each month cost against what it was planned to", async ({
    page,
    context,
    baseURL,
  }) => {
    const lena = await createMember("Lena Mide");
    await createSpaceFor(lena.id, "Casa", "ARS");
    await startSession(context, baseURL!, lena);

    await page.goto("/espacios");

    const card = page.locator("article").filter({ hasText: "Casa" });

    // Nothing spent and nothing planned is still two figures. A blank here is
    // the card failing at the one thing it exists to do.
    await expect(card).toContainText("Gastado");
    await expect(card).toContainText("Presupuesto");
    await expect(card.getByText("$ 0,00")).toHaveCount(2);
  });

  test("never sees one of their Spaces show another's money", async ({
    page,
    context,
    baseURL,
  }) => {
    const hugo = await createMember("Hugo Aparte");
    const pesos = await createSpaceFor(hugo.id, "Casa", "ARS");
    const dolares = await createSpaceFor(hugo.id, "Viaje", "USD");
    await startSession(context, baseURL!, hugo);

    // On the list, where the two Spaces are read side by side and a batched
    // read is exactly what could write one in the other's money (ADR-0001).
    await page.goto("/espacios");
    await expect(
      page.locator("article").filter({ hasText: "Casa" }),
    ).toContainText("$ 0,00");
    await expect(
      page.locator("article").filter({ hasText: "Viaje" }),
    ).toContainText("US$ 0,00");

    await page.goto(`/espacios/${pesos.id}`);
    await expect(page.getByRole("region", { name: "Este mes" })).toContainText(
      "$ 0,00",
    );
    await expect(page.getByText("Dólar estadounidense")).toHaveCount(0);

    await page.goto(`/espacios/${dolares.id}`);
    await expect(page.getByRole("region", { name: "Este mes" })).toContainText(
      "US$ 0,00",
    );
    await expect(page.getByText("Peso argentino")).toHaveCount(0);
  });
});

test("the way to make another Space stands where another card would", async ({
  page,
  context,
  baseURL,
}) => {
  const mara = await createMember("Mara Crea");
  await createSpaceFor(mara.id, "Casa", "ARS");
  await startSession(context, baseURL!, mara);

  await page.goto("/espacios");
  await page.getByRole("link", { name: "Crear espacio" }).click();

  await expect(page).toHaveURL(/\/espacios\/nuevo$/);
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
