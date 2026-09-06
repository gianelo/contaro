import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BranchingChipField, type ChipBranch } from "./branching-chip-field";

const branches: readonly ChipBranch[] = [
  {
    value: "food",
    label: "Comida",
    children: [
      { value: "food.groceries", label: "Supermercado", qualifier: "Comida" },
      { value: "food.dining", label: "Restaurantes", qualifier: "Comida" },
    ],
  },
  { value: "pets", label: "Mascotas", children: [] },
];

function field(defaultValue?: string) {
  return (
    <BranchingChipField
      name="categoryId"
      legend="Categoría"
      more="¿Algo más preciso?"
      change="Cambiar"
      branches={branches}
      defaultValue={defaultValue}
      empty="Elegí una categoría"
      required
    />
  );
}

describe("BranchingChipField", () => {
  it("offers the headings, and nothing under them, to begin with", () => {
    render(field());

    expect(screen.getAllByRole("radio")).toHaveLength(2);
    expect(screen.getByRole("radio", { name: "Comida" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Mascotas" })).toBeInTheDocument();
  });

  it("answers the question with one tap on a heading", async () => {
    render(field());

    await userEvent.click(screen.getByRole("radio", { name: "Comida" }));

    expect(screen.getByRole("radio", { name: "Comida" })).toBeChecked();
  });

  it("offers what a chosen heading holds, on the row the heading was on", async () => {
    render(field());

    await userEvent.click(screen.getByRole("radio", { name: "Comida" }));

    // One group and not two: the row does not gain a second question under
    // it, it changes the one it asks. Two stacked groups are 146px on a
    // screen with about 67 for the picker (#60).
    const groups = screen.getAllByRole("group");
    expect(groups).toHaveLength(1);
    expect(groups[0]).toHaveAccessibleName("¿Algo más preciso?");

    // The heading leads, because it is the answer already given, and what it
    // holds follows it as the offer.
    expect(
      screen.getAllByRole("radio").map((chip) => chip.getAttribute("value")),
    ).toEqual(["food", "food.groceries", "food.dining"]);
  });

  it("offers a subcategory without demanding one", async () => {
    render(field());

    await userEvent.click(screen.getByRole("radio", { name: "Comida" }));

    // The whole of the offer is that nothing further has to be touched. The
    // one `required` sits on the group rather than on a subcategory, and the
    // heading is a member of that group, so the heading alone answers it —
    // which is what a browser asks of a radio group either way.
    expect(screen.getByRole("radio", { name: "Comida" })).toBeChecked();
    for (const child of ["Supermercado, Comida", "Restaurantes, Comida"]) {
      expect(screen.getByRole("radio", { name: child })).not.toBeChecked();
    }
  });

  it("moves the choice down to a subcategory when one is chosen", async () => {
    render(field());

    await userEvent.click(screen.getByRole("radio", { name: "Comida" }));
    await userEvent.click(
      screen.getByRole("radio", { name: "Supermercado, Comida" }),
    );

    expect(
      screen.getByRole("radio", { name: "Supermercado, Comida" }),
    ).toBeChecked();
    expect(screen.getByRole("radio", { name: "Comida" })).not.toBeChecked();
  });

  it("moves the choice back up when the heading is chosen again", async () => {
    render(field());

    await userEvent.click(screen.getByRole("radio", { name: "Comida" }));
    await userEvent.click(
      screen.getByRole("radio", { name: "Supermercado, Comida" }),
    );
    await userEvent.click(screen.getByRole("radio", { name: "Comida" }));

    expect(screen.getByRole("radio", { name: "Comida" })).toBeChecked();
    expect(
      screen.getByRole("radio", { name: "Supermercado, Comida" }),
    ).not.toBeChecked();
  });

  it("asks nothing further of a heading that holds nothing", async () => {
    render(field());

    await userEvent.click(screen.getByRole("radio", { name: "Mascotas" }));

    expect(screen.getByRole("radio", { name: "Mascotas" })).toBeChecked();
    expect(
      screen.queryByRole("group", { name: "¿Algo más preciso?" }),
    ).not.toBeInTheDocument();
    // The other headings stay where they were: there is nothing to step into,
    // so there is nothing to take them off the screen.
    expect(screen.getByRole("radio", { name: "Comida" })).toBeInTheDocument();
  });

  it("returns to the whole list in one tap", async () => {
    render(field());

    await userEvent.click(screen.getByRole("radio", { name: "Comida" }));
    await userEvent.click(screen.getByRole("button", { name: "Cambiar" }));

    expect(screen.getAllByRole("radio")).toHaveLength(2);
    expect(screen.getByRole("radio", { name: "Mascotas" })).toBeInTheDocument();
    // And the question goes back to being the wide one, which is the row's
    // only way of saying which of the two things it is offering.
    expect(
      screen.getByRole("group", { name: "Categoría" }),
    ).toBeInTheDocument();
    // The way back is a change of answer, so it leaves none behind.
    expect(screen.getByRole("radio", { name: "Comida" })).not.toBeChecked();
  });

  it("opens on the branch a saved subcategory sits in", () => {
    render(field("food.groceries"));

    expect(
      screen.getByRole("radio", { name: "Supermercado, Comida" }),
    ).toBeChecked();
    expect(
      screen.getByRole("group", { name: "¿Algo más preciso?" }),
    ).toBeInTheDocument();
    // The heading it sits under is on the row with it, which is what makes
    // the answer readable without tapping anything.
    expect(screen.getByRole("radio", { name: "Comida" })).toBeInTheDocument();
  });

  it("opens on the branch a saved heading is", () => {
    render(field("food"));

    expect(screen.getByRole("radio", { name: "Comida" })).toBeChecked();
    expect(
      screen.getByRole("group", { name: "¿Algo más preciso?" }),
    ).toBeInTheDocument();
  });

  it("holds nothing chosen when nothing was saved", () => {
    render(field(""));

    for (const chip of screen.getAllByRole("radio")) {
      expect(chip).not.toBeChecked();
    }
  });

  it("says why there is nothing to pick, rather than showing an empty row", () => {
    render(
      <BranchingChipField
        name="categoryId"
        legend="Categoría"
        more="¿Algo más preciso?"
        change="Cambiar"
        branches={[]}
        empty="Elegí una categoría"
      />,
    );

    expect(screen.getByText("Elegí una categoría")).toBeInTheDocument();
  });

  it("carries the choice back under one name, whichever step made it", async () => {
    // Both steps write the same field: the answer is one Category, not a
    // heading and a subcategory that something downstream has to reconcile.
    render(field());

    await userEvent.click(screen.getByRole("radio", { name: "Comida" }));
    await userEvent.click(
      screen.getByRole("radio", { name: "Supermercado, Comida" }),
    );

    for (const chip of screen.getAllByRole("radio")) {
      expect(chip).toHaveAttribute("name", "categoryId");
    }
    expect(
      screen.getByRole("radio", { name: "Supermercado, Comida" }),
    ).toHaveAttribute("value", "food.groceries");
  });
});
