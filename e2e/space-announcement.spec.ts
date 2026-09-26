import { expect, test } from "@playwright/test";
import { createDatabase, databaseUrl } from "../src/db/connection";
import { categoriesTheSpaceCanSee } from "../src/db/categories";
import { planBudgetItemInSpace } from "../src/db/budget-items";
import { recordMovementInSpace } from "../src/db/movements";
import { calendarDate } from "../src/domain/calendar/month";
import { closeMonth, createMember, createSpaceFor, joinSpace, startSession } from "./session";
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

test("the first full-screen Movement entry announces before returning to Budget", async ({ page, context, baseURL }) => {
  const creator = await createMember("Creator Entry Close");
  const space = await createSpaceFor(creator.id, "Entry close", "ARS");
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
  await page.goto(`/espacios/${space.id}/movimientos/nuevo`);
  await expect(page.getByRole("dialog", { name: /Cerrar / })).toBeVisible();
  await expect(page.getByRole("group", { name: "Cierre del mes" })).toHaveCount(0);
  await page.getByRole("button", { name: "Todavía no" }).click();
  await page.goto(`/espacios/${space.id}`);
  await expect(page.getByRole("dialog", { name: /Cerrar / })).toHaveCount(0);
  await expect(page.getByRole("group", { name: "Cierre del mes" }).getByText(/terminó/)).toBeVisible();
});

test("the first full-screen Budget entry announces without changing Cancel", async ({ page, context, baseURL }) => {
  const creator = await createMember("Creator Plan Close");
  const space = await createSpaceFor(creator.id, "Plan close", "ARS");
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
  await page.goto(`/espacios/${space.id}/presupuesto/nuevo`);
  await expect(page.getByRole("dialog", { name: /Cerrar / })).toBeVisible();
  await expect(page.getByRole("group", { name: "Cierre del mes" })).toHaveCount(0);
  await page.getByRole("button", { name: "Todavía no" }).click();
  await page.getByRole("link", { name: "Cancelar" }).click();
  await expect(page.getByRole("dialog", { name: /Cerrar / })).toHaveCount(0);
  await expect(page.getByRole("group", { name: "Cierre del mes" }).getByText(/terminó/)).toBeVisible();
});

test("the first Movement correction announces once and preserves Cancel", async ({ page, context, baseURL }) => {
  const creator = await createMember("Creator Movement Correction");
  const space = await createSpaceFor(creator.id, "Correction close", "ARS");
  const { previous } = months();
  const { db, sql } = createDatabase(databaseUrl(), { max: 1 });
  let movementId: string;
  try {
    const categories = await categoriesTheSpaceCanSee(db, space.id);
    const category = categories.find((item) => item.label.kind === "catalogue" && item.label.slug === "food.groceries");
    if (!category) throw new Error("Groceries category missing");
    const today = calendarDate(new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit",
    }).format(new Date()));
    const movement = await recordMovementInSpace(db, { space, recordedBy: creator.id, today }, {
      spaceId: space.id, direction: "expense", categoryId: category.id,
      amount: 1200, occurredOn: today, attributedTo: null, name: "Correction fixture",
    });
    movementId = movement.id;
    await sql`UPDATE space_members SET joined_at = ${`${previous}-01`}::timestamptz,
      last_opened_at = ${`${previous}-15`}::timestamptz
      WHERE space_id = ${space.id} AND member_id = ${creator.id}`;
  } finally {
    await sql.end();
  }
  await startSession(context, baseURL!, creator);
  await page.goto(`/espacios/${space.id}/movimientos/${movementId}`);
  await expect(page.getByRole("dialog", { name: /Cerrar / })).toBeVisible();
  await expect(page.getByRole("group", { name: "Cierre del mes" })).toHaveCount(0);
  await page.getByRole("button", { name: "Todavía no" }).click();
  await page.getByRole("link", { name: "Cancelar" }).click();
  await expect(page).toHaveURL(new RegExp(`/espacios/${space.id}/movimientos$`));
  await expect(page.getByRole("dialog", { name: /Cerrar / })).toHaveCount(0);
  await page.goto(`/espacios/${space.id}`);
  await expect(page.getByRole("group", { name: "Cierre del mes" }).getByText(/terminó/)).toBeVisible();
});

test("the first Budget item correction announces once and preserves Cancel", async ({ page, context, baseURL }) => {
  const creator = await createMember("Creator Budget Correction");
  const space = await createSpaceFor(creator.id, "Plan correction close", "ARS");
  const { previous, thisMonth } = months();
  const { db, sql } = createDatabase(databaseUrl(), { max: 1 });
  let itemId: string;
  try {
    const categories = await categoriesTheSpaceCanSee(db, space.id);
    const category = categories.find((item) => item.label.kind === "catalogue" && item.label.slug === "food.groceries");
    if (!category) throw new Error("Groceries category missing");
    const item = await planBudgetItemInSpace(db, space, {
      spaceId: space.id, month: thisMonth, categoryId: category.id,
      amount: 2400, name: "Correction fixture",
    });
    itemId = item.id;
    await sql`UPDATE space_members SET joined_at = ${`${previous}-01`}::timestamptz,
      last_opened_at = ${`${previous}-15`}::timestamptz
      WHERE space_id = ${space.id} AND member_id = ${creator.id}`;
  } finally {
    await sql.end();
  }
  await startSession(context, baseURL!, creator);
  await page.goto(`/espacios/${space.id}/presupuesto/${itemId}`);
  await expect(page.getByRole("dialog", { name: /Cerrar / })).toBeVisible();
  await expect(page.getByRole("group", { name: "Cierre del mes" })).toHaveCount(0);
  await page.getByRole("button", { name: "Todavía no" }).click();
  await page.getByRole("link", { name: "Cancelar" }).click();
  await expect(page).toHaveURL(new RegExp(`/espacios/${space.id}\\?mes=${thisMonth}$`));
  await expect(page.getByRole("dialog", { name: /Cerrar / })).toHaveCount(0);
  await expect(page.getByRole("group", { name: "Cierre del mes" }).getByText(/terminó/)).toBeVisible();
});

test("a closed Movement correction still announces the open previous month", async ({ page, context, baseURL }) => {
  const creator = await createMember("Creator Closed Movement");
  const space = await createSpaceFor(creator.id, "Closed Movement close", "ARS");
  const { previous } = months();
  const closedMonth = new Date(`${previous}-01T12:00:00Z`);
  closedMonth.setUTCMonth(closedMonth.getUTCMonth() - 1);
  const older = closedMonth.toISOString().slice(0, 7);
  const { db, sql } = createDatabase(databaseUrl(), { max: 1 });
  let movementId: string;
  try {
    const categories = await categoriesTheSpaceCanSee(db, space.id);
    const category = categories.find((item) => item.label.kind === "catalogue" && item.label.slug === "food.groceries");
    if (!category) throw new Error("Groceries category missing");
    const occurredOn = calendarDate(`${older}-15`);
    const movement = await recordMovementInSpace(db, { space, recordedBy: creator.id, today: occurredOn }, {
      spaceId: space.id, direction: "expense", categoryId: category.id,
      amount: 1200, occurredOn, attributedTo: null, name: "Closed correction fixture",
    });
    movementId = movement.id;
    await sql`UPDATE space_members SET joined_at = ${`${older}-01`}::timestamptz,
      last_opened_at = ${`${previous}-15`}::timestamptz
      WHERE space_id = ${space.id} AND member_id = ${creator.id}`;
  } finally {
    await sql.end();
  }
  await closeMonth(space.id, older, creator.id);
  await startSession(context, baseURL!, creator);
  await page.goto(`/espacios/${space.id}/movimientos/${movementId}`);
  await expect(page.getByRole("dialog", { name: /Cerrar / })).toBeVisible();
  await expect(page.getByRole("group", { name: "Cierre del mes" })).toHaveCount(0);
  await page.getByRole("button", { name: "Todavía no" }).click();
  await page.getByRole("link", { name: "Cancelar" }).click();
  await expect(page).toHaveURL(new RegExp(`/espacios/${space.id}/movimientos$`));
  await expect(page.getByRole("dialog", { name: /Cerrar / })).toHaveCount(0);
  await page.goto(`/espacios/${space.id}`);
  await expect(page.getByRole("group", { name: "Cierre del mes" }).getByText(/terminó/)).toBeVisible();
});

test("a closed Budget item correction still announces the open previous month", async ({ page, context, baseURL }) => {
  const creator = await createMember("Creator Closed Budget");
  const space = await createSpaceFor(creator.id, "Closed Budget close", "ARS");
  const { previous } = months();
  const closedMonth = new Date(`${previous}-01T12:00:00Z`);
  closedMonth.setUTCMonth(closedMonth.getUTCMonth() - 1);
  const older = closedMonth.toISOString().slice(0, 7);
  const { db, sql } = createDatabase(databaseUrl(), { max: 1 });
  let itemId: string;
  try {
    const categories = await categoriesTheSpaceCanSee(db, space.id);
    const category = categories.find((item) => item.label.kind === "catalogue" && item.label.slug === "food.groceries");
    if (!category) throw new Error("Groceries category missing");
    const item = await planBudgetItemInSpace(db, space, {
      spaceId: space.id, month: older, categoryId: category.id,
      amount: 2400, name: "Closed correction fixture",
    });
    itemId = item.id;
    await sql`UPDATE space_members SET joined_at = ${`${older}-01`}::timestamptz,
      last_opened_at = ${`${previous}-15`}::timestamptz
      WHERE space_id = ${space.id} AND member_id = ${creator.id}`;
  } finally {
    await sql.end();
  }
  await closeMonth(space.id, older, creator.id);
  await startSession(context, baseURL!, creator);
  await page.goto(`/espacios/${space.id}/presupuesto/${itemId}`);
  await expect(page.getByRole("dialog", { name: /Cerrar / })).toBeVisible();
  await expect(page.getByRole("group", { name: "Cierre del mes" })).toHaveCount(0);
  await page.getByRole("button", { name: "Todavía no" }).click();
  await page.getByRole("link", { name: "Cancelar" }).click();
  await expect(page).toHaveURL(new RegExp(`/espacios/${space.id}\\?mes=${older}$`));
  await expect(page.getByRole("dialog", { name: /Cerrar / })).toHaveCount(0);
  await page.goto(`/espacios/${space.id}`);
  await expect(page.getByRole("group", { name: "Cierre del mes" }).getByText(/terminó/)).toBeVisible();
});

test("an invited Member's first full-screen entry never opens the Creator's sheet", async ({ page, context, baseURL }) => {
  const creator = await createMember("Creator Full Screen");
  const invited = await createMember("Invited Full Screen");
  const space = await createSpaceFor(creator.id, "Shared entry close", "ARS");
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
  await page.goto(`/espacios/${space.id}/movimientos/nuevo`);
  await expect(page.getByRole("dialog", { name: /Cerrar / })).toHaveCount(0);
  await expect(page.getByRole("group", { name: "Cierre del mes" })).toHaveCount(0);
  await page.goto(`/espacios/${space.id}`);
  await expect(page.getByText(/espera que Creator Full Screen lo cierre/)).toBeVisible();
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
