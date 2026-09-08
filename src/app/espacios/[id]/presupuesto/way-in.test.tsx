import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { WayIntoThePlan } from "./way-in";
import type { ReadableCopyOffer } from "./budget";

// The action is a "use server" module, which a jsdom run cannot import. What
// this file is about is the card and its confirmation; that the copy writes a
// plan is proved where the store is, against a real database.
vi.mock("./actions", () => ({
  copyPlanAction: async () => ({ error: null }),
}));

const AUGUST: ReadableCopyOffer = {
  month: "2026-08" as ReadableCopyOffer["month"],
  name: "agosto",
  intoName: "septiembre",
  fixed: { count: 4, total: "$2.053.900" },
  variables: { count: 4, total: "$2.550.000" },
};

/** The way in as a month's screen mounts it, on a month with a plan or without. */
const theWayIn = (
  nothingPlanned = false,
  copy: ReadableCopyOffer | null = null,
) => (
  <WayIntoThePlan
    spaceId="space-casa"
    month="2026-09"
    nothingPlanned={nothingPlanned}
    copy={copy}
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
    render(theWayIn(true, AUGUST));

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

describe("the offer to carry last month's plan forward", () => {
  /*
   * Decision 21 of #109: the offer is a row in the card that already exists,
   * and never a sheet that opens by itself. `WayIntoThePlan` already renders a
   * sentence and the answer to it; a second answer arriving unasked is what
   * ADR-0045 exists to prevent. One card, one sentence, two ordered answers --
   * the plan a person almost certainly wants, then writing one from nothing.
   */
  it("rides in the card that already exists, above the way in", () => {
    render(theWayIn(true, AUGUST));

    const rows = within(group()).getAllByRole("listitem");

    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent("Todavía no planeaste este mes.");
    expect(rows[1]).toHaveTextContent("Copiar el plan de agosto");
    expect(rows[2]).toHaveTextContent("Agregar al plan");
  });

  /*
   * Decision 22 of #109, and the thing that makes an unbounded lookback safe.
   * The last plan there is can be from March; "el plan del mes pasado" said
   * about March in October is an offer accepted for a month nobody meant.
   */
  it("names the month it would copy and never calls it last month", () => {
    render(theWayIn(true, AUGUST));

    expect(screen.getByText("Copiar el plan de agosto")).toBeInTheDocument();
    expect(screen.queryByText(/mes pasado/)).toBeNull();
  });

  // Case 2 of #121: the Space's first month. There is no plan behind it, so
  // the card falls back to the sentence and the way in, which is what it does
  // on every month today.
  it("is not drawn at all where there is no plan to carry", () => {
    render(theWayIn(true, null));

    expect(screen.queryByText(/Copiar el plan/)).toBeNull();
    expect(within(group()).getAllByRole("listitem")).toHaveLength(2);
  });

  // A month that already has a plan is not offered another one, whatever the
  // months behind it hold.
  it("is not drawn on a month that already has a plan", () => {
    render(theWayIn(false, AUGUST));

    expect(screen.queryByText(/Copiar el plan/)).toBeNull();
  });

  /*
   * The shape "Marcar pagado" already uses: a row opens a sheet, the sheet
   * says what is about to happen, and the person confirms. Nothing is written
   * from the row itself -- a whole month's plan arriving on one tap is the one
   * thing a confirmation is for.
   */
  it("confirms first, saying what is about to be copied", async () => {
    render(theWayIn(true, AUGUST));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Copiar el plan de agosto/ }));

    const sheet = screen.getByRole("dialog");
    expect(sheet).toHaveAccessibleName("¿Copiar el plan de agosto?");
    expect(sheet).toHaveTextContent(
      "Los gastos fijos vuelven a quedar pendientes y sus fechas se corren a septiembre.",
    );
    expect(sheet).toHaveTextContent("4 gastos previstos · $2.053.900");
    expect(sheet).toHaveTextContent("4 gastos previstos · $2.550.000");
    expect(sheet).toHaveTextContent("Vas a poder editarlo todo el mes.");
  });

  // The button names the month it lands on, because that is what tapping it
  // does. The title above named the month it comes from, which is the fact a
  // person is checking before they say yes.
  it("names the month it lands on where the tap happens", async () => {
    render(theWayIn(true, AUGUST));

    await userEvent.click(screen.getByRole("button", { name: /Copiar el plan de agosto/ }));

    expect(
      screen.getByRole("button", { name: "Copiar a septiembre" }),
    ).toBeInTheDocument();
  });

  // The escape is "Empezar de cero" and not "Cancelar" (the artboard). It
  // closes the sheet and leaves the row underneath, which is that plan.
  it("offers starting from nothing as the way out", async () => {
    render(theWayIn(true, AUGUST));

    await userEvent.click(screen.getByRole("button", { name: /Copiar el plan de agosto/ }));
    await userEvent.click(screen.getByRole("button", { name: "Empezar de cero" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Agregar al plan/ })).toBeInTheDocument();
  });

  // Both months travel with the form. The month being planned says where to
  // land, and the month being copied is the one the row *named* -- so what is
  // copied is what was tapped, even if a nearer month was planned in between.
  it("sends back both the month it lands on and the month it names", async () => {
    render(theWayIn(true, AUGUST));

    await userEvent.click(screen.getByRole("button", { name: /Copiar el plan de agosto/ }));

    const sheet = screen.getByRole("dialog");
    expect(sheet.querySelector('input[name="mes"]')).toHaveValue("2026-09");
    expect(sheet.querySelector('input[name="desde"]')).toHaveValue("2026-08");
    expect(sheet.querySelector('input[name="spaceId"]')).toHaveValue("space-casa");
  });

  /*
   * A month planned with Fixed items alone says so, rather than printing
   * "Variables · 0 gastos previstos · $0". The recap is what is about to
   * happen, and a line about nothing is a line about something that is not.
   */
  it("counts only the kinds the month it copies actually has", async () => {
    render(
      theWayIn(true, { ...AUGUST, variables: null }),
    );

    await userEvent.click(screen.getByRole("button", { name: /Copiar el plan de agosto/ }));

    expect(screen.getByRole("dialog")).toHaveTextContent("Fijos");
    expect(screen.getByRole("dialog")).not.toHaveTextContent("Variables");
  });

  // One row and one item read as one thing, not as "1 gastos previstos".
  it("writes a single item in the singular", async () => {
    render(
      theWayIn(true, {
        ...AUGUST,
        fixed: { count: 1, total: "$1.800.000" },
        variables: null,
      }),
    );

    await userEvent.click(screen.getByRole("button", { name: /Copiar el plan de agosto/ }));

    expect(screen.getByRole("dialog")).toHaveTextContent(
      "1 gasto previsto · $1.800.000",
    );
  });
});
