import { expect, test } from "@playwright/test";
import { createDatabase, databaseUrl } from "../src/db/connection";
import { createMember, createSpaceFor, joinSpace, startSession } from "./session";
import { months } from "./months";

test.use({ locale: "es-AR" });

test("the first Space route announces the close once; Budget keeps its row", async ({ page, context, baseURL }) => {
  const creator = await createMember("Creator Close");
  const space = await createSpaceFor(creator.id, "Close route", "ARS");
  const { previous } = months();
  const { sql } = createDatabase(databaseUrl(), { max: 1 });
  try {
    await sql`UPDATE space_members SET joined_at = ${`${previous}-01`}::timestamptz,
      last_opened_at = ${`${previous}-15`}::timestamptz
      WHERE space_id = ${space.id} AND member_id = ${creator.id}`;
  } finally {
    await sql.end();
  }
  await startSession(context, baseURL!, creator);

  await page.goto(`/espacios/${space.id}/movimientos`);
  await expect(page.getByRole("dialog", { name: /Cerrar / })).toBeVisible();
  await expect(page.getByRole("group", { name: "Cierre del mes" })).toHaveCount(0);
  await page.getByRole("button", { name: "Todavía no" }).click();
  await page.goto(`/espacios/${space.id}`);
  await expect(page.getByRole("dialog", { name: /Cerrar / })).toHaveCount(0);
  await expect(page.getByRole("group", { name: "Cierre del mes" }).getByText(/terminó/)).toBeVisible();
});

test("an invited Member sees no automatic close sheet", async ({ page, context, baseURL }) => {
  const creator = await createMember("Creator Invites");
  const invited = await createMember("Invited Close");
  const space = await createSpaceFor(creator.id, "Shared close", "ARS");
  await joinSpace(space.id, invited.id);
  const { previous } = months();
  const { sql } = createDatabase(databaseUrl(), { max: 1 });
  try {
    await sql`UPDATE space_members SET joined_at = ${`${previous}-01`}::timestamptz,
      last_opened_at = ${`${previous}-15`}::timestamptz
      WHERE space_id = ${space.id} AND member_id = ${invited.id}`;
  } finally {
    await sql.end();
  }
  await startSession(context, baseURL!, invited);
  await page.goto(`/espacios/${space.id}/movimientos`);
  await expect(page.getByRole("dialog", { name: /Cerrar / })).toHaveCount(0);
  await page.goto(`/espacios/${space.id}`);
  await expect(page.getByText(/espera que Creator Invites lo cierre/)).toBeVisible();
});
