import { expect, test, type Browser } from "@playwright/test";
import { createMember, createSpaceFor, startSession } from "./session";

// Deliberately not the signed-in fixture: every screen here writes a
// membership row, so both sessions have to belong to Members the database
// really has.

/** A second browser, signed in as somebody else. A couple is two phones. */
async function asMember(
  browser: Browser,
  baseURL: string,
  member: { id: string; name: string; email: string },
) {
  const context = await browser.newContext();
  await startSession(context, baseURL, member);
  return { context, page: await context.newPage() };
}

test("a Member invites their partner, who takes the seat and lands in the Space", async ({
  page,
  context,
  baseURL,
  browser,
}) => {
  const ana = await createMember("Ana Invita");
  const beto = await createMember("Beto Acepta");
  const casa = await createSpaceFor(ana.id, "Casa compartida", "ARS");

  await startSession(context, baseURL!, ana);

  // Ana offers the seat, from the Space's own screen.
  await page.goto(`/espacios/${casa.id}`);
  await page.getByRole("link", { name: "Miembros" }).click();

  await expect(page).toHaveURL(new RegExp(`/espacios/${casa.id}/miembros$`));
  // Scoped to the list: the account slot at the top names the signed-in
  // Member on every screen, so a bare text match would pass without the
  // Members list having rendered at all.
  const members = page.getByLabel("Miembros");
  await expect(members.getByText("Ana Invita")).toBeVisible();

  await page.getByLabel("Correo").fill(beto.email);
  await page.getByRole("button", { name: "Invitar" }).click();

  // The seat now reads as taken: the address is on the screen and the form
  // that offers it is gone.
  await expect(page.getByText(beto.email)).toBeVisible();
  await expect(page.getByLabel("Correo")).toHaveCount(0);

  // Beto, on his own phone, finds it waiting on the first screen he sees.
  const { page: betos } = await asMember(browser, baseURL!, beto);

  await betos.goto("/espacios");
  await expect(betos.getByText("Te invitaron")).toBeVisible();
  await expect(betos.getByText("Te invitó Ana Invita")).toBeVisible();

  await betos.getByRole("button", { name: "Entrar" }).click();

  await expect(betos).toHaveURL(new RegExp(`/espacios/${casa.id}$`));
  // The Budget screen names itself, and the Space he has just joined is the
  // quiet line under the title (#40).
  await expect(
    betos.getByRole("heading", { name: "Presupuesto", level: 1 }),
  ).toBeVisible();
  await expect(betos.getByText(/^Casa compartida · /)).toBeVisible();

  // And now both of them are in it, which is what every later screen reads.
  await page.reload();
  await expect(members.getByText("Beto Acepta")).toBeVisible();
});

test("a Member who was invited can turn it down, and the seat is free again", async ({
  page,
  context,
  baseURL,
  browser,
}) => {
  const cami = await createMember("Cami Invita");
  const dani = await createMember("Dani Rechaza");
  const casa = await createSpaceFor(cami.id, "Depto", "ARS");

  await startSession(context, baseURL!, cami);
  await page.goto(`/espacios/${casa.id}/miembros`);
  await page.getByLabel("Correo").fill(dani.email);
  await page.getByRole("button", { name: "Invitar" }).click();
  await expect(page.getByText(dani.email)).toBeVisible();

  const { page: danis } = await asMember(browser, baseURL!, dani);
  await danis.goto("/espacios");
  await danis.getByRole("button", { name: "Rechazar" }).click();

  await expect(danis.getByText("Te invitaron")).toHaveCount(0);

  // The Space can offer the seat again, which is the whole point of the row
  // being answered rather than left waiting forever (ADR-0017).
  await page.reload();
  await expect(page.getByLabel("Correo")).toBeVisible();
});

test("a Space with an invitation waiting cannot offer the seat twice", async ({
  page,
  context,
  baseURL,
}) => {
  const eli = await createMember("Eli Invita");
  const casa = await createSpaceFor(eli.id, "Casa", "ARS");

  await startSession(context, baseURL!, eli);
  await page.goto(`/espacios/${casa.id}/miembros`);

  await page.getByLabel("Correo").fill("primera@example.com");
  await page.getByRole("button", { name: "Invitar" }).click();

  await expect(page.getByText("primera@example.com")).toBeVisible();
  // Not offered and then refused: the form is simply not on the screen while
  // somebody is holding the seat.
  await expect(page.getByLabel("Correo")).toHaveCount(0);

  // Taking it back is what frees it, and it is the only thing that does.
  await page.getByRole("button", { name: "Cancelar" }).click();

  await expect(page.getByLabel("Correo")).toBeVisible();
  await expect(page.getByText("primera@example.com")).toHaveCount(0);
});

test("an address that is not an address is refused where it was typed", async ({
  page,
  context,
  baseURL,
}) => {
  const fede = await createMember("Fede Escribe");
  const casa = await createSpaceFor(fede.id, "Casa", "ARS");

  await startSession(context, baseURL!, fede);
  await page.goto(`/espacios/${casa.id}/miembros`);

  // `type="email"` would stop most of these at the browser, so this is one the
  // browser is happy with and `inviteToSpace` is not: a domain with no dot.
  await page.getByLabel("Correo").fill("beto@localhost");
  await page.getByRole("button", { name: "Invitar" }).click();

  await expect(
    page.getByRole("alert").filter({ hasText: "correo" }),
  ).toContainText("no parece un correo");
});
