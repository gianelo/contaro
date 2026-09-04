import { describe, expect, it } from "vitest";
import { calendarDate, month } from "../calendar/month";
import type { Category } from "../category/category";
import { money } from "../money/money";
import type { Movement } from "../movement/movement";
import type { Space } from "../space/space";
import {
  amendItem,
  comparedToPlan,
  expected,
  expectedByCategory,
  planItem,
  UnplannableBudgetItemError,
  type BudgetItem,
  type Planning,
} from "./budget";

const CASA: Space = { id: "space-casa", name: "Casa", currency: "ARS" };

const COMIDA: Category = {
  id: "cat-food",
  spaceId: null,
  parentId: null,
  label: { kind: "catalogue", slug: "food" },
};

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

const expense = (changes: Partial<Movement> = {}): Movement => ({
  id: "mov-1",
  spaceId: CASA.id,
  direction: "expense",
  categoryId: SUPER.id,
  amount: money(60_000_00, "ARS"),
  occurredOn: calendarDate("2026-09-12"),
  recordedBy: "member-gian",
  attributedTo: "member-gian",
  ...changes,
});

describe("spending measured against the plan", () => {
  it("says what a Category has spent against what it expects", () => {
    expect(
      comparedToPlan(
        [item({ amount: money(400_000_00, "ARS") })],
        [expense({ amount: money(210_000_00, "ARS") })],
        [SUPER, MATE],
        "ARS",
      ),
    ).toEqual([
      {
        categoryId: SUPER.id,
        expected: money(400_000_00, "ARS"),
        spent: money(210_000_00, "ARS"),
        over: null,
        share: 0.525,
      },
    ]);
  });

  // The comment on `CategoryBranch` has said this since #10: a plan on a
  // heading covers the whole of it. A Member who budgets for "Comida" and
  // shops under "Comida · Súper" would otherwise read zero spent all month,
  // which is a comparison that is wrong rather than one that is empty.
  it("counts a shop under a Category against the plan on its heading", () => {
    expect(
      comparedToPlan(
        [item({ categoryId: COMIDA.id, amount: money(400_000_00, "ARS") })],
        [expense({ categoryId: SUPER.id, amount: money(210_000_00, "ARS") })],
        [COMIDA, SUPER, MATE],
        "ARS",
      ),
    ).toEqual([
      {
        categoryId: COMIDA.id,
        expected: money(400_000_00, "ARS"),
        spent: money(210_000_00, "ARS"),
        over: null,
        share: 0.525,
      },
    ]);
  });
});

describe("passing what a Category expected", () => {
  // The rule the ticket is named for. Three shops of a hundred and fifty
  // thousand are each comfortably inside a plan of four hundred, and the
  // month is fifty thousand over. Anything that compared a Movement, or one
  // weekly item, against its own share would call this month fine.
  it("is decided by the Category's monthly total and never by one Movement", () => {
    const [comparison] = comparedToPlan(
      [
        item({ id: "w1", amount: money(200_000_00, "ARS") }),
        item({ id: "w2", amount: money(200_000_00, "ARS") }),
      ],
      [
        expense({ id: "m1", amount: money(150_000_00, "ARS") }),
        expense({ id: "m2", amount: money(150_000_00, "ARS") }),
        expense({ id: "m3", amount: money(150_000_00, "ARS") }),
      ],
      [SUPER, MATE],
      "ARS",
    );

    expect(comparison?.spent).toEqual(money(450_000_00, "ARS"));
    expect(comparison?.over).toEqual(money(50_000_00, "ARS"));
  });

  it("says nothing about it while the total is still inside the plan", () => {
    const [comparison] = comparedToPlan(
      [item({ amount: money(400_000_00, "ARS") })],
      [expense({ amount: money(400_000_00, "ARS") })],
      [SUPER, MATE],
      "ARS",
    );

    // Spending exactly what was planned is not passing it. "Over by nothing"
    // would put a red line on a month that landed on the figure.
    expect(comparison?.over).toBeNull();
  });

  // The share is what the meter is drawn from, and it keeps going past 1 so
  // the drawing decides what to do about that rather than the arithmetic.
  it("goes past the whole of what it expected, and says so as a share too", () => {
    const [comparison] = comparedToPlan(
      [item({ amount: money(400_000_00, "ARS") })],
      [expense({ amount: money(600_000_00, "ARS") })],
      [SUPER, MATE],
      "ARS",
    );

    expect(comparison?.share).toBe(1.5);
  });
});

describe("what a comparison leaves out", () => {
  // A Category is the dimension a Budget is measured on, and income carries
  // none (ADR-0016). A salary landing in a month is not the month's groceries.
  it("leaves income out of what a Category has spent", () => {
    const [comparison] = comparedToPlan(
      [item({ amount: money(400_000_00, "ARS") })],
      [
        expense({ id: "m1", amount: money(60_000_00, "ARS") }),
        expense({
          id: "m2",
          direction: "income",
          categoryId: null,
          amount: money(900_000_00, "ARS"),
        }),
      ],
      [SUPER, MATE],
      "ARS",
    );

    expect(comparison?.spent).toEqual(money(60_000_00, "ARS"));
  });

  it("leaves out Movements filed under a Category this row is not about", () => {
    const [comparison] = comparedToPlan(
      [item({ categoryId: SUPER.id, amount: money(400_000_00, "ARS") })],
      [expense({ categoryId: MATE.id, amount: money(9_000_00, "ARS") })],
      [SUPER, MATE],
      "ARS",
    );

    expect(comparison?.spent).toEqual(money(0, "ARS"));
  });

  // The rows are the plan's. Spending on a Category nobody planned for has no
  // expectation to be measured against, so a line for it would be a
  // comparison with one half missing.
  it("draws no line for a Category the month never planned for", () => {
    expect(
      comparedToPlan(
        [item({ categoryId: SUPER.id })],
        [expense({ categoryId: MATE.id })],
        [SUPER, MATE],
        "ARS",
      ).map(({ categoryId }) => categoryId),
    ).toEqual([SUPER.id]);
  });
});

describe("a plan and its spending in two different currencies", () => {
  // Converting behind a person's back is the one thing ADR-0007 exists to
  // prevent, and a comparison is exactly where a conversion would hide.
  it("is a refusal rather than a conversion", () => {
    expect(() =>
      comparedToPlan(
        [item({ amount: money(400_000_00, "ARS") })],
        [expense({ amount: money(210_000_00, "CLP") })],
        [SUPER, MATE],
        "ARS",
      ),
    ).toThrow();
  });
});
