import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MonthSummary, type MonthSummaryProps } from "./summary";

const props = (
  changes: Partial<MonthSummaryProps["summary"]> = {},
  pace: MonthSummaryProps["pace"] = null,
): MonthSummaryProps => ({
  summary: {
    spent: "$3.994.900",
    planned: "$4.603.900",
    filled: 0.87,
    over: false,
    ...changes,
  },
  pace,
});

const fillOf = (container: HTMLElement) =>
  container.querySelector<HTMLElement>("[data-meter-fill]")?.style.width;

const trackOf = (container: HTMLElement) =>
  container.querySelector<HTMLElement>("[data-meter-fill]")?.parentElement;

describe("the month's summary card", () => {
  /*
   * Each label against the figure it names, and not merely both present: two
   * amounts with the labels swapped would pass a test that only looked for
   * them, and which is which is the whole reason the card exists.
   */
  it("says what the month cost and what it was planned to cost", () => {
    render(<MonthSummary {...props()} />);

    expect(screen.getByText("Gastado").nextElementSibling).toHaveTextContent(
      "$3.994.900",
    );
    expect(
      screen.getByText("Presupuestado").nextElementSibling,
    ).toHaveTextContent("$4.603.900");
  });

  /*
   * Which figure wears which rule, and not merely that the two rules differ:
   * the styles swapped over would pass that weaker test and would be exactly
   * the mistake -- the plan louder than the spending it is read against. How
   * much quieter is `summary.source.test.ts`, because that is a fact about two
   * rules together and neither rule can state it alone.
   */
  it("writes the plan in the plan's rule and the spending in the spending's", () => {
    render(<MonthSummary {...props()} />);

    expect(screen.getByText("$3.994.900").className).toMatch(/spent/);
    expect(screen.getByText("$4.603.900").className).toMatch(/planned/);
  });

  // #11's last criterion, which never shipped because the card it names
  // arrives with this ticket: the month drawn against its plan.
  it("draws the meter of the month against its plan", () => {
    const { container } = render(<MonthSummary {...props()} />);

    expect(fillOf(container)).toBe("87%");
  });

  /*
   * Ten pixels, which is the criterion's own number and the second height
   * `Meter` was written for -- "7 in a row, 10 across a card" has had no caller
   * for the card until now. Held here because nothing else pins it: a meter
   * drawn at the row's 7 would still fill correctly and still be wrong.
   */
  it("draws it at the height a meter across a card is drawn at", () => {
    const { container } = render(<MonthSummary {...props()} />);

    expect(trackOf(container)?.style.height).toBe("10px");
  });

  /*
   * A month nobody has planned has nothing to be a share of. The plan's own
   * empty state says so in words below; an empty length here would say the
   * month has spent none of a plan that does not exist.
   */
  it("draws no meter on a month nobody has planned", () => {
    const { container } = render(<MonthSummary {...props({ filled: null })} />);

    expect(container.querySelector("[data-meter-fill]")).toBeNull();
  });

  it("still says both figures on a month nobody has planned", () => {
    render(<MonthSummary {...props({ filled: null, planned: "$0" })} />);

    expect(screen.getByText("$3.994.900")).toBeInTheDocument();
    expect(screen.getByText("$0")).toBeInTheDocument();
  });

  /*
   * A full bar in the accent colour on a month that has blown its plan reads
   * as "done", which is the opposite of what happened. The two figures above
   * already carry the fact -- spent above planned -- so the turn is the second
   * way of saying it and never the only one.
   */
  it("turns the meter on a month past its plan", () => {
    const { container } = render(
      <MonthSummary {...props({ filled: 1.2, over: true })} />,
    );

    expect(trackOf(container)?.className).toMatch(/over/);
  });

  it("leaves it untouched on a month inside its plan", () => {
    const { container } = render(<MonthSummary {...props()} />);

    expect(trackOf(container)?.className).not.toMatch(/over/);
  });

  // How the spending is going against the calendar (#14), in the card the
  // canvas draws it in and directly under the figures it is about.
  it("carries the pace of the month", () => {
    render(
      <MonthSummary
        {...props(
          {},
          {
            lead: "Día 18 de 30 · en gastos variables vas",
            standing: "$620.000 arriba del ritmo",
            ahead: true,
          },
        )}
      />,
    );

    expect(screen.getByText(/arriba del ritmo/)).toBeInTheDocument();
  });
});
