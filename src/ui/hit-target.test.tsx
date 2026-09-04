import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { BranchingChipField } from "./branching-chip-field";
import { Button } from "./button";
import { GroupedList, GroupedListItem } from "./grouped-list";
import { BottomSheet } from "./bottom-sheet";
import { TabBar } from "./tab-bar";
import { SelectField, TextField } from "./field";
import { hitTarget } from "./hit-target";

/**
 * These guard one thing only: that nobody adds an interactive component and
 * forgets the class. That the class is worth wearing is proved by
 * hit-target.source.test.ts, and the resulting geometry by
 * e2e/hit-targets.spec.ts on the gallery at /ui.
 */
describe("hit targets", () => {
  it("a primary button carries the hit target", () => {
    render(<Button>Guardar</Button>);
    expect(screen.getByRole("button")).toHaveClass(hitTarget);
  });

  it("a destructive button carries the hit target", () => {
    render(<Button variant="destructive">Cerrar septiembre</Button>);
    expect(screen.getByRole("button")).toHaveClass(hitTarget);
  });

  it("a plain button carries the hit target", () => {
    render(<Button variant="plain">Todavía no</Button>);
    expect(screen.getByRole("button")).toHaveClass(hitTarget);
  });

  it("an actionable grouped list item carries the hit target", () => {
    render(
      <GroupedList label="Movimientos">
        <GroupedListItem onClick={() => {}}>Éxito</GroupedListItem>
      </GroupedList>,
    );
    expect(screen.getByRole("button", { name: "Éxito" })).toHaveClass(hitTarget);
  });

  it("a grouped list item that goes somewhere carries the hit target", () => {
    render(
      <GroupedList label="Espacios">
        <GroupedListItem href="/espacios/casa">Casa</GroupedListItem>
      </GroupedList>,
    );
    expect(screen.getByRole("link", { name: "Casa" })).toHaveClass(hitTarget);
  });

  it("every tab in the tab bar carries the hit target", () => {
    render(
      <TabBar
        activeId="budget"
        tabs={[
          { id: "budget", href: "/", label: "Presupuesto" },
          { id: "movements", href: "/movimientos", label: "Movimientos" },
        ]}
      />,
    );
    for (const tab of screen.getAllByRole("link")) {
      expect(tab).toHaveClass(hitTarget);
    }
  });

  it("the way back out of a chosen heading carries the hit target", async () => {
    render(
      <BranchingChipField
        name="categoryId"
        legend="Categoría"
        more="¿Algo más preciso?"
        change="Cambiar"
        branches={[
          {
            value: "food",
            label: "Comida",
            children: [{ value: "food.groceries", label: "Supermercado" }],
          },
        ]}
      />,
    );
    // It is only on the screen once a heading with something under it is
    // chosen, which is the whole of what it undoes.
    await userEvent.click(screen.getByRole("radio", { name: "Comida" }));
    expect(screen.getByRole("button", { name: "Cambiar" })).toHaveClass(
      hitTarget,
    );
  });

  it("the bottom sheet close control carries the hit target", () => {
    render(
      <BottomSheet open title="Cerrar septiembre" onClose={() => {}}>
        <p>Esto no tiene vuelta atrás.</p>
      </BottomSheet>,
    );
    expect(screen.getByRole("button", { name: "Descartar" })).toHaveClass(
      hitTarget,
    );
  });
});

describe("hit targets on form controls", () => {
  it("a text field carries the hit target", () => {
    render(<TextField name="name" label="Nombre" />);
    expect(screen.getByRole("textbox", { name: "Nombre" })).toHaveClass(
      hitTarget,
    );
  });

  it("a picker carries the hit target", () => {
    render(
      <SelectField
        name="currency"
        label="Moneda"
        choices={[{ value: "ARS", label: "Peso argentino (ARS)" }]}
      />,
    );
    expect(screen.getByRole("combobox", { name: "Moneda" })).toHaveClass(
      hitTarget,
    );
  });
})
