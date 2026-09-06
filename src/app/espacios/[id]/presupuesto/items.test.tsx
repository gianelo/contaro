import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PlannedItems } from "./items";
import type { ReadableVariableItem } from "./budget";
import { month } from "@/domain/calendar/month";

/*
 * The Variable arm of the union and not the union itself: `Partial` of a
 * discriminated union lets a fixture be half of either kind, and these are the
 * rows of the plan, which are Variable items every one.
 */
const item = (
  changes: Partial<ReadableVariableItem> = {},
): ReadableVariableItem => ({
  kind: "variable",
  id: "item-1",
  month: month("2026-09"),
  name: "Súper de la semana 1",
  category: "Supermercado",
  heading: "Comida",
  amount: "$60.000",
  minorUnits: 60_000_00,
  categoryId: "cat-super",
  ...changes,
});

const plan = (
  items: readonly ReadableVariableItem[],
  nothingPlanned = items.length === 0,
) => (
  <PlannedItems
    spaceId="space-casa"
    items={items}
    nothingPlanned={nothingPlanned}
  />
);

describe("the rows of a month's plan", () => {
  /*
   * The whole of #79 in one assertion. Four weeks of groceries are four items
   * on one Category, and until they were called something they were four rows
   * a person could read down but not correct: nothing on the screen said which
   * of them was the week they meant.
   */
  it("tells two items on one Category apart by their names", () => {
    render(
      plan([
        item(),
        item({ id: "item-2", name: "Súper de la semana 2", amount: "$55.000" }),
      ]),
    );

    expect(
      screen.getByRole("link", { name: /Súper de la semana 1/ }),
    ).toHaveAttribute("href", "/espacios/space-casa/presupuesto/item-1");
    expect(
      screen.getByRole("link", { name: /Súper de la semana 2/ }),
    ).toHaveAttribute("href", "/espacios/space-casa/presupuesto/item-2");
  });

  // The name on the first line and what it is filed under on the quiet one
  // beneath, which is the shape the Fijos row above it already had.
  it("puts the Category and its heading on the line under the name", () => {
    render(plan([item()]));

    const row = screen.getByRole("link", { name: /Súper de la semana 1/ });

    expect(within(row).getByText("Súper de la semana 1")).toBeInTheDocument();
    expect(within(row).getByText("Supermercado · Comida")).toBeInTheDocument();
  });

  // A Category that is itself a heading has nothing to say after itself, and a
  // separator with nothing behind it is punctuation about nothing.
  it("writes the Category alone where it sits under no heading", () => {
    render(plan([item({ category: "Comida", heading: null })]));

    expect(screen.getByText("Comida")).toBeInTheDocument();
    expect(screen.queryByText(/·/)).not.toBeInTheDocument();
  });

  it("writes what each item expects to cost", () => {
    render(plan([item()]));

    expect(screen.getByText("$60.000")).toBeInTheDocument();
  });

  /*
   * A month nobody has planned says what to do rather than that there is
   * nothing: there is no Budget to create first, and the first item is the
   * whole of it.
   */
  it("says a month nobody has planned is unplanned", () => {
    render(plan([]));

    expect(
      screen.getByText("Todavía no planeaste este mes."),
    ).toBeInTheDocument();
  });

  /*
   * And a Budget is its items of either kind (CONTEXT.md): a month with the
   * rent on it and no Variable item at all has been planned, so the list draws
   * no rows and still does not claim the month is empty.
   */
  it("claims nothing about a month planned with Fixed items alone", () => {
    render(plan([], false));

    expect(
      screen.queryByText("Todavía no planeaste este mes."),
    ).not.toBeInTheDocument();
  });
});
