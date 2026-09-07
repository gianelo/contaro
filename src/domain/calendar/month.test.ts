import { describe, expect, it } from "vitest";
import {
  calendarDate,
  dayOf,
  daysBetween,
  firstDayOf,
  isCalendarDate,
  isMonth,
  daysIn,
  lastDayOf,
  month,
  monthOf,
  monthSoFar,
  monthsToPlan,
  nextMonth,
  previousMonth,
  sameDayIn,
  UnreadableDateError,
  UnreadableMonthError,
} from "./month";

describe("the day a Movement happened on", () => {
  it("reads a day written the way a calendar writes it", () => {
    expect(calendarDate("2026-09-03")).toBe("2026-09-03");
  });

  it("refuses a day that no calendar has", () => {
    expect(() => calendarDate("2026-02-30")).toThrow(UnreadableDateError);
  });

  it("refuses a month no year has", () => {
    expect(() => calendarDate("2026-13-01")).toThrow(UnreadableDateError);
  });

  it("refuses anything that is not a day at all", () => {
    expect(() => calendarDate("hoy")).toThrow(UnreadableDateError);
    expect(() => calendarDate("")).toThrow(UnreadableDateError);
  });

  it("refuses a day written without its leading zeros", () => {
    // Postgres would take "2026-9-3" and so would Date; the point of writing
    // one shape down is that two rows a day apart sort as two rows a day apart.
    expect(() => calendarDate("2026-9-3")).toThrow(UnreadableDateError);
  });

  it("takes the leap day of a year that has one", () => {
    expect(calendarDate("2028-02-29")).toBe("2028-02-29");
  });

  it("refuses the leap day of a year that has none", () => {
    expect(() => calendarDate("2027-02-29")).toThrow(UnreadableDateError);
  });

  it("answers whether a string from outside is a day, without throwing", () => {
    expect(isCalendarDate("2026-09-03")).toBe(true);
    expect(isCalendarDate("2026-02-30")).toBe(false);
  });
});

describe("the month a day falls in", () => {
  it("names the month of a day", () => {
    expect(monthOf(calendarDate("2026-09-03"))).toBe("2026-09");
  });

  it("runs from the first of the month to its last day", () => {
    expect(firstDayOf(month("2026-09"))).toBe("2026-09-01");
    expect(lastDayOf(month("2026-09"))).toBe("2026-09-30");
  });

  it("ends February on the 29th in a leap year and the 28th otherwise", () => {
    expect(lastDayOf(month("2028-02"))).toBe("2028-02-29");
    expect(lastDayOf(month("2027-02"))).toBe("2027-02-28");
  });

  it("ends December on the 31st, without spilling into January", () => {
    expect(lastDayOf(month("2026-12"))).toBe("2026-12-31");
  });

  // The same fact counted rather than written out, because two screens offer
  // the days of a month as a list to pick a due day from and neither should be
  // reading a date apart by string offset to get there.
  it("counts how many days a month has", () => {
    expect(daysIn(month("2026-09"))).toBe(30);
    expect(daysIn(month("2026-12"))).toBe(31);
    expect(daysIn(month("2028-02"))).toBe(29);
    expect(daysIn(month("2027-02"))).toBe(28);
  });
});

describe("whether a string from outside names a month", () => {
  it("takes a month written the way a calendar writes it", () => {
    expect(isMonth("2026-09")).toBe(true);
    expect(isMonth("2026-01")).toBe(true);
    expect(isMonth("2026-12")).toBe(true);
  });

  it("refuses a month no year has", () => {
    expect(isMonth("2026-00")).toBe(false);
    expect(isMonth("2026-13")).toBe(false);
  });

  it("refuses anything that is not a month at all", () => {
    // A month arrives from a URL, so it is any string at all — and every
    // reader of one goes on to build days out of it, which throws.
    expect(isMonth("septiembre")).toBe(false);
    expect(isMonth("")).toBe(false);
    expect(isMonth("2026-9")).toBe(false);
    expect(isMonth("2026-09-03")).toBe(false);
  });

  it("agrees with the days it can be turned into", () => {
    // The point of asking: everything that passes must survive being made
    // into a first and a last day, which is what a reader does with it.
    for (const written of ["2026-01", "2026-02", "2028-02", "2026-12"]) {
      expect(isMonth(written)).toBe(true);
      expect(() => firstDayOf(month(written))).not.toThrow();
      expect(() => lastDayOf(month(written))).not.toThrow();
    }
  });

  it("refuses to build a month out of something that is not one", () => {
    expect(() => month("septiembre")).toThrow(UnreadableMonthError);
    expect(() => month("2026-13")).toThrow(UnreadableMonthError);
  });
});

describe("the month before and the month after", () => {
  it("steps back a month", () => {
    expect(previousMonth(month("2026-09"))).toBe("2026-08");
  });

  it("steps forward a month", () => {
    expect(nextMonth(month("2026-09"))).toBe("2026-10");
  });

  it("steps back over the turn of the year", () => {
    expect(previousMonth(month("2026-01"))).toBe("2025-12");
  });

  it("steps forward over the turn of the year", () => {
    expect(nextMonth(month("2026-12"))).toBe("2027-01");
  });

  it("comes back to where it started", () => {
    // Two steps that undo each other, which is what the control on the month's
    // screen is: a thumb that goes back and forward lands on the month it left.
    expect(nextMonth(previousMonth(month("2026-01")))).toBe("2026-01");
  });
});

describe("the months a screen can be opened on", () => {
  // One window for both screens (#61): the plan and the month's list are two
  // readings of one month, so the pill offers the same fourteen on each. The
  // `‹ Septiembre ›` walker stopped forwards at the month being lived in
  // because a step cost a screen load; a picker costs nothing untapped.
  it("offers the whole year the month in view falls in", () => {
    expect(monthsToPlan(month("2026-09"))).toEqual([
      "2025-12",
      "2026-01",
      "2026-02",
      "2026-03",
      "2026-04",
      "2026-05",
      "2026-06",
      "2026-07",
      "2026-08",
      "2026-09",
      "2026-10",
      "2026-11",
      "2026-12",
      "2027-01",
    ]);
  });

  it("offers the month either side of that year, so December reaches January", () => {
    // The 28th of December is exactly when somebody plans January, and the
    // year the pill is standing in would otherwise stop one month short of it.
    expect(monthsToPlan(month("2026-12"))).toContain("2027-01");
    expect(monthsToPlan(month("2026-01"))).toContain("2025-12");
  });

  it("offers the same months wherever in a year it is asked from", () => {
    // The pill is about the year, not about the month: walking within one is
    // what it exists to replace, so it cannot slide as a thumb moves inside it.
    expect(monthsToPlan(month("2026-01"))).toEqual(monthsToPlan(month("2026-12")));
  });

  it("always offers the month being read", () => {
    // Otherwise the control could not say which month it is standing on.
    expect(monthsToPlan(month("2026-09"))).toContain("2026-09");
  });
});

describe("a day named by which of a month's days it is", () => {
  it("builds the day a Fixed item falls due on", () => {
    expect(dayOf(month("2026-09"), 1)).toBe("2026-09-01");
    expect(dayOf(month("2026-09"), 22)).toBe("2026-09-22");
  });

  it("writes a single digit with its leading zero", () => {
    // The same shape everything else is written in, so two days a day apart
    // still sort as two days a day apart.
    expect(dayOf(month("2026-09"), 5)).toBe("2026-09-05");
  });

  it("refuses a day the month does not have", () => {
    // February is the case this exists for: a plan whose due day is the 30th
    // is a plan for a day that will not arrive, and rounding it back to the
    // 28th would move a due date behind somebody's back.
    expect(() => dayOf(month("2026-02"), 30)).toThrow(UnreadableDateError);
    expect(() => dayOf(month("2026-09"), 31)).toThrow(UnreadableDateError);
  });

  it("has the last day of every month it does have", () => {
    expect(dayOf(month("2026-02"), 28)).toBe("2026-02-28");
    expect(dayOf(month("2024-02"), 29)).toBe("2024-02-29");
    expect(dayOf(month("2026-01"), 31)).toBe("2026-01-31");
  });

  it("refuses a day no month has at all", () => {
    expect(() => dayOf(month("2026-09"), 0)).toThrow(UnreadableDateError);
    expect(() => dayOf(month("2026-09"), -1)).toThrow(UnreadableDateError);
    expect(() => dayOf(month("2026-09"), 1.5)).toThrow(UnreadableDateError);
  });
});

describe("how many days apart two days are", () => {
  it("counts forwards", () => {
    expect(daysBetween(calendarDate("2026-09-18"), calendarDate("2026-09-22"))).toBe(4);
  });

  it("counts backwards as a negative", () => {
    // What makes an unpaid item past its day answerable at all: the same
    // subtraction, and the sign is the whole of the difference.
    expect(daysBetween(calendarDate("2026-09-22"), calendarDate("2026-09-18"))).toBe(-4);
  });

  it("counts the same day as none", () => {
    expect(daysBetween(calendarDate("2026-09-18"), calendarDate("2026-09-18"))).toBe(0);
  });

  it("crosses a month and a year without knowing how long either is", () => {
    expect(daysBetween(calendarDate("2026-01-30"), calendarDate("2026-02-02"))).toBe(3);
    expect(daysBetween(calendarDate("2025-12-31"), calendarDate("2026-01-01"))).toBe(1);
    // February of a leap year, which nothing here is told about.
    expect(daysBetween(calendarDate("2024-02-28"), calendarDate("2024-03-01"))).toBe(2);
  });
});

describe("how far through a month a day is", () => {
  it("counts the day being stood in, and how many the month has", () => {
    // Inclusive: the 18th is the 18th day of the month and not the 17th
    // elapsed. What the sentence says is which day it is, and a person
    // standing on the 1st is on day one.
    expect(monthSoFar(month("2026-09"), calendarDate("2026-09-18"))).toEqual({
      day: 18,
      days: 30,
    });
  });

  it("reaches the end of the month without knowing how long it is", () => {
    expect(monthSoFar(month("2026-09"), calendarDate("2026-09-30"))).toEqual({
      day: 30,
      days: 30,
    });
    // February of a leap year, which nothing here is told about.
    expect(monthSoFar(month("2024-02"), calendarDate("2024-02-29"))).toEqual({
      day: 29,
      days: 29,
    });
    expect(monthSoFar(month("2026-02"), calendarDate("2026-02-01"))).toEqual({
      day: 1,
      days: 28,
    });
  });

  it("is nothing at all for a month the day is not inside", () => {
    // Neither a month already over nor one nobody has reached is a month
    // there is a way through: "day 18 of 30" said about August in September
    // is a sentence about a day nobody is standing on.
    expect(monthSoFar(month("2026-08"), calendarDate("2026-09-18"))).toBeNull();
    expect(monthSoFar(month("2026-10"), calendarDate("2026-09-18"))).toBeNull();
  });
});

describe("the same day of the month, carried into another month", () => {
  it("keeps the day of the month it was on", () => {
    expect(sameDayIn(month("2026-10"), calendarDate("2026-09-22"))).toBe(
      "2026-10-22",
    );
    expect(sameDayIn(month("2026-01"), calendarDate("2025-12-01"))).toBe(
      "2026-01-01",
    );
  });

  /*
   * The one case that has no exact answer, and the only place in this module
   * where a day is moved rather than refused. `dayOf` refuses the 31st of
   * September because a person typed it and a typed day is an answer; nobody
   * types this one. A plan carried forward has to land somewhere, and the last
   * day the month has is the nearest day that arrives (ADR-0050).
   */
  it("lands on the last day of a month too short to hold it", () => {
    expect(sameDayIn(month("2026-09"), calendarDate("2026-08-31"))).toBe(
      "2026-09-30",
    );
    expect(sameDayIn(month("2026-02"), calendarDate("2026-01-31"))).toBe(
      "2026-02-28",
    );
    expect(sameDayIn(month("2024-02"), calendarDate("2024-01-31"))).toBe(
      "2024-02-29",
    );
  });

  it("carries a day into the month it is already on", () => {
    expect(sameDayIn(month("2026-09"), calendarDate("2026-09-05"))).toBe(
      "2026-09-05",
    );
  });
});
