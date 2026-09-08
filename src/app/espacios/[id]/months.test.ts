import { describe, expect, it } from "vitest";
import { month } from "@/domain/calendar/month";
import { earliestOffered, monthChoices } from "./months";

const SEPTEMBER = month("2026-09");

/** A Space that has closed nothing, for the tests that are not about closing. */
const NONE: ReadonlySet<string> = new Set();

describe("the months the pill offers", () => {
  /*
   * The one guarantee this module exists for (#61): the month's list and the
   * plan reach the same months. Two readers each mapping `monthsToPlan` would
   * only promise it; one function is what makes it true.
   */
  it("offers the whole year the month in view falls in, and one either side", () => {
    expect(monthChoices(SEPTEMBER, SEPTEMBER, NONE).map((choice) => choice.month)).toEqual([
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
    const marked = monthChoices(SEPTEMBER, SEPTEMBER, NONE).filter(
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
    const labels = monthChoices(month("2027-03"), SEPTEMBER, NONE).map(
      (choice) => choice.label,
    );

    expect(labels).toContain("Marzo de 2027");
    expect(labels).toContain("Diciembre");
  });

  it("names a month of the reader's own year without one", () => {
    const choices = monthChoices(SEPTEMBER, SEPTEMBER, NONE);

    expect(choices.map((choice) => choice.label)).toContain("Septiembre");
  });
});

describe("the closed months among them", () => {
  /*
   * #119, decision 19. The pill has carried exactly one per-row state ever, and
   * this is the second: sending somebody into a closed month unwarned leaves
   * them to find out the screen behaves differently once they have arrived.
   */
  it("marks a month a row says is closed", () => {
    const choices = monthChoices(SEPTEMBER, SEPTEMBER, new Set(["2026-07"]));

    expect(
      choices.filter((choice) => choice.closed).map((choice) => choice.month),
    ).toEqual(["2026-07"]);
  });

  // A Space that has closed nothing gets fourteen open months, and not a
  // caller that has to remember to pass something.
  it("marks none where nothing is closed", () => {
    const choices = monthChoices(SEPTEMBER, SEPTEMBER, new Set());

    expect(choices.some((choice) => choice.closed)).toBe(false);
  });

  /*
   * A closed month is still a month somebody can read, and the one they are
   * reading may be it. The two marks are independent facts about one row, so
   * neither is derived from the other.
   */
  it("marks the month in view closed where it is both", () => {
    const [inView] = monthChoices(SEPTEMBER, SEPTEMBER, new Set(["2026-09"]))
      .filter((choice) => choice.inView);

    expect(inView).toMatchObject({ month: "2026-09", closed: true });
  });
});

describe("how far back the closed question reaches", () => {
  /*
   * The same literal the first test spells out, asked of the other half of the
   * pair (#119): a screen that asked about closed months over a shorter stretch
   * than the pill offers would leave rows at the top of the sheet unmarked, and
   * unmarked here means "open".
   */
  it("starts where the pill's own window starts", () => {
    expect(earliestOffered(SEPTEMBER)).toBe("2025-12");
  });
});
