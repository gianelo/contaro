import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { memberColour } from "@/ui/member-colour";
import { Greeting } from "./greeting";

describe("what the Space list opens with", () => {
  /*
   * The heading is the person and not the screen. "Espacios" named the screen
   * to somebody who had just arrived on it and could see that for themselves;
   * their own name is the one thing on it they cannot.
   */
  it("greets the Member by name, as the screen's heading", () => {
    render(<Greeting name="Gian" />);

    expect(
      screen.getByRole("heading", { name: "Hola, Gian", level: 1 }),
    ).toBeInTheDocument();
  });

  it("says what the screen is for, under the greeting", () => {
    render(<Greeting name="Gian" />);

    expect(
      screen.getByText("Elegí un espacio para entrar"),
    ).toBeInTheDocument();
  });

  /*
   * The rule ADR-0020 protects, on the one screen that can break it: the same
   * Reader is drawn here and again inside every Space they share, and which of
   * two seats they hold in a Space depends on how the ids sort. A seat colour
   * here would show one person in two colours on one screen.
   */
  it("wears neither Member seat, so nobody is drawn in two colours at once", () => {
    render(<Greeting name="Gian Solo" />);

    const seats = [
      memberColour("member-1", ["member-1", "member-2"]),
      memberColour("member-2", ["member-1", "member-2"]),
    ];

    for (const seat of seats) {
      expect(screen.getByRole("img")).not.toHaveClass(seat);
    }
  });

  it("draws the Member it is greeting", () => {
    render(<Greeting name="Gian Solo" />);

    expect(screen.getByRole("img", { name: "Gian Solo" })).toHaveTextContent(
      "G",
    );
  });

  /*
   * Auth.js allows a session to carry no name at all. The screen falls back to
   * naming itself rather than greeting nobody: "Hola, " over an empty circle
   * is the screen claiming to know who arrived and then not saying it.
   */
  describe("a session that names nobody", () => {
    it("names the screen instead of greeting an empty name", () => {
      render(<Greeting name={null} />);

      expect(
        screen.getByRole("heading", { name: "Espacios", level: 1 }),
      ).toBeInTheDocument();
      expect(screen.queryByText(/Hola,/)).not.toBeInTheDocument();
    });

    it("draws nobody, having nobody to draw", () => {
      render(<Greeting name={null} />);

      expect(screen.queryByRole("img")).not.toBeInTheDocument();
    });

    // Still says what the screen is for: that half never depended on a name.
    it("still says what the screen is for", () => {
      render(<Greeting name={null} />);

      expect(
        screen.getByText("Elegí un espacio para entrar"),
      ).toBeInTheDocument();
    });
  });

  // The greeting takes the whole name and the circle takes its first letter:
  // "Hola, Gian Solo" is not how anybody is greeted out loud.
  it("greets them by the name they go by, not by the whole of it", () => {
    render(<Greeting name="Gian Solo Barboza" />);

    expect(
      screen.getByRole("heading", { name: "Hola, Gian", level: 1 }),
    ).toBeInTheDocument();
  });
});
