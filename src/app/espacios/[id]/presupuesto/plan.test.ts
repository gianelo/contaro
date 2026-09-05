import { describe, expect, it, vi } from "vitest";
import {
  FixedItemAlreadyPaidError,
  UnplannableBudgetItemError,
  type BudgetItem,
  type BudgetItemDraft,
  type FixedItem,
  type FixedItemDraft,
} from "@/domain/budget/budget";
import { calendarDate, month } from "@/domain/calendar/month";
import { money } from "@/domain/money/money";
import type { Movement } from "@/domain/movement/movement";
import type { Space } from "@/domain/space/space";
import {
  handleAmendBudgetItem,
  handleAmendFixedItem,
  handlePayFixedItem,
  handlePlanBudgetItem,
  handlePlanFixedItem,
  handleRemoveBudgetItem,
  refusalMessage,
  type BudgetPorts,
} from "./plan";

const CASA: Space = { id: "space-casa", name: "Casa", currency: "ARS" };
const GIAN = "member-gian";

const PLANNED: BudgetItem = {
  kind: "variable",
  id: "item-1",
  spaceId: CASA.id,
  month: month("2026-09"),
  categoryId: "cat-super",
  amount: money(240_000_00, "ARS"),
};

const TODAY = calendarDate("2026-09-18");

const FIXED: FixedItem = {
  kind: "fixed",
  id: "fixed-1",
  spaceId: CASA.id,
  month: month("2026-09"),
  categoryId: "cat-vivienda",
  amount: money(1_800_000_00, "ARS"),
  name: "Arriendo",
  dueOn: calendarDate("2026-09-01"),
  payment: null,
};

const PAYMENT: Movement = {
  id: "mov-1",
  spaceId: CASA.id,
  direction: "expense",
  categoryId: "cat-vivienda",
  amount: money(1_800_000_00, "ARS"),
  occurredOn: TODAY,
  recordedBy: GIAN,
  attributedTo: GIAN,
};

const fixedDraft: FixedItemDraft = {
  spaceId: CASA.id,
  month: "2026-09",
  categoryId: "cat-vivienda",
  amount: 1_800_000_00,
  name: "Arriendo",
  dueDay: 1,
};

const draft: BudgetItemDraft = {
  spaceId: CASA.id,
  month: "2026-09",
  categoryId: "cat-super",
  amount: 240_000_00,
};

const ports = (changes: Partial<BudgetPorts> = {}): BudgetPorts => ({
  readSession: async () => ({ memberId: GIAN }),
  findSpace: async () => CASA,
  today: () => TODAY,
  plan: async () => PLANNED,
  planFixed: async () => FIXED,
  amend: async () => PLANNED,
  amendFixed: async () => FIXED,
  remove: async () => true,
  pay: async () => PAYMENT,
  ...changes,
});

describe("planning an item from the screen", () => {
  it("plans it, once the Member has been proved to be in the Space", async () => {
    expect(await handlePlanBudgetItem(ports(), draft)).toEqual({
      kind: "planned",
      item: PLANNED,
    });
  });

  // A form field is a claim: without this, the Space somebody plans in is the
  // Space whose identifier they guessed.
  it("plans it in the Space the session proves, and refuses one it does not", async () => {
    const plan = vi.fn(async () => PLANNED);

    const outcome = await handlePlanBudgetItem(
      ports({ findSpace: async () => null, plan }),
      draft,
    );

    expect(outcome).toEqual({ kind: "no-such-space" });
    expect(plan).not.toHaveBeenCalled();
  });

  it("refuses a signed-out visitor before it looks anything up", async () => {
    const findSpace = vi.fn(async () => CASA);

    expect(
      await handlePlanBudgetItem(
        ports({ readSession: async () => null, findSpace }),
        draft,
      ),
    ).toEqual({ kind: "not-signed-in" });
    expect(findSpace).not.toHaveBeenCalled();
  });

  it("names the field a refused answer was on", async () => {
    const outcome = await handlePlanBudgetItem(
      ports({
        plan: async () => {
          throw new UnplannableBudgetItemError("amount", "it expects nothing");
        },
      }),
      draft,
    );

    expect(outcome).toEqual({ kind: "rejected", field: "amount" });
  });

  // A dropped connection is ours, and saying "the amount is wrong" would send
  // somebody to correct a field that was never the problem.
  it("keeps our failures apart from the person's", async () => {
    const outcome = await handlePlanBudgetItem(
      ports({
        plan: async () => {
          throw new Error("the connection went away");
        },
      }),
      draft,
    );

    expect(outcome).toMatchObject({ kind: "failed" });
  });
});

describe("correcting and removing an item", () => {
  it("corrects what a Category is expected to cost", async () => {
    expect(
      await handleAmendBudgetItem(ports(), CASA.id, PLANNED.id, {
        amount: 300_000_00,
      }),
    ).toEqual({ kind: "planned", item: PLANNED });
  });

  it("reads an item of another Space as one that never existed", async () => {
    expect(
      await handleAmendBudgetItem(
        ports({ amend: async () => null }),
        CASA.id,
        "item-de-otro",
        { amount: 1 },
      ),
    ).toEqual({ kind: "no-such-item" });

    expect(
      await handleRemoveBudgetItem(
        ports({ remove: async () => false }),
        CASA.id,
        "item-de-otro",
      ),
    ).toEqual({ kind: "no-such-item" });
  });

  it("takes an item out of the plan", async () => {
    expect(
      await handleRemoveBudgetItem(ports(), CASA.id, PLANNED.id),
    ).toEqual({ kind: "removed" });
  });

  it("corrects all four of a Fixed item's questions", async () => {
    expect(
      await handleAmendFixedItem(ports(), CASA.id, FIXED.id, {
        amount: 1_900_000_00,
        name: "Arriendo y expensas",
        dueDay: 5,
        categoryId: "cat-vivienda",
      }),
    ).toEqual({ kind: "planned", item: FIXED });
  });

  it("reads a Fixed item of another Space as one that never existed", async () => {
    expect(
      await handleAmendFixedItem(
        ports({ amendFixed: async () => null }),
        CASA.id,
        "fijo-de-otro",
        { amount: 1 },
      ),
    ).toEqual({ kind: "no-such-item" });
  });

  // What ADR-0034 decided, arriving at the screen as something to say rather
  // than as a crash: the plan does not correct what the ledger recorded.
  it("says a paid Fixed item is paid rather than correcting it", async () => {
    expect(
      await handleAmendFixedItem(
        ports({
          amendFixed: async () => {
            throw new FixedItemAlreadyPaidError({
              ...FIXED,
              payment: { movementId: PAYMENT.id, struckAt: null },
            });
          },
        }),
        CASA.id,
        FIXED.id,
        { amount: 1 },
      ),
    ).toEqual({ kind: "already-paid" });
  });

  it("says the same when taking a paid Fixed item off the plan", async () => {
    expect(
      await handleRemoveBudgetItem(
        ports({
          remove: async () => {
            throw new FixedItemAlreadyPaidError({
              ...FIXED,
              payment: { movementId: PAYMENT.id, struckAt: null },
            });
          },
        }),
        CASA.id,
        FIXED.id,
      ),
    ).toEqual({ kind: "already-paid" });
  });
});

describe("what a refused plan says on the screen", () => {
  it("says something for every way it can be refused", () => {
    const refusals = [
      { kind: "not-signed-in" },
      { kind: "no-such-space" },
      { kind: "no-such-item" },
      { kind: "failed", cause: new Error("boom") },
      { kind: "rejected", field: "amount" },
      { kind: "rejected", field: "category" },
      { kind: "rejected", field: "month" },
      { kind: "rejected", field: "space" },
      { kind: "rejected", field: "name" },
      { kind: "rejected", field: "dueDay" },
      { kind: "already-paid" },
    ] as const;

    for (const refusal of refusals) {
      expect(refusalMessage(refusal)).not.toBe("");
    }
  });
});

describe("planning a Fixed item from the screen", () => {
  it("plans it, once the Member has been proved to be in the Space", async () => {
    expect(await handlePlanFixedItem(ports(), fixedDraft)).toEqual({
      kind: "planned",
      item: FIXED,
    });
  });

  // The same claim the other kind makes, refused the same way: without this,
  // the Space somebody plans in is the Space whose identifier they guessed.
  it("refuses a Space the session does not prove", async () => {
    const planFixed = vi.fn(async () => FIXED);

    const outcome = await handlePlanFixedItem(
      ports({ findSpace: async () => null, planFixed }),
      fixedDraft,
    );

    expect(outcome).toEqual({ kind: "no-such-space" });
    expect(planFixed).not.toHaveBeenCalled();
  });

  it("names the answer that was refused", async () => {
    expect(
      await handlePlanFixedItem(
        ports({
          planFixed: async () => {
            throw new UnplannableBudgetItemError("dueDay", "no such day");
          },
        }),
        fixedDraft,
      ),
    ).toEqual({ kind: "rejected", field: "dueDay" });
  });
});

describe("marking a Fixed item paid", () => {
  it("records the Movement and hands it back", async () => {
    expect(await handlePayFixedItem(ports(), CASA.id, FIXED.id)).toEqual({
      kind: "paid",
      movement: PAYMENT,
    });
  });

  // Who typed it in comes from the session and never from the screen, and the
  // day from the clock and never from a browser: a Movement a plan created
  // carries both exactly as one typed in by hand does (#13).
  it("records it as the signed-in Member, on the day the clock says", async () => {
    const pay = vi.fn(async () => PAYMENT);

    await handlePayFixedItem(ports({ pay }), CASA.id, FIXED.id);

    expect(pay).toHaveBeenCalledWith(
      { space: CASA, recordedBy: GIAN, today: TODAY },
      FIXED.id,
    );
  });

  it("refuses a Space the session does not prove", async () => {
    const pay = vi.fn(async () => PAYMENT);

    const outcome = await handlePayFixedItem(
      ports({ findSpace: async () => null, pay }),
      CASA.id,
      FIXED.id,
    );

    expect(outcome).toEqual({ kind: "no-such-space" });
    expect(pay).not.toHaveBeenCalled();
  });

  it("refuses when there is no such pending item", async () => {
    expect(
      await handlePayFixedItem(
        ports({ pay: async () => null }),
        CASA.id,
        FIXED.id,
      ),
    ).toEqual({ kind: "no-such-item" });
  });

  // The row in front of them, already settled. A person is owed the
  // difference between that and a row that is not theirs.
  it("says so when the item was already paid", async () => {
    expect(
      await handlePayFixedItem(
        ports({
          pay: async () => {
            throw new FixedItemAlreadyPaidError({
              ...FIXED,
              payment: { movementId: "mov-0", struckAt: null },
            });
          },
        }),
        CASA.id,
        FIXED.id,
      ),
    ).toEqual({ kind: "already-paid" });
  });

  it("says nothing was created when it was already paid", () => {
    expect(refusalMessage({ kind: "already-paid" })).toBe(
      "Ese ítem ya estaba pagado.",
    );
  });
});
