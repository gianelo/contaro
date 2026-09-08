import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ButtonLink } from "./button";
import { Refusal } from "./refusal";

describe("what a screen has instead of a form", () => {
  it("says what happened and why there is nothing to fill in", () => {
    render(
      <Refusal
        title="Este mes está cerrado"
        body="Lo que quedó anotado no se puede corregir."
      />,
    );

    expect(screen.getByText("Este mes está cerrado")).toBeInTheDocument();
    expect(
      screen.getByText("Lo que quedó anotado no se puede corregir."),
    ).toBeInTheDocument();
  });

  /*
   * A refusal that can be undone names the thing that undoes it, and one that
   * cannot says nothing at all rather than pointing somewhere (ADR-0034,
   * ADR-0002). The card holds the difference; it does not decide it.
   */
  it("carries the way out where the refusal has one", () => {
    render(
      <Refusal title="Ya está pagado" body="Anulá el movimiento que lo pagó.">
        <ButtonLink href="/espacios/s-1/movimientos/mv-1" variant="plain">
          Ver el movimiento
        </ButtonLink>
      </Refusal>,
    );

    expect(
      screen.getByRole("link", { name: "Ver el movimiento" }),
    ).toBeInTheDocument();
  });

  it("shows nothing to reach for where it has none", () => {
    render(<Refusal title="Este mes está cerrado" body="Nunca." />);

    expect(screen.queryByRole("link")).toBeNull();
  });
});
