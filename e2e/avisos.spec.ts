import { expect, test } from "@playwright/test";
import { addUnpaidFixed, createMember, createSpaceFor, inviteToSpace, joinSpace, setSpaceJoinedAt, startSession } from "./session";

async function readerMonths(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const today = new Date();
    const month = (offset: number) => {
      const date = new Date(today.getFullYear(), today.getMonth() + offset, 1);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    };
    return { current: month(0), previous: month(-1), older: month(-2) };
  });
}

test("a Space header opens account invitations in Avisos without replacing the Budget", async ({ page, context, baseURL }) => {
  const ana = await createMember("Ana Avisos");
  const casa = await createSpaceFor(ana.id, "Casa Avisos", "ARS");
  const other = await createMember("Otro Avisos");
  const elsewhere = await createSpaceFor(other.id, "Otro espacio", "ARS");
  await inviteToSpace(elsewhere, other.id, ana.email);
  await startSession(context, baseURL!, ana);
  await page.goto(`/espacios/${casa.id}`);
  await expect(page.getByRole("heading", { name: "Presupuesto", level: 1 })).toBeVisible();
  await page.getByRole("button", { name: "Avisos" }).click();
  await expect(page.getByRole("dialog", { name: "Avisos" })).toBeVisible();
  await expect(page.getByText("Otro espacio")).toBeVisible();
});

test("Creator keeps first-route announcement and standing row, then reviews the bell close in place", async ({ page, context, baseURL }) => {
  const creator = await createMember("Creadora Cierre");
  const space = await createSpaceFor(creator.id, "Casa cierre", "ARS");
  const { previous } = await readerMonths(page);
  await setSpaceJoinedAt(space.id, creator.id, `${previous}-02T12:00:00Z`);
  await startSession(context, baseURL!, creator);
  await page.goto(`/espacios/${space.id}`);
  const confirmation = page.getByRole("dialog", { name: /Cerrar / });
  await expect(confirmation).toBeVisible();
  await expect(page.getByText(/terminó. Cuando no le falte nada, cerralo/)).toBeVisible();
  await confirmation.getByRole("button", { name: "Todavía no" }).click();
  await page.getByRole("button", { name: "Avisos" }).click();
  const sheet = page.getByRole("dialog", { name: "Avisos" });
  const closeAction = sheet.getByRole("button", { name: "Revisar y cerrar" });
  const closeBox = await closeAction.boundingBox();
  expect(closeBox).not.toBeNull();
  expect(closeBox!.width).toBeGreaterThanOrEqual(44);
  expect(closeBox!.height).toBeGreaterThanOrEqual(44);
  await closeAction.click();
  await expect(confirmation).toBeVisible();
  await expect(confirmation.locator('input[name="mes"]')).toHaveValue(previous);
  await expect(confirmation.getByText("Movimientos")).toBeVisible();
});

test("an invited Member sees their own waiting month and current Fixed items but cannot close", async ({ page, context, baseURL }) => {
  const creator = await createMember("Creadora Avisos");
  const invited = await createMember("Invitada Avisos");
  const space = await createSpaceFor(creator.id, "Casa compartida", "ARS");
  await joinSpace(space.id, invited.id);
  const { current, previous, older } = await readerMonths(page);
  await setSpaceJoinedAt(space.id, creator.id, `${older}-01T12:00:00Z`);
  await setSpaceJoinedAt(space.id, invited.id, `${previous}-02T12:00:00Z`);
  await addUnpaidFixed(space.id, current);
  await startSession(context, baseURL!, invited);
  await page.goto(`/espacios/${space.id}?mes=${previous}`);
  await page.getByRole("button", { name: "Avisos" }).click();
  const sheet = page.getByRole("dialog", { name: "Avisos" });
  const previousName = new Intl.DateTimeFormat("es-AR", { month: "long", timeZone: "UTC" }).format(new Date(`${previous}-01T12:00:00Z`));
  await expect(sheet.getByText(`${previousName} terminó y espera que Creadora Avisos lo cierre.`)).toBeVisible();
  await expect(sheet.getByText(/1 gasto de /i)).toBeVisible();
  await expect(sheet.getByRole("button", { name: "Revisar y cerrar" })).toHaveCount(0);
  const fixed = sheet.getByRole("link");
  await expect(fixed).toHaveAttribute("href", `/espacios/${space.id}/presupuesto?mes=${current}`);
  await expect(sheet.locator('svg path[d="M9 6l6 6-6 6"]')).toHaveCount(1);
  await fixed.click();
  await expect(page).toHaveURL(new RegExp(`/espacios/${space.id}/presupuesto\\?mes=${current}$`));
});
