import { describe, expect, it } from "vitest";
import { calendarDate, month } from "../calendar/month";
import type { Space } from "./space";
import {
  closeMonth,
  firstOpeningSince,
  theMonthWaitingToBeClosed,
  UnclosableMonthError,
} from "./closure";

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

describe("the first opening since a month ended", () => {
  /*
   * Decision 13 of #109, and the whole of why the announcement needs no new
   * state: the moment the Space was last opened, read before this opening
   * overwrites it, already answers the question.
   */
  it("is true when the Space was last opened while the month was still running", () => {
    expect(firstOpeningSince(SEPTEMBER, calendarDate("2026-09-28"))).toBe(true);
  });

  // The last day of a month is still inside it, exactly as `hasEnded` has it.
  it("is true when the Space was last opened on the month's own last day", () => {
    expect(firstOpeningSince(SEPTEMBER, calendarDate("2026-09-30"))).toBe(true);
  });

  it("is false once the Space has been opened after the month ended", () => {
    expect(firstOpeningSince(SEPTEMBER, calendarDate("2026-10-01"))).toBe(false);
  });

  /*
   * A Space nobody has opened since the column existed. It has not been opened
   * since the month ended either, which is the question being asked -- and the
   * answer a `null` invites instead is "never announce it", which would leave
   * the one month a person most needs telling about announced by nothing.
   */
  it("is true when the Space has never been opened at all", () => {
    expect(firstOpeningSince(SEPTEMBER, null)).toBe(true);
  });

  // Months older than the one that just ended are not special-cased here: this
  // answers only "has this Space been opened since that month ended", and a
  // month from last year has been opened past many times over.
  it("is false for a month the Space has been opened past for months", () => {
    expect(firstOpeningSince(month("2025-11"), calendarDate("2026-09-28"))).toBe(
      false,
    );
  });
});

describe("the month a Space is waiting to have closed", () => {
  const waiting = (
    joined: string,
    today: string,
    closed: readonly string[] = [],
  ) =>
    theMonthWaitingToBeClosed(
      { joined: calendarDate(joined), today: calendarDate(today) },
      new Set(closed),
    );

  it("is the month that just ended when nothing older is open", () => {
    expect(waiting("2026-08-02", "2026-10-03", ["2026-08"])).toBe("2026-09");
  });

  /*
   * "The row leaves only when it is closed" (#118), which the newest ended
   * month cannot keep: it would take September's row off the screen the day
   * October ended, with September still open.
   */
  it("is the oldest one still open, and not the one that just ended", () => {
    expect(waiting("2026-08-02", "2026-11-03", ["2026-10"])).toBe("2026-08");
  });

  it("is nothing at all once every month they were here for is closed", () => {
    expect(
      waiting("2026-08-02", "2026-10-03", ["2026-08", "2026-09"]),
    ).toBeNull();
  });

  // A month still running has not ended, and `closeMonth` refuses it.
  it("never reaches the month being lived in", () => {
    expect(waiting("2026-10-02", "2026-10-03")).toBeNull();
  });

  /*
   * The case this bound exists for: a Space made in October, or a Member
   * invited into one in October. September ended unclosed, which is true and no
   * use at all to somebody who was not there for it -- and the sheet would
   * otherwise open by itself on the first screen they ever see.
   */
  it("never reaches back past the month the Member joined in", () => {
    expect(waiting("2026-10-02", "2026-11-03")).toBe("2026-10");
  });

  // The last day is still inside the month: somebody who joined on the 30th
  // was here for it, however little of it.
  it("counts the month somebody joined on the last day of", () => {
    expect(waiting("2026-09-30", "2026-10-03")).toBe("2026-09");
  });

  it("walks the gap in a Space that has been left open for a year", () => {
    expect(waiting("2025-11-02", "2026-10-03", ["2025-11", "2025-12"])).toBe(
      "2026-01",
    );
  });
});
