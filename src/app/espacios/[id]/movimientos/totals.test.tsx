import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MonthTotals } from "./totals";

describe("the two figures a month is about", () => {
  /*
   * Each label against the figure it names, and not merely both present: two
   * amounts with the labels swapped would pass a test that only looked for
   * them. These two are the whole point of the top of the screen.
   */
  it("says which figure is which", () => {
    render(<MonthTotals earned="$5.320.000" spent="$3.994.900" />);

    expect(screen.getByText("Ingresos").nextElementSibling).toHaveTextContent(
      "$5.320.000",
    );
    expect(screen.getByText("Gastos").nextElementSibling).toHaveTextContent(
      "$3.994.900",
    );
  });

  /*
   * Both figures and never their difference. A single net number renders a
   * month in which a salary arrived and the rent was paid as though almost
   * nothing had happened in it, which is the opposite of what a person opens
   * this screen to find out (ADR-0016).
   */
  it("never shows the two of them as one", () => {
    render(<MonthTotals earned="$5.320.000" spent="$3.994.900" />);

    expect(screen.getByText("$5.320.000")).toBeInTheDocument();
    expect(screen.getByText("$3.994.900")).toBeInTheDocument();
  });

  /*
   * What came in is written in the accent colour and what went out is not
   * (#39). ADR-0016 refused a colour here and this reopens it: the reason it
   * gave was that a difference carried by colour alone is one somebody cannot
   * see, and these two are told apart by their labels first -- the colour is
   * what makes the pair readable at a glance, not what makes it readable.
   */
  it("writes what came in in the accent colour, and what went out in the ordinary ink", () => {
    render(<MonthTotals earned="$5.320.000" spent="$3.994.900" />);

    expect(screen.getByText("$5.320.000").className).not.toBe(
      screen.getByText("$3.994.900").className,
    );
  });

  // A month nobody has recorded anything in still owes two honest figures.
  // Zero is an answer; a blank is the top of the screen failing at its job.
  it("still shows both figures for a month with nothing in it", () => {
    render(<MonthTotals earned="$0" spent="$0" />);

    expect(screen.getAllByText("$0")).toHaveLength(2);
  });
});
