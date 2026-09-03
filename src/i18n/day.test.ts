import { describe, expect, it } from "vitest";
import { calendarDate, month } from "@/domain/calendar/month";
import { dayLabel, monthLabel } from "./day";

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

describe("how a month is named to a person", () => {
  it("names a month of this year without repeating the year", () => {
    expect(monthLabel(month("2026-09"), month("2026-01"))).toBe("Septiembre");
  });

  it("names the year of a month outside the one being lived in", () => {
    expect(monthLabel(month("2025-12"), month("2026-01"))).toBe(
      "Diciembre de 2025",
    );
  });

  it("names it the way a heading is written, not the way a sentence is", () => {
    // Intl writes "septiembre", which is right inside "3 de septiembre" and
    // wrong at the top of a screen. The heading is the only place it is
    // capitalised, which is why it happens here and not in `dayLabel`.
    expect(monthLabel(month("2026-01"), month("2026-01"))).toBe("Enero");
  });

  it("names every month of the year", () => {
    const named = Array.from({ length: 12 }, (_, index) =>
      monthLabel(month(`2026-${String(index + 1).padStart(2, "0")}`), month("2026-01")),
    );

    expect(new Set(named).size).toBe(12);
    expect(named.every((name) => /^[A-ZÁÉÍÓÚ]/.test(name))).toBe(true);
  });
});
