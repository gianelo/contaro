import { expect, it } from "vitest";
import { month, calendarDate } from "../calendar/month";
import { money } from "../money/money";
import type { BudgetItem } from "../budget/budget";
import type { Movement } from "../movement/movement";
import { reportOfClosedMonth } from "./report";
const space = {
  id: "home", name: "Casa", currency: "COP", createdBy: "ana", locale: "es-CO" as const
} as const;
const of = month("2026-09");
const closed = {
  spaceId: space.id, month: of, closedBy: "ana", closedOn: calendarDate("2026-10-03")
};
const categories = [{
    id: "food", spaceId: null, parentId: null, label: { kind: "catalogue", slug: "food" }
  }] as const;
const item: BudgetItem = {
  id: "plan", spaceId: space.id, month: of, kind: "variable", categoryId: "food", name: "Groceries", amount: money(10000, "COP")
};
const movement: Movement = {
  id: "shop", spaceId: space.id, direction: "expense", categoryId: "food", name: "Market", amount: money(7000, "COP"), occurredOn: calendarDate("2026-09-12"), recordedBy: "ana", attributedTo: "beto", carriedFrom: null
};
it("prepares full closed-month detail and the final surplus, not today's pace", () => {
  const report = reportOfClosedMonth({
    space, closed, items: [item], movements: [movement], categories
  });
  expect(report.plan).toEqual([item]);
  expect(report.movements).toEqual([movement]);
  expect(report.totals).toMatchObject({ expected: money(10000, "COP"), spent: money(7000, "COP") });
  expect(report.balance).toEqual({
    from: of, kind: "surplus", amount: money(3000, "COP")
  });
  expect(report.pace).toEqual({
    day: 30, days: 30, standing: { kind: "behind", by: money(3000, "COP") }
  });
});
it("includes paid and unpaid Fixed items and Categories with unplanned spending", () => {
  const fixed: BudgetItem = {
    ...item, id: "rent", kind: "fixed", name: "Rent", categoryId: "rent", dueOn: calendarDate("2026-09-05"), payment: null
  };
  const paid: BudgetItem = {
    ...fixed, id: "paid", payment: { movementId: "payment", struckAt: null }
  };
  const rent = { ...categories[0], id: "rent" };
  const other = { ...categories[0], id: "other" };
  const report = reportOfClosedMonth({
    space, closed, items: [fixed, paid], movements: [{ ...movement, categoryId: "other" }], categories: [...categories, rent, other]
  });
  expect(report.fixed).toEqual([{ item: fixed, paid: false }, { item: paid, paid: true }]);
  expect(report.categories).toEqual([
    {
      category: rent, expected: money(20000, "COP"), spent: money(0, "COP")
    },
    {
      category: other, expected: money(0, "COP"), spent: money(7000, "COP")
    },
  ]);
  expect(report.pace).toBeNull();
});
it("never includes another month or another Space in the report", () => {
  const report = reportOfClosedMonth({
    space, closed, categories, items: [item, {
        ...item, id: "other", month: month("2026-10")
      }], movements: [movement, {
        ...movement, id: "foreign", spaceId: "elsewhere"
      }, {
        ...movement, id: "october", occurredOn: calendarDate("2026-10-01")
      }]
  });
  expect(report.plan).toEqual([item]);
  expect(report.movements).toEqual([movement]);
  expect(() => reportOfClosedMonth({
    space, closed: { ...closed, spaceId: "elsewhere" }, categories, items: [], movements: []
  })).toThrow();
});
it("uses the existing deficit rule and does not invent a deficit for an unplanned month", () => {
  const source = {
    space, closed, categories, items: [item], movements: [{ ...movement, amount: money(13000, "COP") }]
  };
  expect(reportOfClosedMonth(source).balance).toEqual({
    from: of, kind: "deficit", amount: money(3000, "COP")
  });
  expect(reportOfClosedMonth({ ...source, items: [] }).balance).toBeNull();
  expect(reportOfClosedMonth({ ...source, movements: [{ ...movement, amount: money(10000, "COP") }] }).balance).toBeNull();
});
it("rolls up a heading's spending while keeping every child Category and Movement", () => {
  const child = {
    ...categories[0], id: "groceries", parentId: "food"
  };
  const report = reportOfClosedMonth({
    space, closed, categories: [...categories, child], items: [item], movements: [{ ...movement, categoryId: "groceries" }]
  });
  expect(report.categories).toEqual([
    {
      category: categories[0], expected: money(10000, "COP"), spent: money(7000, "COP")
    },
    {
      category: child, expected: money(0, "COP"), spent: money(7000, "COP")
    },
  ]);
  expect(report.totals.spent).toEqual(money(7000, "COP"));
});
it("keeps a struck Fixed payment pending and income out of expense totals", () => {
  const fixed: BudgetItem = {
    ...item, kind: "fixed", dueOn: calendarDate("2026-09-05"), payment: { movementId: "struck", struckAt: new Date("2026-09-06") }
  };
  const income: Movement = {
    ...movement, id: "salary", direction: "income", categoryId: null, amount: money(25000, "COP")
  };
  const report = reportOfClosedMonth({
    space, closed, categories, items: [fixed], movements: [movement, income]
  });
  expect(report.fixed[0]?.paid).toBe(false);
  expect(report.income).toEqual(money(25000, "COP"));
  expect(report.totals.spent).toEqual(money(7000, "COP"));
});
