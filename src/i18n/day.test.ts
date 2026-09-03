import { describe, expect, it } from "vitest";
import { calendarDate } from "@/domain/calendar/month";
import { dayLabel } from "./day";

const TODAY = calendarDate("2026-09-03");

describe("how a day is named to a person", () => {
  it("names today as today, because that is what a person calls it", () => {
    expect(dayLabel(TODAY, TODAY)).toBe("Hoy");
  });

  it("names any other day by its date, in Spanish", () => {
    expect(dayLabel(calendarDate("2026-09-01"), TODAY)).toBe("1 de septiembre");
  });

  it("names a day in another year with the year, so it cannot be misread", () => {
    expect(dayLabel(calendarDate("2025-12-31"), TODAY)).toBe(
      "31 de diciembre de 2025",
    );
  });

  it("names the day it says and never the one a timezone would slide it to", () => {
    // "2026-09-01" parses as midnight UTC. Formatted anywhere west of it, a
    // naive read prints the 31st of August.
    expect(dayLabel(calendarDate("2026-01-01"), TODAY)).toBe(
      "1 de enero",
    );
  });
});
