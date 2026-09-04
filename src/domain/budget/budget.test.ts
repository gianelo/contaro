import { describe, expect, it } from "vitest";
import { month } from "../calendar/month";
import type { Category } from "../category/category";
import { money } from "../money/money";
import type { Space } from "../space/space";
import {
  amendItem,
  expected,
  expectedByCategory,
  planItem,
  UnplannableBudgetItemError,
  type BudgetItem,
  type Planning,
} from "./budget";

const CASA: Space = { id: "space-casa", name: "Casa", currency: "ARS" };

const SUPER: Category = {
  id: "cat-super",
  spaceId: null,
  parentId: "cat-food",
  label: { kind: "catalogue", slug: "food.groceries" },
};

const MATE: Category = {
  id: "cat-mate",
  spaceId: CASA.id,
  parentId: null,
  label: { kind: "own", name: "Mate" },
};

const ELSEWHERE: Category = {
  id: "cat-asado",
  spaceId: "space-de-otro",
  parentId: null,
  label: { kind: "own", name: "Asado" },
};

const SEPTEMBER = month("2026-09");

const planning = (changes: Partial<Planning> = {}): Planning => ({
  space: CASA,
  categories: [SUPER, MATE],
  ...changes,
});

const draft = (changes: Partial<Parameters<typeof planItem>[0]> = {}) => ({
  spaceId: CASA.id,
  month: "2026-09",
  categoryId: SUPER.id,
  amount: 240_000_00,
  ...changes,
});

describe("planning a Variable item", () => {
  // `toEqual` is exact about the keys, which is where "a Variable item is
  // never marked paid" lives: an item that grew a paid state would fail here.
  it("sets an expected amount for a Category in a month", () => {
    expect(planItem(draft(), planning())).toEqual({
      spaceId: CASA.id,
      month: SEPTEMBER,
      categoryId: SUPER.id,
      amount: money(240_000_00, "ARS"),
    });
  });

  it("refuses a Category this Space cannot see", () => {
    expect(() => planItem(draft({ categoryId: ELSEWHERE.id }), planning()))
      .toThrow(UnplannableBudgetItemError);
  });

  it("refuses a month no calendar has", () => {
    expect(() => planItem(draft({ month: "septiembre" }), planning()))
      .toThrow(UnplannableBudgetItemError);
  });

  it("refuses an expectation of nothing", () => {
    expect(() => planItem(draft({ amount: 0 }), planning()))
      .toThrow(UnplannableBudgetItemError);
  });
});

const item = (changes: Partial<BudgetItem> = {}): BudgetItem => ({
  id: "item-1",
  spaceId: CASA.id,
  month: SEPTEMBER,
  categoryId: SUPER.id,
  amount: money(240_000_00, "ARS"),
  ...changes,
});

describe("several items on one Category", () => {
  // The several exist so a person can think in weeks. They are not several
  // comparisons: what the month expects of a Category is their sum.
  it("behave as a single item of their combined amount", () => {
    const weekly = [
      item({ id: "w1", amount: money(60_000_00, "ARS") }),
      item({ id: "w2", amount: money(60_000_00, "ARS") }),
      item({ id: "w3", amount: money(55_000_00, "ARS") }),
      item({ id: "w4", amount: money(65_000_00, "ARS") }),
    ];
    const whole = [item({ id: "m1", amount: money(240_000_00, "ARS") })];

    expect(expectedByCategory(weekly, "ARS")).toEqual(
      expectedByCategory(whole, "ARS"),
    );
  });

  it("are one entry per Category, and the Categories are all there", () => {
    expect(
      expectedByCategory(
        [
          item({ id: "a", categoryId: SUPER.id, amount: money(60_000_00, "ARS") }),
          item({ id: "b", categoryId: MATE.id, amount: money(9_000_00, "ARS") }),
          item({ id: "c", categoryId: SUPER.id, amount: money(40_000_00, "ARS") }),
        ],
        "ARS",
      ),
    ).toEqual([
      { categoryId: SUPER.id, expected: money(100_000_00, "ARS") },
      { categoryId: MATE.id, expected: money(9_000_00, "ARS") },
    ]);
  });
});

describe("what a Budget expects of the month", () => {
  it("adds every item up, whatever Category they are on", () => {
    expect(
      expected(
        [
          item({ id: "a", categoryId: SUPER.id, amount: money(60_000_00, "ARS") }),
          item({ id: "b", categoryId: MATE.id, amount: money(9_000_00, "ARS") }),
        ],
        "ARS",
      ),
    ).toEqual(money(69_000_00, "ARS"));
  });

  // A month nobody has planned is still a figure, in the Space's money.
  it("is zero when the month has no plan yet", () => {
    expect(expected([], "ARS")).toEqual(money(0, "ARS"));
  });
});

describe("correcting an item", () => {
  it("changes the expected amount and leaves the rest standing", () => {
    expect(
      amendItem(item(), { amount: 300_000_00 }, planning()),
    ).toEqual(item({ amount: money(300_000_00, "ARS") }));
  });

  it("moves it to another Category this Space can see", () => {
    expect(
      amendItem(item(), { categoryId: MATE.id }, planning()),
    ).toEqual(item({ categoryId: MATE.id }));
  });

  it("holds a correction to every rule the planning was held to", () => {
    expect(() => amendItem(item(), { amount: 0 }, planning()))
      .toThrow(UnplannableBudgetItemError);
    expect(() => amendItem(item(), { categoryId: ELSEWHERE.id }, planning()))
      .toThrow(UnplannableBudgetItemError);
  });

  // A refused correction changes nothing rather than landing its good half.
  it("refuses an item planned in another Space", () => {
    expect(() =>
      amendItem(item({ spaceId: "space-de-otro" }), { amount: 1 }, planning()),
    ).toThrow(UnplannableBudgetItemError);
  });
});
