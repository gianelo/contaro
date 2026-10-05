// @vitest-environment node
import { expect, it } from "vitest";
import { monthlyReport } from "@/reports/month-fixture";
import type { ReportPorts } from "./read";
import { downloadMonthReport } from "./download";

const report = monthlyReport();
const source: ReportPorts = {
  readSession: async () => ({ memberId: "beto" }),
  findSpace: async (_id, memberId) => report.members.some((member) => member.id === memberId) ? report.space : null,
  readReport: async () => report,
};

it.each(["ana", "beto"])("lets Member %s download a private closed-month PDF", async (memberId) => {
  const response = await downloadMonthReport({ ...source, readSession: async () => ({ memberId }) }, "home", "2026-09");
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toBe("application/pdf");
  expect(response.headers.get("content-disposition")).toBe('attachment; filename="contaro-2026-09.pdf"');
  expect(response.headers.get("cache-control")).toContain("private, no-store");
  expect(Buffer.from(await response.arrayBuffer()).subarray(0, 5).toString()).toBe("%PDF-");
});

it.each([
  [401, { readSession: async () => null }],
  [404, { readSession: async () => ({ memberId: "outsider" }) }],
  [409, { readReport: async () => null }],
  [500, { readReport: async () => { throw new Error("secret database password"); } }],
])("keeps refusal %s private and never leaks internal details", async (status, overrides) => {
  const response = await downloadMonthReport({ ...source, ...overrides }, "home", "2026-09");
  expect(response.status).toBe(status);
  expect(response.headers.get("cache-control")).toContain("private, no-store");
  expect(response.headers.get("content-disposition")).toBeNull();
  const body = await response.text();
  expect(body).not.toContain("secret database password");
  expect(body).not.toContain("Compra mensual");
});

it("rejects invalid months before reading a month's financial details", async () => {
  const response = await downloadMonthReport({ ...source, readReport: async () => { throw new Error("Must not read"); } }, "home", "2026-99");
  expect(response.status).toBe(400);
  expect(response.headers.get("cache-control")).toContain("no-store");
});

it("regenerates with the latest labels and generation time on each download", async () => {
  let current = report;
  const ports = { ...source, readReport: async () => current };
  const first = await downloadMonthReport(ports, "home", "2026-09", new Date("2026-10-05T15:00:00Z"));
  current = { ...report, space: { ...report.space, name: "Casa nueva" } };
  const again = await downloadMonthReport(ports, "home", "2026-09", new Date("2026-10-06T15:00:00Z"));
  expect(again.status).toBe(200);
  expect(new Uint8Array(await again.arrayBuffer())).not.toEqual(new Uint8Array(await first.arrayBuffer()));
});
