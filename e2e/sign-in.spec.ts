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

  await expect(
    page.getByRole("region", { name: "Tu sesión" }),
  ).toContainText(signedInMember.name);
});

test("signing out ends the session", async ({ page, context, baseURL }) => {
  await startSession(context, baseURL!);
  await page.goto("/");

  await page.getByRole("button", { name: "Salir" }).click();

  await expect(page).toHaveURL(/\/ingresar/);

  // And it is really gone: the app is out of reach again.
  await page.goto("/movimientos");
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
