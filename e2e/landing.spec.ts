import { expect, test } from "@playwright/test";
import {
  createMember,
  createSpaceFor,
  inviteToSpace,
  leaveSpace,
  startSession,
} from "./session";

// Deliberately not the signed-in fixture: what "/" answers is read off real
// membership rows, so the session has to belong to a Member the database has.

/*
 * Where the app opens (#108). Every one of these goes through "/" and never
 * through "/espacios": the redirect is the whole subject, and a spec that
 * navigated to the list directly would pass no matter what "/" decided.
 */

test("a Member with one Space lands in it, not on a list of one", async ({
  page,
  context,
  baseURL,
}) => {
  const ana = await createMember("Ana Sola");
  const casa = await createSpaceFor(ana.id, "Casa de Ana", "ARS");
  await startSession(context, baseURL!, ana);

  await page.goto("/");

  // Straight to the Budget. A card whose only job is to be the only option is
  // a screen and a tap paid on every single opening of the app.
  await expect(page).toHaveURL(new RegExp(`/espacios/${casa.id}$`));
});

test("a Member with several Spaces and none opened still lands on the list", async ({
  page,
  context,
  baseURL,
}) => {
  const beto = await createMember("Beto Elige");
  await createSpaceFor(beto.id, "Casa de Beto", "ARS");
  await createSpaceFor(beto.id, "Viaje de Beto", "USD");
  await startSession(context, baseURL!, beto);

  await page.goto("/");

  await expect(page).toHaveURL(/\/espacios$/);
  await expect(page.getByRole("link", { name: "Casa de Beto" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Viaje de Beto" })).toBeVisible();
});

test("a Member who lives in one of several lands back in that one", async ({
  page,
  context,
  baseURL,
}) => {
  const cora = await createMember("Cora Vuelve");
  await createSpaceFor(cora.id, "Casa de Cora", "ARS");
  const viaje = await createSpaceFor(cora.id, "Viaje de Cora", "USD");
  await startSession(context, baseURL!, cora);

  // Opening the Space is what marks it, so this goes through the list the way
  // a person would. The landed-on URL and not the heading, for the reason
  // `space-list.spec.ts` gives: a `goto` fired at the heading cancels the very
  // request that does the marking.
  await page.goto("/espacios");
  await page.getByRole("link", { name: "Viaje de Cora" }).click();
  await expect(page).toHaveURL(new RegExp(`/espacios/${viaje.id}$`));

  await page.goto("/");

  // The count rule would have thrown her at the list here, and she is the
  // Member with the most to gain from not being.
  await expect(page).toHaveURL(new RegExp(`/espacios/${viaje.id}$`));
});

test("a waiting Invitation keeps the landing on the list", async ({
  page,
  context,
  baseURL,
}) => {
  const dora = await createMember("Dora Invita");
  const emi = await createMember("Emi Invitado");
  const casa = await createSpaceFor(dora.id, "Casa de Dora", "ARS");
  // Emi has a Space of his own, which is what makes this the case that
  // matters: one Space, invited to his second. Without the yield he would be
  // dropped into his own Budget and never see the seat, because `/espacios` is
  // the only screen in the product that shows one.
  await createSpaceFor(emi.id, "Depto de Emi", "ARS");
  await inviteToSpace(casa, dora.id, emi.email);
  await startSession(context, baseURL!, emi);

  await page.goto("/");

  await expect(page).toHaveURL(/\/espacios$/);
  await expect(page.getByText("Te invitaron")).toBeVisible();
  await expect(page.getByText("Casa de Dora")).toBeVisible();
});

test("a Space last opened and since left lands on the list, not on a 404", async ({
  page,
  context,
  baseURL,
}) => {
  const fran = await createMember("Fran Se Fue");
  await createSpaceFor(fran.id, "Casa de Fran", "ARS");
  await createSpaceFor(fran.id, "Viaje de Fran", "USD");
  const monte = await createSpaceFor(fran.id, "Monte de Fran", "USD");
  await startSession(context, baseURL!, fran);

  await page.goto("/espacios");
  await page.getByRole("link", { name: "Monte de Fran" }).click();
  await expect(page).toHaveURL(new RegExp(`/espacios/${monte.id}$`));

  // The membership goes, the moment on it does not: `last_opened_at` now names
  // a Space that is no longer theirs.
  await leaveSpace(monte.id, fran.id);

  await page.goto("/");

  await expect(page).toHaveURL(/\/espacios$/);
  await expect(page.getByRole("link", { name: "Casa de Fran" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Monte de Fran" }),
  ).toHaveCount(0);
});
