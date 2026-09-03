import { describe, expect, it } from "vitest";
import {
  calendarDate,
  firstDayOf,
  isCalendarDate,
  isMonth,
  lastDayOf,
  month,
  monthOf,
  monthsAround,
  nextMonth,
  previousMonth,
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

describe("the months a screen can move to", () => {
  const SEPTEMBER = month("2026-09");

  it("always offers the month before", () => {
    expect(monthsAround(SEPTEMBER, SEPTEMBER).previous).toBe("2026-08");
  });

  it("offers the month after while there is one to read", () => {
    expect(monthsAround(month("2026-07"), SEPTEMBER).next).toBe("2026-08");
  });

  it("offers no month after the one being lived in", () => {
    // Nothing can have happened after today, so a later month is guaranteed
    // empty. Offering it is offering a blank screen with a month's name on it.
    expect(monthsAround(SEPTEMBER, SEPTEMBER).next).toBeNull();
  });

  it("offers no month after one already past the calendar", () => {
    expect(monthsAround(month("2027-03"), SEPTEMBER).next).toBeNull();
  });
});
