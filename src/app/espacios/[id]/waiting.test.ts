import { describe, expect, it } from "vitest";
import { calendarDate } from "@/domain/calendar/month";
import type { Space } from "@/domain/space/space";
import { closeWaitingOn, type SpaceHistory } from "./waiting";

const ana = "3f2b0c1e-0000-4000-8000-000000000001";
const beto = "3f2b0c1e-0000-4000-8000-000000000002";

const CASA: Space = {
  id: "3f2b0c1e-0000-4000-8000-0000000000ca",
  name: "Casa",
  currency: "ARS",
  createdBy: ana,
};

/** Standing in October, so the month that just ended is September. */
const IN_OCTOBER = calendarDate("2026-10-03");

/** A Member who was here all through September and last looked in it. */
const SINCE_AUGUST: SpaceHistory = {
  joined: calendarDate("2026-08-02"),
  lastOpened: calendarDate("2026-09-28"),
};

/** August closed, so September is the oldest month still open. */
const AUGUST_CLOSED = new Set(["2026-08"]);

const asked = (over: Partial<Parameters<typeof closeWaitingOn>[0]> = {}) =>
  closeWaitingOn({
    space: CASA,
    memberId: ana,
    creatorName: "Ana",
    today: IN_OCTOBER,
    closed: AUGUST_CLOSED,
    history: SINCE_AUGUST,
    ...over,
  });

describe("the close a Space is waiting on", () => {
  it("is the month that just ended, named to be read inside a sentence", () => {
    expect(asked()).toMatchObject({ month: "2026-09", name: "septiembre" });
  });

  /*
   * What a September receipt found in October comes out of (ADR-0002). It is
   * the month being lived in and not "the one after September", which are the
   * same month by construction -- and would stop being so the day somebody
   * derived one of them differently.
   */
  it("names the month a late receipt would land in", () => {
    expect(asked()).toMatchObject({ nextName: "octubre" });
  });

  it("is nothing at all once every month they were here for is closed", () => {
    expect(asked({ closed: new Set(["2026-08", "2026-09"]) })).toBeNull();
  });

  /*
   * "The row leaves only when it is closed" (#118). A row that moved on to the
   * month that just ended would be a row that left with September still open.
   */
  it("stays on the oldest month still open, not the one that just ended", () => {
    expect(
      asked({ today: calendarDate("2026-11-03"), closed: new Set(["2026-10"]) }),
    ).toMatchObject({ month: "2026-08", name: "agosto" });
  });
});

describe("who the row is speaking to", () => {
  it("offers the act to the Space's creator, naming nobody", () => {
    expect(asked()).toMatchObject({ waitingOn: null });
  });

  /*
   * Decision 14, and the first capability asymmetry in the product: the invited
   * Member is told the month is waiting and on whom, and is never shown a
   * button they cannot press.
   */
  it("states the fact to the invited Member, naming the creator", () => {
    expect(asked({ memberId: beto })).toMatchObject({ waitingOn: "Ana" });
  });
});

describe("the sheet that opens by itself", () => {
  /*
   * Decision 3 and decision 13: the moment the Space was last opened, read
   * before this opening overwrote it, is what says this is the first load since
   * the month ended.
   */
  it("opens on the first load after the month ended", () => {
    expect(asked()).toMatchObject({ announces: true });
  });

  it("never opens again once the Space has been opened since", () => {
    expect(
      asked({
        history: { ...SINCE_AUGUST, lastOpened: calendarDate("2026-10-01") },
      }),
    ).toMatchObject({ announces: false });
  });

  /*
   * The row still stands after the sheet is spent -- that is the pair covering
   * each other's failure (decision 12), and it is what makes a hard refresh on
   * that first load cost nothing.
   */
  it("leaves the row standing when it does not open", () => {
    expect(
      asked({
        history: { ...SINCE_AUGUST, lastOpened: calendarDate("2026-10-01") },
      }),
    ).toMatchObject({ month: "2026-09", waitingOn: null });
  });

  // An interruption offering an act they cannot perform is an interruption
  // with no answer to it. Their row says it instead, and says it standing.
  it("never opens for the Member who cannot close the month", () => {
    expect(asked({ memberId: beto })).toMatchObject({
      announces: false,
      waitingOn: "Ana",
    });
  });
});

describe("a month the Member was not here for", () => {
  /*
   * A Space made in October, or a Member invited into one in October.
   * September ended unclosed, which is true and no use to them at all -- and
   * the sheet would otherwise open by itself on the first screen they ever see.
   */
  it("is not announced to somebody who joined after it ended", () => {
    expect(
      asked({
        closed: new Set<string>(),
        history: { joined: calendarDate("2026-10-02"), lastOpened: null },
      }),
    ).toBeNull();
  });

  // The last day is still inside the month: somebody who joined on the 30th
  // was here for it, however little of it.
  it("is announced to somebody who joined on its last day", () => {
    expect(
      asked({
        closed: new Set<string>(),
        history: { joined: calendarDate("2026-09-30"), lastOpened: null },
      }),
    ).toMatchObject({ month: "2026-09", announces: true });
  });

  it("is nothing at all for a Member with no membership row to read", () => {
    expect(asked({ history: null })).toBeNull();
  });
});

describe("the month it is about", () => {
  /*
   * Never the month on the screen: a month ending is news, and which month
   * somebody navigated to is not what decides whether they are told. With every
   * older month closed, the oldest one still open is the one that just ended.
   */
  it("is the month before the one being lived in, whatever is on screen", () => {
    expect(
      asked({
        today: calendarDate("2026-12-01"),
        closed: new Set(["2026-08", "2026-09", "2026-10"]),
      }),
    ).toMatchObject({
      month: "2026-11",
      name: "noviembre",
      nextName: "diciembre",
    });
  });

  // A month from another year is written with it, exactly as the pill at the
  // top of the screen writes one (`monthName`).
  it("carries the year when the month that ended is in another one", () => {
    expect(
      asked({
        today: calendarDate("2027-01-04"),
        closed: new Set([
          "2026-08",
          "2026-09",
          "2026-10",
          "2026-11",
        ]),
      }),
    ).toMatchObject({ month: "2026-12", name: "diciembre de 2026" });
  });
});
