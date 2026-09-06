import { describe, expect, it } from "vitest";
import { month } from "@/domain/calendar/month";
import { monthChoices } from "./months";

const SEPTEMBER = month("2026-09");

describe("the months the pill offers", () => {
  /*
   * The one guarantee this module exists for (#61): the month's list and the
   * plan reach the same months. Two readers each mapping `monthsToPlan` would
   * only promise it; one function is what makes it true.
   */
  it("offers the whole year the month in view falls in, and one either side", () => {
    expect(monthChoices(SEPTEMBER, SEPTEMBER).map((choice) => choice.month)).toEqual([
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

  // The month being read is the one the pill ticks, and it is exactly one of
  // the fourteen: a list where nothing is marked is a list nobody can place
  // themselves in.
  it("marks the month being read, and only it", () => {
    const marked = monthChoices(SEPTEMBER, SEPTEMBER).filter(
      (choice) => choice.inView,
    );

    expect(marked.map((choice) => choice.month)).toEqual(["2026-09"]);
  });

  /*
   * Named against the month being lived in and never against the month in
   * view, so the year is written only where it is a different year from the
   * reader's. Reading March 2027 from September 2026, a bare "Marzo" would be
   * a lie about which March it is — and the December of the reader's own year
   * stays bare in the same list, which is the whole point of the rule.
   */
  it("names a month of another year with its year, and the reader's without one", () => {
    const labels = monthChoices(month("2027-03"), SEPTEMBER).map(
      (choice) => choice.label,
    );

    expect(labels).toContain("Marzo de 2027");
    expect(labels).toContain("Diciembre");
  });

  it("names a month of the reader's own year without one", () => {
    const choices = monthChoices(SEPTEMBER, SEPTEMBER);

    expect(choices.map((choice) => choice.label)).toContain("Septiembre");
  });
});
