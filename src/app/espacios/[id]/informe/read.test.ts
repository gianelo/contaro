import { expect, it } from "vitest";
import { calendarDate, month } from "@/domain/calendar/month";
import { reportOfClosedMonth } from "@/domain/space/report";
import { handleReadMonthReport, type ReportPorts } from "./read";
const space = {
  id: "home", name: "Casa", currency: "COP", createdBy: "ana", locale: "es-CO" as const
} as const;
const of = month("2026-09");
const report = { ...reportOfClosedMonth({
    space, closed: {
      spaceId: "home", month: of, closedBy: "ana", closedOn: calendarDate("2026-10-03")
    }, items: [], movements: [], categories: []
  }), members: [{ id: "ana", name: "Ana" }, { id: "beto", name: "Beto" }] };
const ports: ReportPorts = {
  readSession: async () => ({ memberId: "beto" }), findSpace: async () => space, readReport: async () => report
};
it("lets the invited Member obtain a closed-month report", async () => {
  await expect(handleReadMonthReport(ports, space.id, of)).resolves.toEqual({ kind: "ready", report });
});
it("also lets the Creator obtain it", async () => {
  await expect(handleReadMonthReport({ ...ports, readSession: async () => ({ memberId: "ana" }) }, space.id, of)).resolves.toMatchObject({ kind: "ready" });
});
it.each([
  ["not-signed-in", { readSession: async () => null }],
  ["no-such-space", { findSpace: async () => null }],
])("refuses %s before reading financial data", async (kind, refusal) => {
  await expect(handleReadMonthReport({
    ...ports, ...refusal, readReport: async () => { throw new Error("Private data must not be read"); }
  }, space.id, of)).resolves.toEqual({ kind });
});
it("refuses an open month and never closes it to make a report", async () => {
  await expect(handleReadMonthReport({ ...ports, readReport: async () => null }, space.id, of)).resolves.toEqual({ kind: "month-open" });
});
it("refuses a malformed month without reading financial data", async () => {
  await expect(handleReadMonthReport({ ...ports, readReport: async () => { throw new Error("Must not read"); } }, space.id, "2026-99")).resolves.toEqual({ kind: "no-such-month" });
});
it("returns a failure instead of disguising an unavailable database as an open month", async () => {
  const cause = new Error("Unavailable");
  await expect(handleReadMonthReport({ ...ports, readReport: async () => { throw cause; } }, space.id, of)).resolves.toEqual({ kind: "failed", cause });
});
it("reads again on each request rather than retaining a generated artifact", async () => {
  let latest = report;
  const source = { ...ports, readReport: async () => latest };
  await expect(handleReadMonthReport(source, space.id, of)).resolves.toEqual({ kind: "ready", report });
  latest = { ...report, space: { ...space, name: "Renamed Space" } };
  await expect(handleReadMonthReport(source, space.id, of)).resolves.toEqual({ kind: "ready", report: latest });
});
