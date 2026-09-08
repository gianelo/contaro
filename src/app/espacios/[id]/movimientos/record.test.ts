import { describe, expect, it, vi } from "vitest";
import { ClosedMonthError } from "@/db/closed-months";
import { calendarDate, month } from "@/domain/calendar/month";
import { money } from "@/domain/money/money";
import {
  UnrecordableMovementError,
  type Movement,
  type MovementDraft,
} from "@/domain/movement/movement";
import type { Space } from "@/domain/space/space";
import {
  handleAmendMovement,
  handleRecordMovement,
  handleStrikeMovement,
  refusalMessage,
  type MovementPorts,
} from "./record";

const CASA: Space = {
  id: "space-casa",
  name: "Casa",
  currency: "ARS",
  createdBy: "member-gian",
};
const GIAN = "member-gian";
const TODAY = calendarDate("2026-09-03");

const RECORDED: Movement = {
  id: "mov-1",
  spaceId: CASA.id,
  direction: "expense",
  categoryId: "cat-super",
  amount: money(128_400, "ARS"),
  occurredOn: TODAY,
  recordedBy: GIAN,
  attributedTo: GIAN,
  carriedFrom: null,
  name: null,
};

const draft: MovementDraft = {
  spaceId: CASA.id,
  direction: "expense",
  categoryId: "cat-super",
  amount: 128_400,
  occurredOn: "2026-09-03",
  attributedTo: null,
  name: null,
};

const ports = (changes: Partial<MovementPorts> = {}): MovementPorts => ({
  readSession: async () => ({ memberId: GIAN }),
  findSpace: async () => CASA,
  today: () => TODAY,
  save: async () => RECORDED,
  amend: async () => RECORDED,
  strike: async () => true,
  ...changes,
});

describe("recording an expense from the screen", () => {
  it("records it, once the Member has been proved to be in the Space", async () => {
    const outcome = await handleRecordMovement(ports(), draft);

    expect(outcome).toEqual({ kind: "recorded", movement: RECORDED });
  });

  it("records it as the Member the session names and nobody else", async () => {
    const save = vi.fn(async () => RECORDED);

    await handleRecordMovement(
      ports({ readSession: async () => ({ memberId: "member-ana" }), save }),
      draft,
    );

    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({ recordedBy: "member-ana" }),
      draft,
    );
  });

  it("measures the day against the server's clock and never the browser's", async () => {
    // The screen offers the browser's today and the browser is the person's to
    // set. What "not yet" means is measured here, where nobody typing can
    // move it.
    const save = vi.fn(async () => RECORDED);

    await handleRecordMovement(ports({ save }), draft);

    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({ today: TODAY }),
      draft,
    );
  });

  it("refuses a Member with no session", async () => {
    const outcome = await handleRecordMovement(
      ports({ readSession: async () => null }),
      draft,
    );

    expect(outcome).toEqual({ kind: "not-signed-in" });
  });

  it("never writes anything when there is no session", async () => {
    const save = vi.fn(async () => RECORDED);

    await handleRecordMovement(
      ports({ readSession: async () => null, save }),
      draft,
    );

    expect(save).not.toHaveBeenCalled();
  });

  it("refuses a Space the Member is not in, without saying it exists", async () => {
    // A form field is a claim. The GET that rendered the screen proved
    // membership; without this, the Space someone types into is whichever one
    // they guessed the identifier of.
    const outcome = await handleRecordMovement(
      ports({ findSpace: async () => null }),
      draft,
    );

    expect(outcome).toEqual({ kind: "no-such-space" });
  });

  it("hands a bad answer back with the field it was about", async () => {
    const outcome = await handleRecordMovement(
      ports({
        save: async () => {
          throw new UnrecordableMovementError("amount", "it is nothing");
        },
      }),
      draft,
    );

    expect(outcome).toEqual({ kind: "rejected", field: "amount" });
  });

  it("keeps a dropped connection apart from a bad answer", async () => {
    // Saying "the amount is wrong" about a dropped connection sends a person
    // to correct a field that was never the problem.
    const cause = new Error("connection reset");
    const outcome = await handleRecordMovement(
      ports({
        save: async () => {
          throw cause;
        },
      }),
      draft,
    );

    expect(outcome).toEqual({ kind: "failed", cause });
  });
});

describe("correcting an expense from the screen", () => {
  it("corrects it and hands back what it now says", async () => {
    const outcome = await handleAmendMovement(ports(), CASA.id, "mov-1", {
      amount: 999,
    });

    expect(outcome).toEqual({ kind: "recorded", movement: RECORDED });
  });

  it("answers that there is no such Movement when the store finds none", async () => {
    const outcome = await handleAmendMovement(
      ports({ amend: async () => null }),
      CASA.id,
      "mov-1",
      { amount: 999 },
    );

    expect(outcome).toEqual({ kind: "no-such-movement" });
  });

  it("refuses to correct anything in a Space the Member is not in", async () => {
    const amend = vi.fn(async () => RECORDED);

    const outcome = await handleAmendMovement(
      ports({ findSpace: async () => null, amend }),
      CASA.id,
      "mov-1",
      { amount: 999 },
    );

    expect(outcome).toEqual({ kind: "no-such-space" });
    expect(amend).not.toHaveBeenCalled();
  });
});

describe("striking an expense out from the screen", () => {
  it("strikes it out and says so", async () => {
    const outcome = await handleStrikeMovement(ports(), CASA.id, "mov-1");

    expect(outcome).toEqual({ kind: "struck" });
  });

  it("records who struck it, taken from the session", async () => {
    const strike = vi.fn(async () => true);

    await handleStrikeMovement(
      ports({ readSession: async () => ({ memberId: "member-ana" }), strike }),
      CASA.id,
      "mov-1",
    );

    expect(strike).toHaveBeenCalledWith(CASA.id, "mov-1", "member-ana");
  });

  it("answers that there is no such Movement when nothing was struck", async () => {
    const outcome = await handleStrikeMovement(
      ports({ strike: async () => false }),
      CASA.id,
      "mov-1",
    );

    expect(outcome).toEqual({ kind: "no-such-movement" });
  });

  it("refuses to strike anything out of a Space the Member is not in", async () => {
    const strike = vi.fn(async () => true);

    const outcome = await handleStrikeMovement(
      ports({ findSpace: async () => null, strike }),
      CASA.id,
      "mov-1",
    );

    expect(outcome).toEqual({ kind: "no-such-space" });
    expect(strike).not.toHaveBeenCalled();
  });
});

describe("what a refusal says on the screen", () => {
  it("has something to say about every way this can go wrong", () => {
    const refusals = [
      { kind: "not-signed-in" },
      { kind: "no-such-space" },
      { kind: "no-such-movement" },
      { kind: "failed", cause: new Error("x") },
      { kind: "rejected", field: "amount" },
      { kind: "rejected", field: "category" },
      { kind: "rejected", field: "day" },
      { kind: "rejected", field: "attribution" },
      { kind: "rejected", field: "space" },
    ] as const;

    for (const refusal of refusals) {
      expect(refusalMessage(refusal)).toMatch(/\S/);
    }
  });
});

/*
 * The close, met from the ledger's screen (#117). The same refusal the plan
 * meets, from the same place, because the close freezes a month's Movements as
 * much as its plan (ADR-0002).
 */
describe("a month that has been closed", () => {
  const closed = () => new ClosedMonthError(month("2026-09"));

  it("refuses a Movement recorded into it, and not as a failure", async () => {
    await expect(
      handleRecordMovement(
        ports({
          save: async () => {
            throw closed();
          },
        }),
        draft,
      ),
    ).resolves.toEqual({ kind: "month-closed" });
  });

  it("refuses a correction the same way", async () => {
    await expect(
      handleAmendMovement(
        ports({
          amend: async () => {
            throw closed();
          },
        }),
        CASA.id,
        RECORDED.id,
        { amount: 1_00 },
      ),
    ).resolves.toEqual({ kind: "month-closed" });
  });

  it("refuses striking one out the same way", async () => {
    await expect(
      handleStrikeMovement(
        ports({
          strike: async () => {
            throw closed();
          },
        }),
        CASA.id,
        RECORDED.id,
      ),
    ).resolves.toEqual({ kind: "month-closed" });
  });

  /*
   * The sentence points at where the money goes instead, because there is
   * somewhere: ADR-0002 decided a late September ticket is an October expense,
   * and a person holding one is owed that rather than a closed door.
   */
  it("says the month is closed and where the ticket goes instead", async () => {
    const said = refusalMessage({ kind: "month-closed" });

    expect(said).not.toBe("");
    expect(said).not.toBe(refusalMessage({ kind: "failed", cause: null }));
    expect(said.toLowerCase()).not.toContain("de nuevo");
  });
});
