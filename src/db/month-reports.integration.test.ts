// @vitest-environment node
import { afterAll, expect, it } from "vitest";
import { calendarDate, month } from "@/domain/calendar/month";
import { createDatabase, databaseUrl } from "./connection";
import { memberFromGoogle } from "./members";
import { createSpaceForMember } from "./spaces";
import { findSpaceForMember } from "./spaces";
import { addCategoryToSpace } from "./categories";
import { planBudgetItemInSpace, planFixedItemInSpace, payFixedItemInSpace } from "./budget-items";
import { recordMovementInSpace, strikeMovementInSpace } from "./movements";
import { money } from "@/domain/money/money";
import { handleReadMonthReport } from "@/app/espacios/[id]/informe/read";
import { closeMonthInSpace } from "./closed-months";
import { readClosedMonthReport } from "./month-reports";
const { db, sql } = createDatabase(databaseUrl(), { max: 1 });
afterAll(async () => { await sql.end(); });
it("reads a persisted closed month and refuses an open month", async () => {
  const member = await memberFromGoogle(db, {
    subject: `report-${process.pid}-${Date.now()}`, email: "report@example.com", name: "Ana"
  });
  const space = await createSpaceForMember(db, member.id, { name: "Report Space", currency: "COP" });
  const of = month("2026-09");
  await expect(readClosedMonthReport(db, space, of)).resolves.toBeNull();
  await closeMonthInSpace(db, {
    space, closedBy: member.id, today: calendarDate("2026-10-03")
  }, of);
  const report = await readClosedMonthReport(db, space, of);
  expect(report?.space.locale).toBe("es-CO");
  expect(report?.closed).toMatchObject({
    month: of, closedBy: member.id, closedOn: "2026-10-03"
  });
  expect(report?.members).toEqual([{ id: member.id, name: "Ana" }]);
  expect(report?.plan).toEqual([]);
});
it("prepares the same financial detail for both Members on every request", async () => {
  const suffix = `${process.pid}-${Date.now()}`;
  const ana = await memberFromGoogle(db, {
    subject: `report-ana-${suffix}`, email: "report-ana@example.com", name: "Ana"
  });
  const beto = await memberFromGoogle(db, {
    subject: `report-beto-${suffix}`, email: "report-beto@example.com", name: "Beto"
  });
  const outsider = await memberFromGoogle(db, {
    subject: `report-outside-${suffix}`, email: "report-outside@example.com", name: "Other"
  });
  const space = await createSpaceForMember(db, ana.id, { name: "Full Report", currency: "COP" });
  await sql `INSERT INTO space_members (space_id, member_id) VALUES (${space.id}, ${beto.id})`;
  const category = await addCategoryToSpace(db, {
    spaceId: space.id, parentId: null, name: "Report expenses"
  });
  const of = month("2026-09");
  const draft = {
    spaceId: space.id, month: of, categoryId: category.id
  };
  const variable = await planBudgetItemInSpace(db, space, {
    ...draft, amount: 10000, name: "Groceries"
  });
  const fixed = await planFixedItemInSpace(db, space, {
    ...draft, amount: 2000, name: "Subscription", dueDay: 5
  });
  const pending = await planFixedItemInSpace(db, space, {
    ...draft, amount: 3000, name: "Unpaid", dueDay: 10
  });
  const recorder = {
    space, recordedBy: ana.id, today: calendarDate("2026-09-30")
  };
  await payFixedItemInSpace(db, recorder, fixed.id);
  const shop = await recordMovementInSpace(db, recorder, {
    spaceId: space.id, direction: "expense", categoryId: category.id, amount: 7000, occurredOn: "2026-09-12", attributedTo: beto.id, name: "Market"
  });
  const voided = await recordMovementInSpace(db, recorder, {
    spaceId: space.id, direction: "expense", categoryId: category.id, amount: 9000, occurredOn: "2026-09-12", attributedTo: ana.id, name: "Mistake"
  });
  await strikeMovementInSpace(db, space.id, voided.id, ana.id);
  await closeMonthInSpace(db, {
    space, closedBy: ana.id, today: calendarDate("2026-10-03")
  }, of);
  const read = (memberId: string) => handleReadMonthReport({
    readSession: async () => ({ memberId }), findSpace: (id, member) => findSpaceForMember(db, id, member), readReport: (found, asked) => readClosedMonthReport(db, found, asked)
  }, space.id, of);
  const creator = await read(ana.id);
  expect(creator.kind).toBe("ready");
  if (creator.kind !== "ready")
    throw new Error("The creator could not read the report.");
  expect(creator.report.plan.map((item) => item.id)).toEqual([variable.id, fixed.id, pending.id]);
  expect(creator.report.fixed.map(({ item, paid }) => ({ id: item.id, paid }))).toEqual([{ id: fixed.id, paid: true }, { id: pending.id, paid: false }]);
  expect(creator.report.movements.map((entry) => entry.id)).toContain(shop.id);
  expect(creator.report.movements.map((entry) => entry.id)).not.toContain(voided.id);
  expect(creator.report.totals).toMatchObject({ expected: money(15000, "COP"), spent: money(9000, "COP") });
  expect(creator.report.balance).toEqual({
    from: of, kind: "surplus", amount: money(6000, "COP")
  });
  expect(creator.report.categories).toContainEqual({
    category, expected: money(15000, "COP"), spent: money(9000, "COP"), difference: money(6000, "COP")
  });
  await expect(read(beto.id)).resolves.toEqual(creator);
  await expect(read(ana.id)).resolves.toEqual(creator);
  await expect(read(outsider.id)).resolves.toEqual({ kind: "no-such-space" });
  await expect(recordMovementInSpace(db, recorder, {
    spaceId: space.id, direction: "expense", categoryId: category.id, amount: 100, occurredOn: "2026-09-12", attributedTo: ana.id, name: null
  })).rejects.toThrow("is closed");
  await expect(read(ana.id)).resolves.toEqual(creator);
});
