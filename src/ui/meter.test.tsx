import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Meter } from "./meter";

const fill = (container: HTMLElement) => {
  const drawn = container.querySelector("[data-meter-fill]");
  if (!drawn) throw new Error("The meter drew no fill at all.");
  return drawn as HTMLElement;
};

describe("Meter", () => {
  it("draws the fill at the fraction of the length it was given", () => {
    const { container } = render(<Meter filled={0.52} />);

    expect(fill(container).style.width).toBe("52%");
  });

  // A month that spent double what it planned is a full bar and a sentence
  // saying how far past, not a bar hanging out of the row it lives in.
  it("never draws past the length it is measuring", () => {
    const { container } = render(<Meter filled={1.7} over />);

    expect(fill(container).style.width).toBe("100%");
  });

  it("never draws a length nobody can have used", () => {
    const { container } = render(<Meter filled={Number.NaN} />);

    expect(fill(container).style.width).toBe("0%");
  });

  it("turns when the length it measures has been passed", () => {
    const under = render(<Meter filled={0.52} />);
    const past = render(<Meter filled={1} over />);

    expect(fill(past.container).parentElement?.className).toMatch(/over/);
    expect(fill(under.container).parentElement?.className).not.toMatch(/over/);
  });

  describe("what a screen reader hears", () => {
    // Nothing: the meter is always drawn beside the figure it draws, and the
    // words "Te pasaste $100.000" are what carry being over. Announcing the
    // bar too would read one fact twice.
    it("says nothing, because the figure beside it already says it", () => {
      const { container } = render(<Meter filled={0.52} />);

      expect(container.firstElementChild?.getAttribute("aria-hidden")).toBe(
        "true",
      );
    });
  });

  describe("thickness", () => {
    it("comes out at the height the canvas draws it", () => {
      const { container } = render(<Meter filled={0.87} height={10} />);

      expect(fill(container).parentElement?.style.height).toBe("10px");
    });

    it("is 7 in a row, which is where most of them are", () => {
      const { container } = render(<Meter filled={0.52} />);

      expect(fill(container).parentElement?.style.height).toBe("7px");
    });
  });
});
