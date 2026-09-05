import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Icon } from "@/ui/icon";
import { Variables } from "./variables";
import type { ReadableComparison } from "./budget";

const comparison = (
  changes: Partial<ReadableComparison> = {},
): ReadableComparison => ({
  categoryId: "cat-super",
  category: "Comida · Súper",
  spent: "$210.000",
  expected: "400.000",
  over: null,
  filled: 0.525,
  ...changes,
});

describe("the Variables section", () => {
  it("writes what a Category cost against what it expected, as one figure", () => {
    render(<Variables comparisons={[comparison()]} />);

    // One figure and not two columns: a person reads "two hundred and ten of
    // four hundred", which is a sentence rather than a pair of totals they
    // have to line up by eye.
    expect(screen.getByText(/\$210\.000/)).toHaveTextContent(
      "$210.000 / 400.000",
    );
  });

  it("draws a meter of what has been spent of the plan", () => {
    const { container } = render(<Variables comparisons={[comparison()]} />);

    expect(
      container.querySelector<HTMLElement>("[data-meter-fill]")?.style.width,
    ).toBe("52.5%");
  });

  describe("passing what the Category expected", () => {
    const over = comparison({
      spent: "$1.700.000",
      expected: "1.600.000",
      over: "$100.000",
      filled: 1.0625,
    });

    // The whole point of the ticket: colour is not the only thing carrying
    // the message. Somebody who cannot see the red is told in words.
    it("says how far past in words", () => {
      render(<Variables comparisons={[over]} />);

      expect(screen.getByText("Te pasaste $100.000")).toBeInTheDocument();
    });

    it("draws the alert triangle beside those words", () => {
      const { container } = render(<Variables comparisons={[over]} />);
      const drawn = container.querySelector("svg");

      // Compared against what `Icon` draws rather than against a pasted
      // path: which shapes make an `alert-triangle` is `icon.tsx`'s to say
      // and `icon.test.tsx` is where it says it, so a redrawn triangle that
      // is still perfectly correct must not break this screen's test.
      const triangle = render(
        <Icon name="alert-triangle" size={13} weight={2.2} />,
      );

      expect(drawn?.outerHTML).toBe(
        triangle.container.querySelector("svg")?.outerHTML,
      );
    });

    it("thickens the triangle so it does not fade beside the words", () => {
      // At 13px the common weight of 2 leaves the triangle lighter than the
      // line of text it warns about, which is the one thing it must not be.
      const { container } = render(<Variables comparisons={[over]} />);

      expect(container.querySelector("svg")?.getAttribute("stroke-width")).toBe(
        "2.2",
      );
    });

    it("says nothing of the sort while the Category is inside its plan", () => {
      render(<Variables comparisons={[comparison()]} />);

      expect(screen.queryByText(/Te pasaste/)).not.toBeInTheDocument();
      expect(document.querySelector("svg")).toBeNull();
    });
  });

  it("draws nothing at all for a month with no plan", () => {
    const { container } = render(<Variables comparisons={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});
