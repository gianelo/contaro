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

  it("offers what a chosen heading holds, under a legend of its own", async () => {
    render(field());

    await userEvent.click(screen.getByRole("radio", { name: "Comida" }));

    const under = screen.getByRole("group", { name: "¿Algo más preciso?" });
    expect(under).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: "Supermercado, Comida" }),
    ).toBeInTheDocument();
    // Offered and not demanded: nothing in the second group is required, and
    // the heading above it is already a complete answer.
    for (const chip of screen.getAllByRole("radio")) {
      if (under.contains(chip)) expect(chip).not.toBeRequired();
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
