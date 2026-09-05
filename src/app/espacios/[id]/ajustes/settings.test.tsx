import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Settings } from "./settings";

const casa = "3f2b0c1e-0000-4000-8000-0000000000ca";

describe("the Ajustes screen", () => {
  it("holds the way to the Categories catalogue", () => {
    // The catalogue lost its tab because a person writes it once and then
    // rarely. Losing the tab must not mean losing the way in.
    render(<Settings spaceId={casa} />);

    expect(screen.getByRole("link", { name: "Categorías" })).toHaveAttribute(
      "href",
      `/espacios/${casa}/categorias`,
    );
  });

  it("offers one way in and not a screen of nothing", () => {
    render(<Settings spaceId={casa} />);

    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("carries how the app is lit, under what the Space holds", () => {
    // The tab bar's Ajustes is the only settings screen there is, so this is
    // where the theme goes (#41). It sits below the Space's own things and not
    // above them: the screen is one Space's, and this choice is the device's.
    render(<Settings spaceId={casa} />);

    const groups = screen.getAllByRole("group");
    expect(groups.map((group) => group.textContent)).toEqual([
      expect.stringContaining("Categorías"),
      expect.stringContaining("Apariencia"),
    ]);
  });
});
