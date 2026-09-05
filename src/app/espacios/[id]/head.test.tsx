import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Space } from "@/domain/space/space";
import { SpaceHead } from "./head";

const CASA: Space = { id: "space-casa", name: "Casa", currency: "ARS" };

describe("the head of a screen inside a Space", () => {
  /*
   * The old shape, kept for every screen that has nothing else to call itself:
   * the Space is the heading and its currency is the line under it.
   */
  it("names the Space where the screen does not name itself", () => {
    render(<SpaceHead space={CASA} />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Casa");
    expect(screen.getByText("Peso argentino (ARS)")).toBeInTheDocument();
  });

  /*
   * The head of the Budget screen (#40): the screen says what it is, and which
   * Space you are in becomes the quiet line under it. Both halves asserted,
   * because ADR-0010 is the reason the Space cannot simply be dropped -- a
   * screen that forgets to say which Space it is showing is the one bug the
   * shell exists to make impossible.
   */
  it("lets a screen name itself, and drops the Space to the line under it", () => {
    render(<SpaceHead space={CASA} title="Presupuesto" />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Presupuesto",
    );
    expect(
      screen.getByText("Casa · Peso argentino (ARS)"),
    ).toBeInTheDocument();
  });

  // The month pill shares the title's row on the canvas, so it is a slot on
  // the row and not something the screen draws under the head for itself.
  it("puts what shares the title's row beside the title", () => {
    render(
      <SpaceHead
        space={CASA}
        title="Presupuesto"
        beside={<button type="button">Septiembre</button>}
      />,
    );

    expect(screen.getByRole("heading", { level: 1 }).parentElement).toContainElement(
      screen.getByRole("button", { name: "Septiembre" }),
    );
  });
});
