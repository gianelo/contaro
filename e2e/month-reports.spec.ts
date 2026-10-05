import { readFile } from "node:fs/promises";
import { createDatabase, databaseUrl } from "../src/db/connection";
import { expect, test } from "@playwright/test";
import { createMember, createSpaceFor, closeMonth, joinSpace, startSession } from "./session";

const of = "2026-09";

test("either Member can regenerate a closed-month PDF through the independent selector", async ({ page, context, baseURL }, testInfo) => {
  const creator = await createMember("Informe Ana");
  const invitee = await createMember("Informe Beto");
  const space = await createSpaceFor(creator.id, "Casa del informe", "COP");
  await joinSpace(space.id, invitee.id);
  await populateReport(space.id, creator.id, invitee.id);
  await closeMonth(space.id, "2025-12", creator.id);
  await closeMonth(space.id, of, creator.id);
  for (const member of [creator, invitee]) {
    await startSession(context, baseURL!, member);
    await page.goto(`/espacios/${space.id}?mes=2026-10`);
    await page.getByRole("button", { name: "Descargar PDF" }).click();
    const dialog = page.getByRole("dialog", { name: "Informe mensual" });
    await expect(dialog.getByRole("combobox", { name: "Mes" })).toHaveValue(of);
    await expect(dialog.getByRole("option", { name: "octubre" })).toHaveCount(0);
    await dialog.getByRole("combobox", { name: "Año" }).selectOption("2025");
    await expect(dialog.getByRole("combobox", { name: "Mes" })).toHaveValue("2025-12");
    await dialog.getByRole("combobox", { name: "Año" }).selectOption("2026");
    const downloaded = page.waitForEvent("download");
    await dialog.getByRole("button", { name: "Descargar PDF" }).click();
    const download = await downloaded;
    expect(download.suggestedFilename()).toBe("contaro-2026-09.pdf");
    expect(await download.failure()).toBeNull();
    const file = testInfo.outputPath(`month-${member.id}.pdf`);
    await download.saveAs(file);
    expect((await readFile(file)).subarray(0, 5).toString()).toBe("%PDF-");
    await page.screenshot({ path: testInfo.outputPath("download-entry.png") });
    await expect(dialog).not.toBeVisible();
    const response = await context.request.get(`/api/espacios/${space.id}/informe?mes=${of}`, { headers: { "Accept-Language": "en-US" } });
    expect(response.status()).toBe(200);
    expect(response.headers()["cache-control"]).toContain("private, no-store");
    expect((await response.body()).subarray(0, 5).toString()).toBe("%PDF-");
  }
});

test("the production endpoint refuses open months, outsiders and signed-out requests", async ({ context, baseURL }) => {
  const creator = await createMember("Report owner");
  const outsider = await createMember("Report outsider");
  const space = await createSpaceFor(creator.id, "Informe privado", "COP");
  await closeMonth(space.id, of, creator.id);
  await startSession(context, baseURL!, creator);
  const open = await context.request.get(`/api/espacios/${space.id}/informe?mes=2026-10`);
  expect(open.status()).toBe(409);
  expect(open.headers()["cache-control"]).toContain("no-store");
  await startSession(context, baseURL!, outsider);
  const hidden = await context.request.get(`/api/espacios/${space.id}/informe?mes=${of}`);
  expect(hidden.status()).toBe(404);
  expect(hidden.headers()["cache-control"]).toContain("no-store");
  await context.clearCookies();
  const signedOut = await context.request.get(`/api/espacios/${space.id}/informe?mes=${of}`);
  expect(signedOut.status()).toBe(401);
  expect(signedOut.headers()["cache-control"]).toContain("no-store");
});

/** A complete synthetic month; the production route reads these real rows. */
async function populateReport(spaceId: string, creatorId: string, inviteeId: string) {
  const { sql } = createDatabase(databaseUrl(), { max: 1 });
  try {
    const [category] = await sql`INSERT INTO categories (space_id, name) VALUES (${spaceId}, 'Comida') RETURNING id`;
    if (!category) throw new Error("The fixture needs its Category.");
    await sql`INSERT INTO budget_items (space_id, category_id, month, amount, kind, name)
      VALUES (${spaceId}, ${category.id}, ${of}, 5000000, 'variable', 'Mercado del mes')`;
    await sql`INSERT INTO budget_items (space_id, category_id, month, amount, kind, name, due_on)
      VALUES (${spaceId}, ${category.id}, ${of}, 10000, 'fixed', 'Suscripción sin pagar', '2026-09-05')`;
    await sql`INSERT INTO movements (space_id, direction, amount, occurred_on, recorded_by, attributed_to, name)
      VALUES (${spaceId}, 'income', 3000000, '2026-09-01', ${creatorId}, ${creatorId}, 'Ingreso de Ana'),
        (${spaceId}, 'income', 2100000, '2026-09-15', ${inviteeId}, ${inviteeId}, 'Ingreso de Beto')`;
    for (let index = 0; index < 18; index++) {
      const member = index % 2 === 0 ? creatorId : inviteeId;
      const day = `2026-09-${String(index + 2).padStart(2, "0")}`;
      await sql`INSERT INTO movements (space_id, direction, category_id, amount, occurred_on, recorded_by, attributed_to, name)
        VALUES (${spaceId}, 'expense', ${category.id}, ${index === 17 ? 3100000 : 100000}, ${day}, ${member}, ${member}, ${`Compra ${index + 1}`})`;
    }
  } finally {
    await sql.end();
  }
}
