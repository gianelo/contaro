import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WayIntoThePlan } from "./way-in";

/** The way in as a month's screen mounts it, on a month with a plan or without. */
const theWayIn = (nothingPlanned = false) => (
  <WayIntoThePlan
    spaceId="space-casa"
    month="2026-09"
    nothingPlanned={nothingPlanned}
  />
);

const group = () => screen.getByRole("group", { name: "Presupuesto" });

describe("the way into a month's plan", () => {
  /*
   * The month is in the destination and not only in the words. A person
   * planning October in September is on October's screen, and a way in that
   * dropped the month would land them on the month they are standing in --
   * which is the one month they were not planning.
   */
  it("offers a way into the plan of the month being read", () => {
    render(theWayIn());

    expect(
      screen.getByRole("link", { name: /Agregar al plan/ }),
    ).toHaveAttribute("href", "/espacios/space-casa/presupuesto/nuevo?mes=2026-09");
  });

  /*
   * Criterion #4 of #81: a month with nothing planned still says so, and still
   * shows the way to plan. Both in one card and in this order -- the sentence
   * is what the row is an answer to, so a person reads the state and then the
   * thing to do about it.
   */
  it("says a month is unplanned and still offers the way to plan it", () => {
    render(theWayIn(true));

    const rows = within(group()).getAllByRole("listitem");

    expect(rows[0]).toHaveTextContent("Todavía no planeaste este mes.");
    expect(rows[1]).toHaveTextContent("Agregar al plan");
  });

  // A month with items on it has nothing to say about emptiness: the two lists
  // below are the plan, and a sentence saying there is none over a plan that
  // exists is the card contradicting the screen it sits on.
  it("says nothing about emptiness on a month that has a plan", () => {
    render(theWayIn());

    expect(screen.queryByText("Todavía no planeaste este mes.")).toBeNull();
    expect(within(group()).getAllByRole("listitem")).toHaveLength(1);
  });

  /*
   * One way in, of either kind (#80), and the thing #81 must not undo while
   * moving it. Counted on the unplanned month too, which is the state that has
   * a second row in the card: that row is a sentence and not somewhere to go.
   */
  it("is one link and never two", () => {
    render(theWayIn(true));

    expect(within(group()).getAllByRole("link")).toHaveLength(1);
  });

  /*
   * The heading is off the screen, because the screen's own title already says
   * Presupuesto and printing the word again over one row is a heading saying
   * nothing. Off the screen and not absent: a group nobody can name is a group
   * nobody can skip to.
   */
  it("is a group a screen reader can name even with its heading off-screen", () => {
    render(theWayIn());

    expect(group()).toBeInTheDocument();
  });
});
