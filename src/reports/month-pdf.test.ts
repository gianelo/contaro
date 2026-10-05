// @vitest-environment node
import { expect, it } from "vitest";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { monthlyFixture, monthlyReport } from "./month-fixture";
import { renderMonthPdf } from "./month-pdf";
import { reportOfClosedMonth } from "@/domain/space/report";
import { money } from "@/domain/money/money";

const generatedAt = new Date("2026-10-05T15:00:00Z");

export async function readPdf(bytes: Uint8Array) {
  const pdf = await getDocument({ data: new Uint8Array(bytes), useSystemFonts: false }).promise;
  const pages: string[] = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const text = await page.getTextContent();
    pages.push(text.items.map((item) => "str" in item ? item.str : "").join(" ").replace(/\s+/g, " "));
  }
  await pdf.destroy();
  return pages;
}

it("renders the complete closed month, keeping net balance separate from the plan", async () => {
  const bytes = await renderMonthPdf(monthlyReport(), generatedAt);
  expect(Buffer.from(bytes).subarray(0, 5).toString()).toBe("%PDF-");
  const pages = await readPdf(bytes);
  expect(pages).toHaveLength(3);
  const text = pages.join(" ").replace(/\s+/g, " ");
  expect(text).toContain("Informe mensual");
  expect(text).toContain("septiembre de 2026");
  expect(text).toContain("Mes cerrado");
  expect(text).toContain("300.000");
  expect(text).toContain("210.000");
  expect(text).toContain("Ritmo al cierre");
  expect(text).toContain("Suscripción sin pagar");
  expect(text).toContain("Nunca se pagó");
  expect(text).not.toContain("Vencido");
  expect(text).not.toContain("Pendiente");
  expect(text).toContain("Compra mensual");
  expect(text).toContain("Beto");
  expect(text).toContain("Fecha del movimiento");
  expect(text).not.toContain("fecha de registro");
  expect(text).not.toContain("DATOS DE EJEMPLO");
  for (const [index, page] of pages.entries()) {
    expect(page).toContain("Casa");
    expect(page).toContain(`${index + 1} / 3`);
    expect(page).toContain("2026");
  }
});

it("continues full tables onto further pages without dropping or duplicating movements", async () => {
  const source = monthlyFixture();
  const original = source.movements[0];
  if (!original) throw new Error("The fixture must include an expense.");
  const rows = Array.from({ length: 120 }, (_, index) => ({ ...original, id: `row-${index}`, amount: money(1000, "COP"), name: `Movimiento único ${String(index).padStart(3, "0")}` }));
  const pages = await readPdf(await renderMonthPdf({ ...reportOfClosedMonth({ ...source, movements: rows }), members: source.members }, generatedAt));
  expect(pages.length).toBeGreaterThan(3);
  const all = pages.join(" ");
  for (let index = 0; index < 120; index++) {
    expect(all.split(`Movimiento único ${String(index).padStart(3, "0")}`)).toHaveLength(2);
  }
  for (const page of pages.slice(2)) {
    expect(page).toContain("Fecha del movimiento");
    expect(page).toContain("septiembre de 2026");
    expect(page).toContain("Generado:");
  }
}, 15000);

it("shows an empty closed month honestly without inventing a budget, pace or deficit", async () => {
  const source = monthlyFixture();
  const empty = { ...reportOfClosedMonth({ ...source, items: [], movements: [], categories: [] }), members: source.members };
  const text = (await readPdf(await renderMonthPdf(empty, generatedAt))).join(" ");
  expect(text).toContain("Sin presupuesto");
  expect(text).toContain("Sin ritmo");
  expect(text).toContain("No se registraron movimientos");
  expect(text).not.toContain("Déficit presupuestario:");
});

it("preserves user-entered names even when they contain non-Latin characters", async () => {
  const report = monthlyReport();
  const text = (await readPdf(await renderMonthPdf({ ...report, space: { ...report.space, name: "Casa Ж 中 😀" } }, generatedAt))).join(" ");
  expect(text).toContain("Casa Ж 中 😀");
});

it("lets the overview grow around a wide valid negative total instead of overprinting it", async () => {
  const source = monthlyFixture();
  const original = source.movements[0];
  if (!original) throw new Error("The fixture must contain an expense.");
  const movements = [{ ...original, amount: money(999_999_999_999_000, "PYG") }];
  const report = { ...reportOfClosedMonth({ ...source, space: { ...source.space, currency: "PYG" }, items: [], movements }), members: source.members };
  const pdf = await getDocument({ data: await renderMonthPdf(report, generatedAt) }).promise;
  try {
    const page = await pdf.getPage(1);
    const { items } = await page.getTextContent();
    const text = items.filter((item) => "str" in item);
    const label = text.find((item) => item.str === "Ingresos menos gastos registrados");
    expect(label).toBeDefined();
    if (!label) throw new Error("The net description must be present.");
    const figures = text.filter((item) => item.height > 20 && /PYG|999|000/.test(item.str));
    expect(figures.length).toBeGreaterThan(0);
    for (const item of figures) {
      expect((item.transform[5] ?? 0) - item.height * .25).toBeGreaterThan((label.transform[5] ?? 0) + label.height * .75);
    }
  } finally {
    await pdf.destroy();
  }
});
