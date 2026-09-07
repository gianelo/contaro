import { describe, expect, it, vi } from "vitest";
import {
  FixedItemAlreadyPaidError,
  UnplannableBudgetItemError,
  type BudgetItem,
  type FixedItem,
} from "@/domain/budget/budget";
import { calendarDate, month } from "@/domain/calendar/month";
import { money } from "@/domain/money/money";
import type { Movement } from "@/domain/movement/movement";
import type { Space } from "@/domain/space/space";
import {
  handleAmendBudgetItem,
  handleCopyPlan,
  handleAmendFixedItem,
  handlePayFixedItem,
  handlePlanBudgetItem,
  handleRemoveBudgetItem,
  refusalMessage,
  type BudgetPorts,
  type PlannedItemDraft,
} from "./plan";

const CASA: Space = {
  id: "space-casa",
  name: "Casa",
  currency: "ARS",
  createdBy: "member-gian",
};
const GIAN = "member-gian";

const PLANNED: BudgetItem = {
  kind: "variable",
  id: "item-1",
  spaceId: CASA.id,
  month: month("2026-09"),
  categoryId: "cat-super",
  amount: money(240_000_00, "ARS"),
  name: "Súper de la semana",
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
  name: null,
};

/**
 * One screen's answers, with the day somebody chose on them.
 *
 * The same shape as the draft below it, and that is the point of #80: a person
 * is asked one set of questions, and whether they answered the last one is
 * what decides the kind.
 */
const fixedDraft: PlannedItemDraft = {
  spaceId: CASA.id,
  month: "2026-09",
  categoryId: "cat-vivienda",
  amount: 1_800_000_00,
  name: "Arriendo",
  dueDay: 1,
};

/** The same answers with nothing said about a day: an item that never falls due. */
const draft: PlannedItemDraft = {
  spaceId: CASA.id,
  month: "2026-09",
  categoryId: "cat-super",
  amount: 240_000_00,
  name: "Súper de la semana",
  dueDay: null,
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
  copyPlan: async () => ({ kind: "copied", items: [PLANNED] }),
  ...changes,
});

describe("planning an item from the screen", () => {
  it("plans it, once the Member has been proved to be in the Space", async () => {
    expect(await handlePlanBudgetItem(ports(), draft)).toEqual({
      kind: "planned",
      item: PLANNED,
    });
  });

  // The whole of #80. Nobody is asked to pick a kind: a day answered is what
  // makes an item Fixed, and a day left unanswered is what leaves it Variable.
  // One set of answers on the screen, and the domain's two shapes on the far
  // side of this.
  it("makes an item with no day a Variable one, and hands it no day", async () => {
    const plan = vi.fn(async () => PLANNED);
    const planFixed = vi.fn(async () => FIXED);

    expect(
      await handlePlanBudgetItem(ports({ plan, planFixed }), draft),
    ).toEqual({ kind: "planned", item: PLANNED });

    // Exactly the five answers a `BudgetItemDraft` is, and no sixth carrying
    // "no day". A draft that could hold one is a shape `planItem` would have
    // to defend against; one that never reaches it cannot.
    expect(plan).toHaveBeenCalledWith(CASA, {
      spaceId: draft.spaceId,
      month: draft.month,
      categoryId: draft.categoryId,
      amount: draft.amount,
      name: draft.name,
    });
    expect(planFixed).not.toHaveBeenCalled();
  });

  it("makes an item with a day a Fixed one, due on the day chosen", async () => {
    const plan = vi.fn(async () => PLANNED);
    const planFixed = vi.fn(async () => FIXED);

    expect(
      await handlePlanBudgetItem(ports({ plan, planFixed }), fixedDraft),
    ).toEqual({ kind: "planned", item: FIXED });

    expect(planFixed).toHaveBeenCalledWith(CASA, {
      spaceId: fixedDraft.spaceId,
      month: fixedDraft.month,
      categoryId: fixedDraft.categoryId,
      amount: fixedDraft.amount,
      name: fixedDraft.name,
      dueDay: 1,
    });
    expect(plan).not.toHaveBeenCalled();
  });

  // A day is passed through raw, the way the amount and the month are: `0` is
  // what an unanswered <select> reads as and `NaN` is what a broken one does,
  // and `planFixedItem` refuses both by name. Repairing either here would file
  // a due date nobody chose -- and, worse since #80, would file it under a
  // kind nobody chose either.
  it("plans a day it cannot read as a Fixed item, so the domain can refuse it", async () => {
    const planFixed = vi.fn(async () => FIXED);

    await handlePlanBudgetItem(ports({ planFixed }), {
      ...fixedDraft,
      dueDay: Number.NaN,
    });

    expect(planFixed).toHaveBeenCalledWith(
      CASA,
      expect.objectContaining({ dueDay: Number.NaN }),
    );
  });

  // The refusals of the Fixed path reach the screen the way the other's do.
  // Without this, choosing a day the month does not have is a blank screen
  // rather than a sentence pointing at the picker.
  it("names the answer a refused Fixed item was refused over", async () => {
    expect(
      await handlePlanBudgetItem(
        ports({
          planFixed: async () => {
            throw new UnplannableBudgetItemError("dueDay", "no such day");
          },
        }),
        fixedDraft,
      ),
    ).toEqual({ kind: "rejected", field: "dueDay" });
  });

  // The same claim, refused the same way, whichever kind the day makes it:
  // without this, the Space somebody plans in is the Space whose identifier
  // they guessed.
  it("refuses a Space the session does not prove, for either kind", async () => {
    const planFixed = vi.fn(async () => FIXED);

    const outcome = await handlePlanBudgetItem(
      ports({ findSpace: async () => null, planFixed }),
      fixedDraft,
    );

    expect(outcome).toEqual({ kind: "no-such-space" });
    expect(planFixed).not.toHaveBeenCalled();
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

  // Both kinds are asked what the row is called since #79, so both can be
  // refused over it -- and the screen is owed the field rather than a shrug.
  it("names a refused name as the name", async () => {
    const outcome = await handlePlanBudgetItem(
      ports({
        plan: async () => {
          throw new UnplannableBudgetItemError(
            "name",
            "it is not called anything",
          );
        },
      }),
      draft,
    );

    expect(outcome).toEqual({ kind: "rejected", field: "name" });
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
  it("corrects all three of a Variable item's questions", async () => {
    expect(
      await handleAmendBudgetItem(ports(), CASA.id, PLANNED.id, {
        amount: 300_000_00,
        name: "Súper de la segunda semana",
        categoryId: "cat-super",
      }),
    ).toEqual({ kind: "planned", item: PLANNED });
  });

  // The three answers reach the store as three, and the name among them: a
  // correction that quietly dropped one would leave the row called what it
  // was called before somebody retyped it (#79).
  it("hands the store every answer the form carried", async () => {
    const amend = vi.fn(async () => PLANNED);

    await handleAmendBudgetItem(ports({ amend }), CASA.id, PLANNED.id, {
      amount: 300_000_00,
      name: "Súper de la segunda semana",
      categoryId: "cat-super",
    });

    expect(amend).toHaveBeenCalledWith(CASA, PLANNED.id, {
      amount: 300_000_00,
      name: "Súper de la segunda semana",
      categoryId: "cat-super",
    });
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
      "Ese gasto fijo ya estaba pagado.",
    );
  });
});

describe("carrying a month's plan into another month", () => {
  const AUGUST = month("2026-08");
  const SEPTEMBER = month("2026-09");

  it("copies the plan of the month it was told to copy", async () => {
    const copyPlan = vi.fn(async () => ({
      kind: "copied" as const,
      items: [PLANNED],
    }));

    const outcome = await handleCopyPlan(
      ports({ copyPlan }),
      CASA.id,
      AUGUST,
      SEPTEMBER,
    );

    expect(outcome).toEqual({ kind: "copied", items: [PLANNED] });
    expect(copyPlan).toHaveBeenCalledWith(CASA, AUGUST, SEPTEMBER);
  });

  // Membership before the write, the way every other handler proves it: a
  // Space this Member is not in must read as no Space at all.
  it("refuses somebody who is not signed in", async () => {
    const copyPlan = vi.fn();

    const outcome = await handleCopyPlan(
      ports({ readSession: async () => null, copyPlan }),
      CASA.id,
      AUGUST,
      SEPTEMBER,
    );

    expect(outcome).toEqual({ kind: "not-signed-in" });
    expect(copyPlan).not.toHaveBeenCalled();
  });

  it("refuses a Space this Member is not in", async () => {
    const outcome = await handleCopyPlan(
      ports({ findSpace: async () => null }),
      CASA.id,
      AUGUST,
      SEPTEMBER,
    );

    expect(outcome).toEqual({ kind: "no-such-space" });
  });

  /*
   * The month emptied between the screen being drawn and the offer being
   * answered. Its own outcome and not a silent success, because a person who
   * tapped "Copiar el plan de agosto" and got an empty September back is owed
   * the reason.
   */
  it("says so when the month it was copying has nothing left on it", async () => {
    const outcome = await handleCopyPlan(
      ports({ copyPlan: async () => ({ kind: "nothing-to-copy" }) }),
      CASA.id,
      AUGUST,
      SEPTEMBER,
    );

    expect(outcome).toEqual({ kind: "nothing-to-copy" });
  });

  /*
   * The other thumb planned September first. Told apart from the case above
   * because the fix is different: this one already has the plan the person
   * wanted, and reloading shows it.
   */
  it("says so when the month it was copying into was planned in between", async () => {
    const outcome = await handleCopyPlan(
      ports({ copyPlan: async () => ({ kind: "already-planned" }) }),
      CASA.id,
      AUGUST,
      SEPTEMBER,
    );

    expect(outcome).toEqual({ kind: "already-planned" });
  });

  // A Category the Space can no longer see refuses the whole copy by name,
  // through the same seam every other refused answer takes.
  it("names the answer a refused copy was refused over", async () => {
    const outcome = await handleCopyPlan(
      ports({
        copyPlan: async () => {
          throw new UnplannableBudgetItemError("category", "not this Space's");
        },
      }),
      CASA.id,
      AUGUST,
      SEPTEMBER,
    );

    expect(outcome).toEqual({ kind: "rejected", field: "category" });
  });

  it("has something to say about every way it can be refused", () => {
    expect(refusalMessage({ kind: "nothing-to-copy" })).toBeTruthy();
    expect(refusalMessage({ kind: "already-planned" })).toBeTruthy();
  });
});
