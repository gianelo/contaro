import { describe, expect, it } from "vitest";
import { calendarDate, month } from "@/domain/calendar/month";
import { closeMonth, type ClosedMonth } from "@/domain/space/closure";
import type { Space } from "@/domain/space/space";
import {
  closeRefusalMessage,
  handleCloseMonth,
  type ClosePorts,
} from "./close";

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

const CLOSED: ClosedMonth = {
  spaceId: CASA.id,
  month: SEPTEMBER,
  closedBy: ANA,
  closedOn: IN_OCTOBER,
};

/*
 * The store's own refusals are the domain's, thrown where the store throws
 * them: `closeMonthInSpace` calls `closeMonth` before it writes. The fake does
 * the same thing, so these drive the real refusals and not invented ones.
 */
const ports = (changes: Partial<ClosePorts> = {}): ClosePorts => ({
  readSession: async () => ({ memberId: ANA }),
  findSpace: async () => CASA,
  today: () => IN_OCTOBER,
  close: async (closing, of) => {
    closeMonth(of, closing);
    return CLOSED;
  },
  ...changes,
});

describe("closing a month", () => {
  it("closes it and hands back what was closed", async () => {
    await expect(
      handleCloseMonth(ports(), CASA.id, SEPTEMBER),
    ).resolves.toEqual({ kind: "closed", closed: CLOSED });
  });

  it("is refused to somebody who is not signed in", async () => {
    await expect(
      handleCloseMonth(
        ports({ readSession: async () => null }),
        CASA.id,
        SEPTEMBER,
      ),
    ).resolves.toEqual({ kind: "not-signed-in" });
  });

  /*
   * A Space this Member is not in reads as no Space at all, the way every
   * refusal in this app reads: saying it exists but is not theirs is already
   * saying something about it.
   */
  it("is refused on a Space the Member is not in, as no such Space", async () => {
    await expect(
      handleCloseMonth(
        ports({ findSpace: async () => null }),
        CASA.id,
        SEPTEMBER,
      ),
    ).resolves.toEqual({ kind: "no-such-space" });
  });
});

describe("who the close is refused to", () => {
  /*
   * ADR-0051. #118 never draws the button for the invited Member, and a form
   * field is a claim rather than a fact -- so the answer is here and not only
   * on the screen.
   */
  it("is the invited Member, and it does not read as no such Space", async () => {
    await expect(
      handleCloseMonth(
        ports({ readSession: async () => ({ memberId: BETO }) }),
        CASA.id,
        SEPTEMBER,
      ),
    ).resolves.toEqual({ kind: "not-the-creator" });
  });
});

describe("when the close is refused", () => {
  /*
   * ADR-0018, and the one act in the product where the server's day would be
   * unrecoverable: it would permanently freeze a month that, for the person
   * tapping, is still running.
   */
  it("is while the month is still running on the Reader's day", async () => {
    await expect(
      handleCloseMonth(
        ports({ today: () => calendarDate("2026-09-30") }),
        CASA.id,
        SEPTEMBER,
      ),
    ).resolves.toEqual({ kind: "not-over-yet" });
  });

  it("tells the two refusals apart", async () => {
    const tooEarly = await handleCloseMonth(
      ports({ today: () => calendarDate("2026-09-30") }),
      CASA.id,
      SEPTEMBER,
    );
    const notTheirs = await handleCloseMonth(
      ports({ readSession: async () => ({ memberId: BETO }) }),
      CASA.id,
      SEPTEMBER,
    );

    expect(tooEarly.kind).not.toBe(notTheirs.kind);
  });
});

describe("a month somebody already closed", () => {
  /*
   * The month is in exactly the state the tap was asking for, so this is not a
   * failure anybody made -- and there is no second close to regret.
   */
  it("is its own answer and not a failure", async () => {
    await expect(
      handleCloseMonth(
        ports({ close: async () => null }),
        CASA.id,
        SEPTEMBER,
      ),
    ).resolves.toEqual({ kind: "already-closed" });
  });
});

describe("anything else that goes wrong", () => {
  it("is a failure and never a refusal about the month", async () => {
    await expect(
      handleCloseMonth(
        ports({
          close: async () => {
            throw new Error("the connection went");
          },
        }),
        CASA.id,
        SEPTEMBER,
      ),
    ).resolves.toMatchObject({ kind: "failed" });
  });
});

describe("what a refused close says", () => {
  it("says something different for every way it can be refused", () => {
    const said = (
      [
        { kind: "not-signed-in" },
        { kind: "no-such-space" },
        { kind: "not-the-creator" },
        { kind: "not-over-yet" },
        { kind: "already-closed" },
        { kind: "no-such-month" },
        { kind: "failed", cause: null },
      ] as const
    ).map(closeRefusalMessage);

    expect(new Set(said).size).toBe(said.length);
    for (const sentence of said) expect(sentence).not.toBe("");
  });
});
