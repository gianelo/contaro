import { describe, expect, it } from "vitest";
import { calendarDate, month } from "../calendar/month";
import { money } from "../money/money";
import type { MonthComparison } from "../budget/budget";
import type { Space } from "./space";
import {
  approveCarryOver,
  carryOverOf,
  UnapprovableCarryOverError,
} from "./carry-over";

const ana = "3f2b0c1e-0000-4000-8000-000000000001";
const beto = "3f2b0c1e-0000-4000-8000-000000000002";

const CASA: Space = {
  id: "3f2b0c1e-0000-4000-8000-0000000000ca",
  name: "Casa",
  currency: "ARS",
  createdBy: ana,
};

const SEPTEMBER = month("2026-09");
const IN_OCTOBER = calendarDate("2026-10-03");

/** A month's arithmetic as `monthAgainstPlan` answers it, in the Space's money. */
const stood = (spent: number, planned: number): MonthComparison => ({
  spent: money(spent, "ARS"),
  expected: money(planned, "ARS"),
  share: planned === 0 ? null : spent / planned,
  over: spent > planned ? money(spent - planned, "ARS") : null,
});

describe("what a month left behind", () => {
  it("is the unspent part of its plan, where it spent less than it planned", () => {
    expect(carryOverOf(SEPTEMBER, stood(391_000_00, 1_000_000_00))).toEqual({
      from: SEPTEMBER,
      kind: "surplus",
      amount: money(609_000_00, "ARS"),
    });
  });

  it("is what it went past its plan by, where it spent more", () => {
    expect(carryOverOf(SEPTEMBER, stood(1_240_000_00, 1_000_000_00))).toEqual({
      from: SEPTEMBER,
      kind: "deficit",
      amount: money(240_000_00, "ARS"),
    });
  });

  /*
   * A carry-over of nothing is not money, and a sentence about it is a screen
   * telling somebody that nothing happened. The month landed on its plan, which
   * is the one outcome that needs no announcement at all.
   */
  it("is nothing at all on a month that landed exactly on its plan", () => {
    expect(carryOverOf(SEPTEMBER, stood(1_000_000_00, 1_000_000_00))).toBeNull();
  });

  /*
   * ADR-0019: a Budget comes into existence with its first item. A month nobody
   * planned has no Budget, so it has no unspent part -- and reading one would
   * make every peso of an unplanned month a deficit.
   */
  it("is nothing at all on a month nobody planned", () => {
    expect(carryOverOf(SEPTEMBER, stood(430_000_00, 0))).toBeNull();
  });

  it("is nothing at all on a month nobody planned and nobody spent in", () => {
    expect(carryOverOf(SEPTEMBER, stood(0, 0))).toBeNull();
  });

  it("is the whole plan where the month spent nothing", () => {
    expect(carryOverOf(SEPTEMBER, stood(0, 1_000_000_00))?.amount).toEqual(
      money(1_000_000_00, "ARS"),
    );
  });
});

describe("approving a surplus", () => {
  const surplus = carryOverOf(SEPTEMBER, stood(391_000_00, 1_000_000_00));

  it("is one income in the following month, attributed to nobody", () => {
    expect(
      approveCarryOver(surplus!, {
        space: CASA,
        approvedBy: ana,
        today: IN_OCTOBER,
      }),
    ).toEqual({
      spaceId: CASA.id,
      direction: "income",
      categoryId: null,
      amount: money(609_000_00, "ARS"),
      occurredOn: calendarDate("2026-10-01"),
      recordedBy: ana,
      attributedTo: null,
      carriedFrom: SEPTEMBER,
      name: null,
    });
  });

  /*
   * ADR-0051's exception, the second of its two acts. Asked through
   * `mayApproveTheCarryOver` so the close and this cannot drift: the day they
   * disagree is the day one Member approves money out of a month they were not
   * allowed to close.
   */
  it("is refused to the invited Member", () => {
    expect(() =>
      approveCarryOver(surplus!, {
        space: CASA,
        approvedBy: beto,
        today: IN_OCTOBER,
      }),
    ).toThrow(UnapprovableCarryOverError);
  });

  it("says which half of the question was the bad one", () => {
    try {
      approveCarryOver(surplus!, {
        space: CASA,
        approvedBy: beto,
        today: IN_OCTOBER,
      });
      expect.unreachable("the invited Member cannot approve a carry-over");
    } catch (error) {
      expect((error as UnapprovableCarryOverError).field).toBe("creator");
    }
  });
});

describe("a deficit", () => {
  const deficit = carryOverOf(SEPTEMBER, stood(1_240_000_00, 1_000_000_00));

  /*
   * Decision 11 of #109, made unwritable rather than merely undrawn. A deficit
   * is money already spent: the card it went on is paid the following month and
   * that payment is a real expense of it, so recording the deficit as well
   * charges one overspend twice.
   */
  it("cannot be approved into the following month by anybody", () => {
    expect(() =>
      approveCarryOver(deficit!, {
        space: CASA,
        approvedBy: ana,
        today: IN_OCTOBER,
      }),
    ).toThrow(UnapprovableCarryOverError);
  });

  it("is refused for what it is and not for who asked", () => {
    try {
      approveCarryOver(deficit!, {
        space: CASA,
        approvedBy: ana,
        today: IN_OCTOBER,
      });
      expect.unreachable("a deficit is never recorded");
    } catch (error) {
      expect((error as UnapprovableCarryOverError).field).toBe("kind");
    }
  });
});

describe("the month it is carried out of", () => {
  const surplus = carryOverOf(SEPTEMBER, stood(391_000_00, 1_000_000_00));

  /*
   * The close already refuses a month that has not ended, and this refuses it
   * again for the same reason `closeMonth` does: the day this writes is the
   * first of the following month, and a Movement dated in a day that has not
   * happened is one `recordMovement` would have turned away.
   */
  it("has to have ended, on the Reader's own day", () => {
    expect(() =>
      approveCarryOver(surplus!, {
        space: CASA,
        approvedBy: ana,
        today: calendarDate("2026-09-30"),
      }),
    ).toThrow(UnapprovableCarryOverError);
  });

  it("has ended on the first day of the month after it", () => {
    expect(
      approveCarryOver(surplus!, {
        space: CASA,
        approvedBy: ana,
        today: calendarDate("2026-10-01"),
      }).occurredOn,
    ).toBe("2026-10-01");
  });

  it("lands on the following month however late it is approved", () => {
    expect(
      approveCarryOver(surplus!, {
        space: CASA,
        approvedBy: ana,
        today: calendarDate("2026-12-24"),
      }).occurredOn,
    ).toBe("2026-10-01");
  });
});
