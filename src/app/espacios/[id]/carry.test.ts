import { describe, expect, it } from "vitest";
import { ClosedMonthError, OpenMonthError } from "@/db/closed-months";
import type { MonthComparison } from "@/domain/budget/budget";
import { calendarDate, month } from "@/domain/calendar/month";
import { money } from "@/domain/money/money";
import type { Movement, NewMovement } from "@/domain/movement/movement";
import type { Space } from "@/domain/space/space";
import {
  carryRefusalMessage,
  handleApproveCarryOver,
  type CarryPorts,
} from "./carry";

const ANA = "3f2b0c1e-0000-4000-8000-000000000001";
const BETO = "3f2b0c1e-0000-4000-8000-000000000002";

const CASA: Space = {
  id: "3f2b0c1e-0000-4000-8000-0000000000ca",
  name: "Casa",
  currency: "ARS",
  createdBy: ANA,
};

const SEPTEMBER = month("2026-09");
const IN_OCTOBER = calendarDate("2026-10-03");

/** A month's arithmetic as `monthAgainstPlan` answers it. */
const stood = (spent: number, planned: number): MonthComparison => ({
  spent: money(spent, "ARS"),
  expected: money(planned, "ARS"),
  share: planned === 0 ? null : spent / planned,
  over: spent > planned ? money(spent - planned, "ARS") : null,
});

const SURPLUS = stood(391_000_00, 1_000_000_00);
const DEFICIT = stood(1_240_000_00, 1_000_000_00);

const written = (approved: NewMovement): Movement => ({
  ...approved,
  id: "3f2b0c1e-0000-4000-8000-00000000mov1",
});

/*
 * The store's refusals are thrown where the store throws them: it asks the two
 * months about their closes and the domain about everything else. The fake
 * writes whatever the domain built, so these drive the real rules.
 */
const ports = (changes: Partial<CarryPorts> = {}): CarryPorts => ({
  readSession: async () => ({ memberId: ANA }),
  findSpace: async () => CASA,
  today: () => IN_OCTOBER,
  standing: async () => SURPLUS,
  approve: async (approved) => written(approved),
  ...changes,
});

describe("approving a month's surplus", () => {
  it("writes one income into the following month, attributed to nobody", async () => {
    await expect(
      handleApproveCarryOver(ports(), CASA.id, SEPTEMBER),
    ).resolves.toEqual({
      kind: "carried",
      movement: {
        id: "3f2b0c1e-0000-4000-8000-00000000mov1",
        spaceId: CASA.id,
        direction: "income",
        categoryId: null,
        amount: money(609_000_00, "ARS"),
        occurredOn: "2026-10-01",
        recordedBy: ANA,
        attributedTo: null,
        carriedFrom: SEPTEMBER,
        name: null,
      },
    });
  });

  /*
   * The figure the card showed is a claim like any other. This is the one place
   * in the product where trusting it would put an amount somebody chose into a
   * ledger, so the month is measured again here and the answer is this one.
   */
  it("carries what the month really came to and never what a screen said", async () => {
    const carried = await handleApproveCarryOver(
      ports({ standing: async () => stood(0, 250_000_00) }),
      CASA.id,
      SEPTEMBER,
    );

    expect(carried.kind === "carried" && carried.movement.amount).toEqual(
      money(250_000_00, "ARS"),
    );
  });

  it("is refused to somebody who is not signed in", async () => {
    await expect(
      handleApproveCarryOver(
        ports({ readSession: async () => null }),
        CASA.id,
        SEPTEMBER,
      ),
    ).resolves.toEqual({ kind: "not-signed-in" });
  });

  it("is refused on a Space the Member is not in, as no such Space", async () => {
    await expect(
      handleApproveCarryOver(
        ports({ findSpace: async () => null }),
        CASA.id,
        SEPTEMBER,
      ),
    ).resolves.toEqual({ kind: "no-such-space" });
  });

  /*
   * ADR-0051's exception, the second of its two acts. The invited Member never
   * sees the control -- their card names who it is waiting on -- and the answer
   * is given anyway, because a form field is a claim.
   */
  it("is refused to the invited Member", async () => {
    await expect(
      handleApproveCarryOver(
        ports({ readSession: async () => ({ memberId: BETO }) }),
        CASA.id,
        SEPTEMBER,
      ),
    ).resolves.toEqual({ kind: "not-the-creator" });
  });
});

describe("what is never carried", () => {
  /*
   * Decision 11 of #109. A deficit is money already spent: the card it went on
   * is paid in the month this would write into, and that payment is a real
   * expense of it, so recording the deficit too charges one overspend twice.
   */
  it("refuses a month that overspent, for what it is", async () => {
    await expect(
      handleApproveCarryOver(
        ports({ standing: async () => DEFICIT }),
        CASA.id,
        SEPTEMBER,
      ),
    ).resolves.toEqual({ kind: "a-deficit" });
  });

  it("refuses a month that landed exactly on its plan", async () => {
    await expect(
      handleApproveCarryOver(
        ports({ standing: async () => stood(1_000_000_00, 1_000_000_00) }),
        CASA.id,
        SEPTEMBER,
      ),
    ).resolves.toEqual({ kind: "nothing-to-carry" });
  });

  /*
   * ADR-0019: a Budget comes into existence with its first item, so a month
   * with no items has no plan to have an unspent part of. Read the other way it
   * would make every peso of an unplanned month a deficit.
   */
  it("refuses a month nobody planned", async () => {
    await expect(
      handleApproveCarryOver(
        ports({ standing: async () => stood(430_000_00, 0) }),
        CASA.id,
        SEPTEMBER,
      ),
    ).resolves.toEqual({ kind: "nothing-to-carry" });
  });

  it("refuses a month that has not ended on the Reader's own day", async () => {
    await expect(
      handleApproveCarryOver(
        ports({ today: () => calendarDate("2026-09-30") }),
        CASA.id,
        SEPTEMBER,
      ),
    ).resolves.toEqual({ kind: "not-over-yet" });
  });
});

describe("the two months and their closes", () => {
  /*
   * Decision 6: what a month left behind is only firm once nothing more can go
   * into it. Reachable from a stale screen, which is exactly what this catches.
   */
  it("refuses a month that has not been closed", async () => {
    await expect(
      handleApproveCarryOver(
        ports({
          approve: async () => {
            throw new OpenMonthError(SEPTEMBER);
          },
        }),
        CASA.id,
        SEPTEMBER,
      ),
    ).resolves.toEqual({ kind: "not-closed" });
  });

  /*
   * And the ordinary refusal every write in the product meets. A carry-over
   * aimed into a closed month is a Movement aimed into a closed month, answered
   * in the one place that answers it (ADR-0002, ADR-0052).
   */
  it("refuses landing in a month that has since been closed", async () => {
    await expect(
      handleApproveCarryOver(
        ports({
          approve: async () => {
            throw new ClosedMonthError(month("2026-10"));
          },
        }),
        CASA.id,
        SEPTEMBER,
      ),
    ).resolves.toEqual({ kind: "month-is-closed" });
  });

  it("carries anything else back as a failure worth retrying", async () => {
    const outcome = await handleApproveCarryOver(
      ports({
        approve: async () => {
          throw new Error("the connection dropped");
        },
      }),
      CASA.id,
      SEPTEMBER,
    );

    expect(outcome.kind).toBe("failed");
  });
});

describe("what a refused approval says", () => {
  /*
   * Every outcome has a sentence, so an outcome added without deciding what a
   * person is told is a type error rather than a blank screen. The two that
   * cannot be fixed by trying again say so by not inviting it.
   */
  it("says something for every way it can be refused", () => {
    const refusals = [
      { kind: "not-signed-in" },
      { kind: "no-such-space" },
      { kind: "not-the-creator" },
      { kind: "nothing-to-carry" },
      { kind: "a-deficit" },
      { kind: "not-over-yet" },
      { kind: "not-closed" },
      { kind: "month-is-closed" },
      { kind: "no-such-month" },
      { kind: "failed", cause: new Error("x") },
    ] as const;

    for (const refusal of refusals) {
      expect(carryRefusalMessage(refusal).length).toBeGreaterThan(0);
    }
  });

  it("never invites a retry on the deficit, which nothing fixes", () => {
    expect(carryRefusalMessage({ kind: "a-deficit" })).not.toContain(
      "Probá de nuevo",
    );
  });
});
