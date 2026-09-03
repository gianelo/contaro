import { describe, expect, it } from "vitest";
import { calendarDate } from "../calendar/month";
import type { Category } from "../category/category";
import { money } from "../money/money";
import type { Space } from "../space/space";
import {
  amendMovement,
  MAX_MOVEMENT_AMOUNT,
  recordMovement,
  RecorderIsImmutableError,
  spent,
  UnrecordableMovementError,
  type Movement,
  type Recording,
} from "./movement";

const CASA: Space = { id: "space-casa", name: "Casa", currency: "ARS" };
const GIAN = "member-gian";
const ANA = "member-ana";
const BETO = "member-beto";

const SUPER: Category = {
  id: "cat-super",
  spaceId: null,
  parentId: "cat-food",
  label: { kind: "catalogue", slug: "food.groceries" },
};

const MATE: Category = {
  id: "cat-mate",
  spaceId: CASA.id,
  parentId: null,
  label: { kind: "own", name: "Mate" },
};

const ELSEWHERE: Category = {
  id: "cat-asado",
  spaceId: "space-de-otro",
  parentId: null,
  label: { kind: "own", name: "Asado" },
};

const TODAY = calendarDate("2026-09-03");

const recording = (changes: Partial<Recording> = {}): Recording => ({
  space: CASA,
  recordedBy: GIAN,
  memberIds: [GIAN, ANA],
  categories: [SUPER, MATE],
  today: TODAY,
  ...changes,
});

const draft = (changes: Partial<Parameters<typeof recordMovement>[0]> = {}) => ({
  spaceId: CASA.id,
  categoryId: SUPER.id,
  amount: 128_400,
  occurredOn: "2026-09-03",
  attributedTo: null,
  ...changes,
});

describe("recording an expense", () => {
  it("records the amount in the Space's currency and the Category it is under", () => {
    const recorded = recordMovement(draft(), recording());

    expect(recorded).toEqual({
      spaceId: CASA.id,
      categoryId: SUPER.id,
      amount: money(128_400, "ARS"),
      occurredOn: TODAY,
      recordedBy: GIAN,
      attributedTo: GIAN,
    });
  });

  it("denominates it in the Space's currency and never in one the draft asked for", () => {
    // ADR-0001: every figure in a Space is in the Space's money. The draft
    // carries a number of minor units and has no say in which money they are.
    const dollars = recordMovement(
      draft(),
      recording({ space: { ...CASA, currency: "USD" } }),
    );

    expect(dollars.amount.currency).toBe("USD");
  });

  it("takes the recorder from the session and not from the answers", () => {
    // Story 22 in #1: there is always an honest record of who typed what. The
    // draft has nowhere to say who recorded it, which is the strongest form of
    // "cannot be changed" available.
    const recorded = recordMovement(draft(), recording({ recordedBy: ANA }));

    expect(recorded.recordedBy).toBe(ANA);
  });

  it("attributes it to the Member recording it when nobody else is named", () => {
    const recorded = recordMovement(draft({ attributedTo: null }), recording());

    expect(recorded.attributedTo).toBe(GIAN);
  });

  it("attributes it to the other Member of the Space when they are named", () => {
    // Story 21 in #1: recording something my partner spent.
    const recorded = recordMovement(draft({ attributedTo: ANA }), recording());

    expect(recorded.attributedTo).toBe(ANA);
    expect(recorded.recordedBy).toBe(GIAN);
  });

  it("refuses to attribute it to somebody who is not in the Space", () => {
    expect(() => recordMovement(draft({ attributedTo: BETO }), recording()))
      .toThrow(UnrecordableMovementError);
  });

  it("takes a Category this Space's Members added themselves", () => {
    const recorded = recordMovement(draft({ categoryId: MATE.id }), recording());

    expect(recorded.categoryId).toBe(MATE.id);
  });

  it("refuses a Category this Space cannot see", () => {
    // Story 14 in #1: naming does not leak between Spaces, and neither does
    // money recorded against it.
    expect(() =>
      recordMovement(draft({ categoryId: ELSEWHERE.id }), recording({
        categories: [SUPER, MATE, ELSEWHERE],
      })),
    ).toThrow(UnrecordableMovementError);
  });

  it("refuses a Category nobody has", () => {
    expect(() => recordMovement(draft({ categoryId: "cat-nada" }), recording()))
      .toThrow(UnrecordableMovementError);
  });

  it("refuses an expense of nothing", () => {
    expect(() => recordMovement(draft({ amount: 0 }), recording()))
      .toThrow(UnrecordableMovementError);
  });

  it("refuses an expense of less than nothing", () => {
    // An expense is money that left. Which direction it went is what kind of
    // Movement it is, not the sign of its amount.
    expect(() => recordMovement(draft({ amount: -500 }), recording()))
      .toThrow(UnrecordableMovementError);
  });

  it("refuses part of a minor unit", () => {
    // ADR-0007: an amount is a whole number of minor units, so that a budget
    // does not drift by a cent a month.
    expect(() => recordMovement(draft({ amount: 12.5 }), recording()))
      .toThrow(UnrecordableMovementError);
  });

  it("refuses an amount larger than any household spends", () => {
    expect(() =>
      recordMovement(draft({ amount: MAX_MOVEMENT_AMOUNT + 1 }), recording()),
    ).toThrow(UnrecordableMovementError);

    expect(
      recordMovement(draft({ amount: MAX_MOVEMENT_AMOUNT }), recording()).amount,
    ).toEqual(money(MAX_MOVEMENT_AMOUNT, "ARS"));
  });

  it("refuses a day that is on no calendar", () => {
    expect(() => recordMovement(draft({ occurredOn: "2026-02-30" }), recording()))
      .toThrow(UnrecordableMovementError);
  });

  it("takes a day that has already happened", () => {
    const recorded = recordMovement(
      draft({ occurredOn: "2026-08-29" }),
      recording(),
    );

    expect(recorded.occurredOn).toBe("2026-08-29");
  });

  it("refuses a day that has not happened yet", () => {
    // A Movement always means money that already moved: there is no pending
    // state on one (#1). Something due next week lives on a Budget item.
    expect(() => recordMovement(draft({ occurredOn: "2026-10-01" }), recording()))
      .toThrow(UnrecordableMovementError);
  });

  it("takes the day after the clock's, because somebody is always ahead of it", () => {
    // Kiritimati is UTC+14. Half past midnight there is still yesterday
    // wherever this runs, and refusing would leave that Member unable to
    // record anything for the first fourteen hours of every day.
    const recorded = recordMovement(
      draft({ occurredOn: "2026-09-04" }),
      recording(),
    );

    expect(recorded.occurredOn).toBe("2026-09-04");
  });

  it("refuses two days past the clock's, which no timezone explains", () => {
    expect(() => recordMovement(draft({ occurredOn: "2026-09-05" }), recording()))
      .toThrow(UnrecordableMovementError);
  });

  it("refuses a draft that names another Space than the one it is recorded in", () => {
    expect(() => recordMovement(draft({ spaceId: "space-de-otro" }), recording()))
      .toThrow(UnrecordableMovementError);
  });

  it("says which answer was the bad one, so a screen can point at it", () => {
    const fields = [
      [draft({ amount: 0 }), "amount"],
      [draft({ categoryId: "cat-nada" }), "category"],
      [draft({ occurredOn: "mañana" }), "day"],
      [draft({ attributedTo: BETO }), "attribution"],
      [draft({ spaceId: "otro" }), "space"],
    ] as const;

    for (const [bad, field] of fields) {
      expect(() => recordMovement(bad, recording())).toThrow(
        expect.objectContaining({ field }),
      );
    }
  });
});

describe("correcting a Movement that was got wrong", () => {
  const recorded: Movement = {
    id: "mov-1",
    spaceId: CASA.id,
    categoryId: SUPER.id,
    amount: money(128_400, "ARS"),
    occurredOn: TODAY,
    recordedBy: GIAN,
    attributedTo: GIAN,
  };

  it("changes the amount that was typed wrong", () => {
    const fixed = amendMovement(recorded, { amount: 12_840 }, recording());

    expect(fixed.amount).toEqual(money(12_840, "ARS"));
  });

  it("changes the Category it was filed under", () => {
    const fixed = amendMovement(recorded, { categoryId: MATE.id }, recording());

    expect(fixed.categoryId).toBe(MATE.id);
  });

  it("changes the day it happened on", () => {
    const fixed = amendMovement(recorded, { occurredOn: "2026-09-01" }, recording());

    expect(fixed.occurredOn).toBe("2026-09-01");
  });

  it("changes whose money it was", () => {
    const fixed = amendMovement(recorded, { attributedTo: ANA }, recording());

    expect(fixed.attributedTo).toBe(ANA);
  });

  it("leaves alone whatever the correction did not mention", () => {
    const fixed = amendMovement(recorded, { amount: 999 }, recording());

    expect(fixed).toEqual({ ...recorded, amount: money(999, "ARS") });
  });

  it("keeps the Member who recorded it, even when somebody else corrects it", () => {
    // Story 22 in #1: `recordedBy` answers "who typed this in" and stays true
    // however many hands the Movement passes through afterwards.
    const fixed = amendMovement(
      recorded,
      { amount: 999 },
      recording({ recordedBy: ANA }),
    );

    expect(fixed.recordedBy).toBe(GIAN);
  });

  it("refuses outright any attempt to name a different recorder", () => {
    expect(() =>
      amendMovement(recorded, { recordedBy: ANA }, recording()),
    ).toThrow(RecorderIsImmutableError);
  });

  it("holds a correction to every rule a recording is held to", () => {
    const refused = [
      { amount: 0 },
      { amount: 12.5 },
      { categoryId: ELSEWHERE.id },
      { occurredOn: "2026-10-01" },
      { attributedTo: BETO },
    ];

    for (const change of refused) {
      expect(() => amendMovement(recorded, change, recording())).toThrow(
        UnrecordableMovementError,
      );
    }
  });

  it("changes nothing at all when it refuses the correction", () => {
    // Checked before anything is applied, the way `amendSpace` checks: a
    // refused correction must not land its acceptable half.
    expect(() =>
      amendMovement(recorded, { amount: 999, attributedTo: BETO }, recording()),
    ).toThrow(UnrecordableMovementError);

    expect(recorded.amount).toEqual(money(128_400, "ARS"));
  });

  it("refuses to correct a Movement recorded in another Space", () => {
    expect(() =>
      amendMovement(
        { ...recorded, spaceId: "space-de-otro" },
        { amount: 999 },
        recording(),
      ),
    ).toThrow(UnrecordableMovementError);
  });
});

describe("what a Space has spent", () => {
  const expense = (amount: number): Movement => ({
    id: `mov-${amount}`,
    spaceId: CASA.id,
    categoryId: SUPER.id,
    amount: money(amount, "ARS"),
    occurredOn: TODAY,
    recordedBy: GIAN,
    attributedTo: GIAN,
  });

  it("is nothing at all when nothing has been recorded", () => {
    expect(spent([], "ARS")).toEqual(money(0, "ARS"));
  });

  it("is the sum of what was recorded", () => {
    expect(spent([expense(128_400), expense(18_000)], "ARS")).toEqual(
      money(146_400, "ARS"),
    );
  });

  it("refuses to add up money of two different kinds", () => {
    // A Space is denominated in one currency (ADR-0001), so a Movement in
    // another can only come from a write that went round the domain. Adding
    // the numbers would put a figure on screen that means nothing.
    expect(() => spent([{ ...expense(100), amount: money(100, "USD") }], "ARS"))
      .toThrow(UnrecordableMovementError);
  });
});
