import { describe, expect, it } from "vitest";
import { calendarDate, month } from "../calendar/month";
import type { Space } from "./space";
import { closeMonth, UnclosableMonthError } from "./closure";

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

describe("closing a month", () => {
  it("is the month, the Space, and who closed it on which day", () => {
    expect(
      closeMonth(SEPTEMBER, {
        space: CASA,
        closedBy: ana,
        today: IN_OCTOBER,
      }),
    ).toEqual({
      spaceId: CASA.id,
      month: SEPTEMBER,
      closedBy: ana,
      closedOn: IN_OCTOBER,
    });
  });

  it("closes a month long behind the one being lived in", () => {
    expect(
      closeMonth(month("2025-12"), {
        space: CASA,
        closedBy: ana,
        today: IN_OCTOBER,
      }).month,
    ).toBe("2025-12");
  });
});

describe("who may close a month", () => {
  /*
   * ADR-0051's exception, asked here rather than answered again: the close is
   * irreversible and the other Member has to live inside it.
   */
  it("is refused to the invited Member", () => {
    expect(() =>
      closeMonth(SEPTEMBER, {
        space: CASA,
        closedBy: beto,
        today: IN_OCTOBER,
      }),
    ).toThrow(UnclosableMonthError);
  });

  it("says it was the Member and not the month that was wrong", () => {
    try {
      closeMonth(SEPTEMBER, {
        space: CASA,
        closedBy: beto,
        today: IN_OCTOBER,
      });
      expect.unreachable("the invited Member cannot close a month");
    } catch (error) {
      expect((error as UnclosableMonthError).field).toBe("creator");
    }
  });
});

describe("when a month may be closed", () => {
  /*
   * The close is total and has no undo (ADR-0002), so a month still running is
   * a month whose remaining days would be pushed into the next one by an act
   * nobody can take back.
   */
  it("is refused while the month is still running", () => {
    expect(() =>
      closeMonth(SEPTEMBER, {
        space: CASA,
        closedBy: ana,
        today: calendarDate("2026-09-30"),
      }),
    ).toThrow(UnclosableMonthError);
  });

  it("says it was the month and not the Member that was wrong", () => {
    try {
      closeMonth(SEPTEMBER, {
        space: CASA,
        closedBy: ana,
        today: calendarDate("2026-09-30"),
      });
      expect.unreachable("a month still running cannot be closed");
    } catch (error) {
      expect((error as UnclosableMonthError).field).toBe("month");
    }
  });

  /*
   * ADR-0018, and the reason this takes the Reader's day rather than a clock.
   * At nine at night on the 30th in Bogota the server is already in October;
   * the Member is not, and September is still theirs to finish loading.
   */
  it("is refused on the day the server has already left behind", () => {
    expect(() =>
      closeMonth(SEPTEMBER, {
        space: CASA,
        closedBy: ana,
        today: calendarDate("2026-09-30"),
      }),
    ).toThrow(UnclosableMonthError);

    expect(
      closeMonth(SEPTEMBER, {
        space: CASA,
        closedBy: ana,
        today: calendarDate("2026-10-01"),
      }).closedOn,
    ).toBe("2026-10-01");
  });
});
