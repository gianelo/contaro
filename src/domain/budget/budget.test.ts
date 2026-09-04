import { describe, expect, it } from "vitest";
import { calendarDate, month } from "../calendar/month";
import type { Category } from "../category/category";
import { money } from "../money/money";
import type { Movement } from "../movement/movement";
import type { Space } from "../space/space";
import {
  amendItem,
  comparedToPlan,
  dueNotice,
  expected,
  expectedByCategory,
  FixedItemAlreadyPaidError,
  isPaid,
  MAX_FIXED_ITEM_NAME_LENGTH,
  paymentFor,
  planFixedItem,
  planItem,
  UnplannableBudgetItemError,
  type FixedItem,
  type Planning,
  type VariableItem,
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
      kind: "variable",
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

const item = (changes: Partial<VariableItem> = {}): VariableItem => ({
  kind: "variable",
  id: "item-1",
  spaceId: CASA.id,
  month: SEPTEMBER,
  categoryId: SUPER.id,
  amount: money(240_000_00, "ARS"),
  ...changes,
});

const fixed = (changes: Partial<FixedItem> = {}): FixedItem => ({
  kind: "fixed",
  id: "fixed-1",
  spaceId: CASA.id,
  month: SEPTEMBER,
  categoryId: MATE.id,
  amount: money(180_000_00, "ARS"),
  name: "Arriendo",
  dueOn: calendarDate("2026-09-01"),
  movementId: null,
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

  // The heading is a Category a Movement may be filed on directly, not only a
  // box holding others, so its plan answers for both (ADR-0021). A rollup that
  // read only the children would drop the shop nobody bothered to file deeper.
  it("adds a shop on the heading itself to the shops filed under it", () => {
    expect(
      comparedToPlan(
        [item({ categoryId: COMIDA.id, amount: money(400_000_00, "ARS") })],
        [
          expense({
            id: "m1",
            categoryId: COMIDA.id,
            amount: money(90_000_00, "ARS"),
          }),
          expense({
            id: "m2",
            categoryId: SUPER.id,
            amount: money(210_000_00, "ARS"),
          }),
        ],
        [COMIDA, SUPER, MATE],
        "ARS",
      ),
    ).toEqual([
      {
        categoryId: COMIDA.id,
        expected: money(400_000_00, "ARS"),
        spent: money(300_000_00, "ARS"),
        over: null,
        share: 0.75,
      },
    ]);
  });

  // A plan on a heading and a plan on one of its Categories are a cap and a
  // sub-limit inside it, not two readings of the same thing. One shop counts
  // against both, and neither row is lying (ADR-0021): "Comida" is what the
  // whole of it may cost, "Comida · Súper" is how much of that this one may
  // take.
  it("counts one shop against both its own plan and its heading's", () => {
    expect(
      comparedToPlan(
        [
          item({
            id: "item-comida",
            categoryId: COMIDA.id,
            amount: money(400_000_00, "ARS"),
          }),
          item({
            id: "item-super",
            categoryId: SUPER.id,
            amount: money(300_000_00, "ARS"),
          }),
        ],
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
      {
        categoryId: SUPER.id,
        expected: money(300_000_00, "ARS"),
        spent: money(210_000_00, "ARS"),
        over: null,
        share: 0.7,
      },
    ]);
  });

  // The sub-limit only ever narrows. A shop filed on the heading itself is
  // spending "Comida" has to answer for and "Comida · Súper" has not, so the
  // subtree is read upwards and never down.
  it("leaves out a shop on the heading, for the plan on a Category under it", () => {
    expect(
      comparedToPlan(
        [item({ categoryId: SUPER.id, amount: money(400_000_00, "ARS") })],
        [expense({ categoryId: COMIDA.id, amount: money(210_000_00, "ARS") })],
        [COMIDA, SUPER, MATE],
        "ARS",
      ),
    ).toEqual([
      {
        categoryId: SUPER.id,
        expected: money(400_000_00, "ARS"),
        spent: money(0, "ARS"),
        over: null,
        share: 0,
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

const fixedDraft = (
  changes: Partial<Parameters<typeof planFixedItem>[0]> = {},
) => ({
  spaceId: CASA.id,
  month: "2026-09",
  categoryId: MATE.id,
  amount: 180_000_00,
  name: "Arriendo",
  dueDay: 1,
  ...changes,
});

describe("planning a Fixed item", () => {
  // `toEqual` is exact about the keys, which is where the whole difference
  // between the two kinds lives: a name, a day it falls due on, and the
  // Movement that marking it paid will create.
  it("is an amount on a Category, called something, due on a day", () => {
    expect(planFixedItem(fixedDraft(), planning())).toEqual({
      kind: "fixed",
      spaceId: CASA.id,
      month: SEPTEMBER,
      categoryId: MATE.id,
      amount: money(180_000_00, "ARS"),
      name: "Arriendo",
      dueOn: calendarDate("2026-09-01"),
      movementId: null,
    });
  });

  // The day is a day *of the plan's month* and never a date somebody typed,
  // so an item can never fall due outside the month it is planned on.
  it("puts the due day inside the month being planned", () => {
    expect(
      planFixedItem(fixedDraft({ month: "2026-02", dueDay: 22 }), planning())
        .dueOn,
    ).toBe("2026-02-22");
  });

  it("refuses a day the month being planned does not have", () => {
    expect(() =>
      planFixedItem(fixedDraft({ month: "2026-02", dueDay: 30 }), planning()),
    ).toThrow(UnplannableBudgetItemError);
  });

  it("refuses a day no month has at all", () => {
    expect(() => planFixedItem(fixedDraft({ dueDay: 0 }), planning())).toThrow(
      UnplannableBudgetItemError,
    );
    expect(() => planFixedItem(fixedDraft({ dueDay: 32 }), planning())).toThrow(
      UnplannableBudgetItemError,
    );
  });

  it("trims the name", () => {
    expect(planFixedItem(fixedDraft({ name: "  Netflix  " }), planning()).name)
      .toBe("Netflix");
  });

  // The name is the whole of what the row is called: a Fixed item is read by
  // it, not by its Category, and a blank one is a row nobody can tell from
  // the next one.
  it("refuses a name that is not one", () => {
    expect(() => planFixedItem(fixedDraft({ name: "   " }), planning()))
      .toThrow(UnplannableBudgetItemError);
    expect(() =>
      planFixedItem(
        fixedDraft({ name: "a".repeat(MAX_FIXED_ITEM_NAME_LENGTH + 1) }),
        planning(),
      ),
    ).toThrow(UnplannableBudgetItemError);
  });

  // Every rule a Variable item is held to is one rule, asked here too.
  it("is held to every rule the other kind is held to", () => {
    expect(() =>
      planFixedItem(fixedDraft({ categoryId: ELSEWHERE.id }), planning()),
    ).toThrow(UnplannableBudgetItemError);
    expect(() => planFixedItem(fixedDraft({ amount: 0 }), planning())).toThrow(
      UnplannableBudgetItemError,
    );
    expect(() =>
      planFixedItem(fixedDraft({ month: "septiembre" }), planning()),
    ).toThrow(UnplannableBudgetItemError);
  });

  it("is planned pending, because nothing has been paid yet", () => {
    expect(isPaid(planFixedItem(fixedDraft(), planning()))).toBe(false);
  });
});

describe("whether a Fixed item is paid", () => {
  // Paid is not a flag beside the Movement, it *is* the Movement. Two facts
  // that have to agree are two facts that eventually will not.
  it("is the Movement marking it paid created, and nothing else", () => {
    expect(isPaid(fixed({ movementId: null }))).toBe(false);
    expect(isPaid(fixed({ movementId: "mov-1" }))).toBe(true);
  });
});

describe("marking a Fixed item paid", () => {
  const paying = { space: CASA, today: calendarDate("2026-09-18") };

  it("asks for one expense, for its amount and its Category", () => {
    expect(paymentFor(fixed(), paying)).toEqual({
      spaceId: CASA.id,
      direction: "expense",
      categoryId: MATE.id,
      amount: 180_000_00,
      occurredOn: "2026-09-18",
      attributedTo: null,
    });
  });

  // The day the money moved is the day somebody said it did, which is today
  // — not the day the plan expected it to. A subscription charged late is an
  // expense of the day it was charged.
  it("dates it today and never on the day it fell due", () => {
    expect(
      paymentFor(fixed({ dueOn: calendarDate("2026-09-01") }), paying)
        .occurredOn,
    ).toBe("2026-09-18");
  });

  // Null, which `recordMovement` reads as the Member doing the recording.
  // Written down here rather than guessed at, so the recap on the
  // confirmation and the Movement that lands cannot disagree.
  it("attributes it to whoever is marking it paid", () => {
    expect(paymentFor(fixed(), paying).attributedTo).toBeNull();
  });

  it("refuses an item that is already paid", () => {
    expect(() => paymentFor(fixed({ movementId: "mov-1" }), paying)).toThrow(
      FixedItemAlreadyPaidError,
    );
  });

  it("refuses an item planned in another Space", () => {
    expect(() =>
      paymentFor(fixed({ spaceId: "space-de-otro" }), paying),
    ).toThrow(UnplannableBudgetItemError);
  });
});

describe("a Fixed item falling due", () => {
  const on = (day: string) => calendarDate(`2026-09-${day}`);

  it("says nothing while its day is still far off", () => {
    expect(dueNotice(fixed({ dueOn: on("25") }), on("18"))).toBeNull();
  });

  it("counts the days once it is close", () => {
    expect(dueNotice(fixed({ dueOn: on("22") }), on("18"))).toEqual({
      kind: "soon",
      days: 4,
    });
  });

  // Two days a person actually has a word for. "Vence en 1 días" is a
  // sentence nobody says.
  it("names tomorrow and today rather than counting them", () => {
    expect(dueNotice(fixed({ dueOn: on("19") }), on("18"))).toEqual({
      kind: "tomorrow",
    });
    expect(dueNotice(fixed({ dueOn: on("18") }), on("18"))).toEqual({
      kind: "today",
    });
  });

  // The day passing is not the notice going quiet. An unpaid item behind its
  // day is the one a person most needs to be told about, and turning the line
  // grey again on the 23rd would hide exactly that.
  it("says an unpaid item is past its day", () => {
    expect(dueNotice(fixed({ dueOn: on("17") }), on("18"))).toEqual({
      kind: "overdue",
    });
  });

  // A paid item has nothing left to fall due. It says "Pagado", and a second
  // line counting down to a day that no longer matters is noise.
  it("says nothing at all once it is paid", () => {
    expect(
      dueNotice(fixed({ dueOn: on("17"), movementId: "mov-1" }), on("18")),
    ).toBeNull();
    expect(
      dueNotice(fixed({ dueOn: on("19"), movementId: "mov-1" }), on("18")),
    ).toBeNull();
  });
});

describe("a month planned with both kinds of item", () => {
  // "Fixed and Variable items appear together in the month's Budget and sum
  // into its total" (#13). The total is the whole plan or it is not a total.
  it("adds both kinds into what the month expects to cost", () => {
    expect(
      expected(
        [
          item({ amount: money(240_000_00, "ARS") }),
          fixed({ amount: money(180_000_00, "ARS") }),
        ],
        "ARS",
      ),
    ).toEqual(money(420_000_00, "ARS"));
  });

  // A Category planned only with Fixed items has one question — did it get
  // paid — and the Fijos row answers it. A meter beside it would read
  // "$180.000 / 180.000" the moment it was paid, which is a bar drawn to say
  // what the badge already said.
  it("draws no comparison for a Category planned only with Fixed items", () => {
    expect(
      comparedToPlan(
        [fixed({ categoryId: MATE.id })],
        [expense({ categoryId: MATE.id })],
        [SUPER, MATE],
        "ARS",
      ),
    ).toEqual([]);
  });

  // The other half of the same rule, and the one that would be a lie if it
  // went the other way: the Movement a Fixed item creates is spending in its
  // Category like any other, so a denominator that left the Fixed item out
  // would report somebody over on a plan they kept to the peso.
  it("measures a Category against the whole of what was planned for it", () => {
    expect(
      comparedToPlan(
        [
          item({ categoryId: MATE.id, amount: money(50_000_00, "ARS") }),
          fixed({ categoryId: MATE.id, amount: money(89_000_00, "ARS") }),
        ],
        [expense({ categoryId: MATE.id, amount: money(89_000_00, "ARS") })],
        [SUPER, MATE],
        "ARS",
      ),
    ).toEqual([
      {
        categoryId: MATE.id,
        expected: money(139_000_00, "ARS"),
        spent: money(89_000_00, "ARS"),
        over: null,
        share: 89 / 139,
      },
    ]);
  });
});

describe("correcting an item", () => {
  // There is no correction screen for a Fixed item yet, and this is what
  // makes that a gap rather than a hole: the Variable item's correction
  // cannot quietly strip a name, a due day and a payment off one.
  it("refuses a Fixed item outright", () => {
    expect(() => amendItem(fixed(), { amount: 1 }, planning())).toThrow(
      UnplannableBudgetItemError,
    );
  });
});
