import { expect, test } from "@playwright/test";
import { createMember, signedInMember, startSession } from "./session";

// Deliberately not the signed-in fixture: these are about the door itself.

test("a signed-out visit lands on the sign-in screen", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/ingresar/);
  await expect(
    page.getByRole("button", { name: "Entrar con Google" }),
  ).toBeVisible();
});

test("a signed-out request to the API is refused", async ({ request }) => {
  const response = await request.get("/api/me");

  expect(response.status()).toBe(401);
  expect(await response.json()).toEqual({ error: "not_signed_in" });
});

test("the signed-in Member's name is on the screen", async ({
  page,
  context,
  baseURL,
}) => {
  await startSession(context, baseURL!);
  await page.goto("/");

  // The greeting, and no longer a row above it. ADR-0059 took away the account
  // row that said the name over every screen inside a Space; this screen never
  // needed it, having always opened by saying who arrived.
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    signedInMember.name.split(" ")[0]!,
  );
});

test("signing out ends the session, two deliberate taps in", async ({
  page,
  context,
  baseURL,
}) => {
  await startSession(context, baseURL!);
  await page.goto("/");

  // The way out lives inside the Space menu now (ADR-0059), and the first tap
  // is the door. That is the whole confirmation the old row never had: it sat
  // in accent green beside the title and ended a session on one press.
  await page
    .getByRole("button", { name: "Abrir menú del Espacio" })
    .click();
  await page.getByRole("button", { name: "Cerrar sesión" }).click();

  await expect(page).toHaveURL(/\/ingresar/);

  // And it is really gone: the app is out of reach again.
  await page.goto("/espacios");
  await expect(page).toHaveURL(/\/ingresar/);
});

test("a session resolves to the Member it belongs to, at the API seam", async ({
  context,
  baseURL,
}) => {
  const member = await createMember("Ana Gómez");
  await startSession(context, baseURL!, member);

  const response = await context.request.get("/api/me");

  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({
    id: member.id,
    name: "Ana Gómez",
  });
});

test("a session naming a Member that no longer exists is refused", async ({
  context,
  baseURL,
}) => {
  // `signedInMember` is invented, so nothing in the database answers to it.
  await startSession(context, baseURL!);

  const response = await context.request.get("/api/me");

  expect(response.status()).toBe(401);
  expect(await response.json()).toEqual({ error: "unknown_member" });
});

test("the sign-in screen says why a refused account was refused", async ({
  page,
}) => {
  await page.goto("/ingresar?error=AccessDenied");

  await expect(
    page.locator("main").getByRole("alert"),
  ).toContainText("correo verificado");
});
