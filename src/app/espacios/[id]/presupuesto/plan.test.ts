import { describe, expect, it, vi } from "vitest";
import {
  UnplannableBudgetItemError,
  type BudgetItem,
  type BudgetItemDraft,
} from "@/domain/budget/budget";
import { month } from "@/domain/calendar/month";
import { money } from "@/domain/money/money";
import type { Space } from "@/domain/space/space";
import {
  handleAmendBudgetItem,
  handlePlanBudgetItem,
  handleRemoveBudgetItem,
  refusalMessage,
  type BudgetPorts,
} from "./plan";

const CASA: Space = { id: "space-casa", name: "Casa", currency: "ARS" };
const GIAN = "member-gian";

const PLANNED: BudgetItem = {
  id: "item-1",
  spaceId: CASA.id,
  month: month("2026-09"),
  categoryId: "cat-super",
  amount: money(240_000_00, "ARS"),
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
  plan: async () => PLANNED,
  amend: async () => PLANNED,
  remove: async () => true,
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
    ] as const;

    for (const refusal of refusals) {
      expect(refusalMessage(refusal)).not.toBe("");
    }
  });
});
