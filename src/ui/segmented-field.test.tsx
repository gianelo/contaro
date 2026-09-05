import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SegmentedField } from "./segmented-field";

const halves = [
  { value: "expense", label: "Gasto" },
  { value: "income", label: "Ingreso" },
];

describe("a choice with two answers", () => {
  it("is one radio group, so a keyboard walks it and the form submits it", () => {
    // Buttons would be a row of independent things. Radios are one choice: the
    // arrow keys move within it, a screen reader says "1 of 2", and `name`
    // reaches the server without anything wiring it there.
    render(
      <SegmentedField
        name="direction"
        legend="Qué anotás"
        options={halves}
        value="expense"
        onChange={vi.fn()}
      />,
    );

    const group = screen.getByRole("radiogroup", { name: "Qué anotás" });

    expect(group).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(2);
    expect(screen.getByRole("radio", { name: "Gasto" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Ingreso" })).not.toBeChecked();
  });

  it("hands back the half that was chosen", async () => {
    const onChange = vi.fn();
    render(
      <SegmentedField
        name="direction"
        legend="Qué anotás"
        options={halves}
        value="expense"
        onChange={onChange}
      />,
    );

    await userEvent.click(screen.getByRole("radio", { name: "Ingreso" }));

    expect(onChange).toHaveBeenCalledWith("income");
  });

  it("names the choice for a screen reader without printing it", () => {
    // The canvas draws two halves and no heading above them: what they are is
    // obvious to somebody looking at the screen and to nobody else.
    render(
      <SegmentedField
        name="direction"
        legend="Qué anotás"
        options={halves}
        value="expense"
        onChange={vi.fn()}
      />,
    );

    expect(screen.queryByText("Qué anotás")).toBeNull();
    expect(
      screen.getByRole("radiogroup", { name: "Qué anotás" }),
    ).toBeInTheDocument();
  });

  it("gives each half a target a thumb can hit", () => {
    // The canvas draws the halves 40px tall inside a track padded by 2px. The
    // thing a thumb lands on is still the whole 44px.
    render(
      <SegmentedField
        name="direction"
        legend="Qué anotás"
        options={halves}
        value="expense"
        onChange={vi.fn()}
      />,
    );

    for (const half of screen.getAllByRole("radio")) {
      expect(half.closest("label")?.className).toMatch(/hitTarget/);
    }
  });
});
