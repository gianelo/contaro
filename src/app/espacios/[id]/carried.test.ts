import { describe, expect, it } from "vitest";
import { calendarDate, month } from "@/domain/calendar/month";
import { money } from "@/domain/money/money";
import type { CarryOver } from "@/domain/space/carry-over";
import type { Space } from "@/domain/space/space";
import type { Reader } from "@/app/reader";
import { carryOverToShow } from "./carried";

const ANA = "3f2b0c1e-0000-4000-8000-000000000001";
const BETO = "3f2b0c1e-0000-4000-8000-000000000002";

const CASA: Space = {
  id: "3f2b0c1e-0000-4000-8000-0000000000ca",
  name: "Casa",
  currency: "ARS",
  createdBy: ANA,
};

const SEPTEMBER = month("2026-09");

const READER: Reader = {
  today: calendarDate("2026-10-03"),
  locales: ["es-AR"],
};

const SURPLUS: CarryOver = {
  from: SEPTEMBER,
  kind: "surplus",
  amount: money(609_000_00, "ARS"),
};

const DEFICIT: CarryOver = {
  from: SEPTEMBER,
  kind: "deficit",
  amount: money(240_000_00, "ARS"),
};

const shown = (changes: Partial<Parameters<typeof carryOverToShow>[0]> = {}) =>
  carryOverToShow({
    space: CASA,
    memberId: ANA,
    creatorName: "Ana",
    left: SURPLUS,
    inViewClosed: false,
    reader: READER,
    ...changes,
  });

describe("what the card says", () => {
  it("names both months and the figure, already written for the Reader", () => {
    expect(shown()).toEqual({
      from: SEPTEMBER,
      name: "septiembre",
      into: "octubre",
      amount: "$\u00a0609.000,00",
      kind: "surplus",
      waitingOn: null,
      offer: true,
    });
  });

  it("says nothing at all about a month that left nothing", () => {
    expect(shown({ left: null })).toBeNull();
  });
});

describe("who the surplus is offered to", () => {
  /*
   * ADR-0051's exception, the second of its two acts. Said by naming who it is
   * waiting on and never by a greyed-out control -- a disabled button answers
   * "why not" with nothing, and a sentence with a name in it has answered.
   */
  it("offers it to the creator", () => {
    expect(shown()?.offer).toBe(true);
    expect(shown()?.waitingOn).toBeNull();
  });

  it("states it to the invited Member, naming who it waits on", () => {
    const card = shown({ memberId: BETO });

    expect(card?.offer).toBe(false);
    expect(card?.waitingOn).toBe("Ana");
  });
});

describe("a deficit", () => {
  /*
   * Decision 11 of #109: the verb does not survive into this state, for
   * anybody. Approving a debt into existence was never a thing to put under a
   * thumb, and the domain refuses it as well -- this is the screen agreeing
   * with a rule rather than being it.
   */
  it("is stated to the creator and never offered", () => {
    const card = shown({ left: DEFICIT });

    expect(card?.kind).toBe("deficit");
    expect(card?.offer).toBe(false);
    expect(card?.waitingOn).toBeNull();
  });

  it("is stated to the invited Member with nobody to wait on", () => {
    expect(shown({ left: DEFICIT, memberId: BETO })?.waitingOn).toBeNull();
  });
});

describe("a month that has itself been closed", () => {
  /*
   * ADR-0054: a closed month keeps every link and loses every control.
   * Approving writes a Movement into the month on screen, so the control comes
   * off with all the others and the sentence stays.
   */
  it("states the surplus to the creator and offers nothing", () => {
    const card = shown({ inViewClosed: true });

    expect(card?.offer).toBe(false);
    expect(card?.waitingOn).toBeNull();
  });

  it("does not name somebody to wait on, because nobody can act", () => {
    expect(shown({ inViewClosed: true, memberId: BETO })?.waitingOn).toBeNull();
  });
});
