import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Icon } from "@/ui/icon";
import { Variables } from "./variables";
import type { ReadableComparison, ReadablePlannedItem } from "./budget";

const item = (
  changes: Partial<ReadablePlannedItem> = {},
): ReadablePlannedItem => ({
  id: "item-1",
  name: "Súper de la semana 1",
  amount: "$400.000",
  ...changes,
});

const comparison = (
  changes: Partial<ReadableComparison> = {},
): ReadableComparison => ({
  categoryId: "cat-super",
  category: "Comida · Súper",
  spent: "$210.000",
  expected: "400.000",
  over: null,
  filled: 0.525,
  plan: [item()],
  ...changes,
});

/** The section as the screen mounts it: a Space, and its Categories' rows. */
const variables = (comparisons: readonly ReadableComparison[]) => (
  <Variables spaceId="space-casa" comparisons={comparisons} />
);

describe("the Variables section", () => {
  it("writes what a Category cost against what it expected, as one figure", () => {
    render(variables([comparison()]));

    // One figure and not two columns: a person reads "two hundred and ten of
    // four hundred", which is a sentence rather than a pair of totals they
    // have to line up by eye.
    expect(screen.getByText(/\$210\.000/)).toHaveTextContent(
      "$210.000 / 400.000",
    );
  });

  it("draws a meter of what has been spent of the plan", () => {
    const { container } = render(variables([comparison()]));

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
      render(variables([over]));

      expect(screen.getByText("Te pasaste $100.000")).toBeInTheDocument();
    });

    it("draws the alert triangle beside those words", () => {
      const { container } = render(variables([over]));
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
      const { container } = render(variables([over]));

      expect(container.querySelector("svg")?.getAttribute("stroke-width")).toBe(
        "2.2",
      );
    });

    it("says nothing of the sort while the Category is inside its plan", () => {
      const { container } = render(variables([comparison()]));

      expect(screen.queryByText(/Te pasaste/)).not.toBeInTheDocument();
      // Not "no icon anywhere" any more: every row wears the chevron that says
      // it opens (#63), so the claim has to name the shape that must be
      // absent. Compared against what `Icon` draws, for the reason the test
      // above compares that way -- which shapes make a triangle is
      // `icon.tsx`'s to say.
      const triangle = render(
        <Icon name="alert-triangle" size={13} weight={2.2} />,
      );

      expect(
        [...container.querySelectorAll("svg")].map((svg) => svg.outerHTML),
      ).not.toContain(triangle.container.querySelector("svg")?.outerHTML);
    });
  });

  /*
   * What the figure above is made of (#63). The Category's row says the whole
   * of it cost $1.700.000 of $1.600.000; this is the four items that add up to
   * the second of those numbers, and every one of them is a row a thumb can
   * aim at to correct.
   *
   * It replaced a second list of every Variable item on the screen, headed "El
   * plan del mes", which drew the same Categories a second time under a second
   * heading and left a person reading two plans for one month.
   */
  describe("the plan under a Category", () => {
    const weekly = comparison({
      plan: [
        item({ id: "item-1", name: "Semana 1", amount: "$400.000" }),
        item({ id: "item-2", name: "Semana 2", amount: "$400.000" }),
      ],
    });

    it("names each item the Category's figure is made of", () => {
      render(variables([weekly]));

      expect(screen.getByText("Semana 1")).toBeInTheDocument();
      expect(screen.getByText("Semana 2")).toBeInTheDocument();
    });

    it("writes what each of them expects to cost", () => {
      render(variables([weekly]));

      expect(screen.getAllByText("$400.000")).toHaveLength(2);
    });

    /*
     * The rent is in its Category's tray, and that is deliberate rather than
     * an oversight (#63): `expectedByCategory` sums *every* item of the
     * Category, so the figure the tray hangs under already has the rent in it
     * -- and a tray that left it out would not add up to the number above it.
     *
     * A row carries no kind, so this component could not leave a Fixed item
     * out even if it wanted to. The claim is worth a test all the same: it is
     * what says the absence of a `kind` here is the decision and not a field
     * somebody forgot to carry.
     */
    it("counts a Fixed item planned on the Category in as well", () => {
      render(
        variables([
          comparison({
            plan: [
              item({ id: "item-rent", name: "Arriendo", amount: "$1.800.000" }),
              item({ id: "item-1", name: "Semana 1", amount: "$400.000" }),
            ],
          }),
        ]),
      );

      expect(screen.getByText("Arriendo")).toBeInTheDocument();
    });

    // Every row of the tray goes where the row it stands for goes: the item's
    // own correction screen, which is one URL for both kinds (#48).
    it("opens each item on its own screen", () => {
      render(variables([weekly]));

      expect(
        screen.getByRole("link", { name: /Semana 1/ }),
      ).toHaveAttribute("href", "/espacios/space-casa/presupuesto/item-1");
      expect(
        screen.getByRole("link", { name: /Semana 2/ }),
      ).toHaveAttribute("href", "/espacios/space-casa/presupuesto/item-2");
    });

    /*
     * "El plan de esta categoría" and never "El plan del mes": naming it for
     * the month is exactly what made the screen read as two plans, and what
     * hangs here is one Category's share of one.
     */
    it("names the tray for the Category rather than for the month", () => {
      render(variables([weekly]));

      expect(screen.getByText("El plan de esta categoría")).toBeInTheDocument();
      expect(screen.queryByText("El plan del mes")).not.toBeInTheDocument();
    });

    /*
     * A Category planned with one item opens too, and shows that one. It is
     * the row a person is likeliest to think has nothing under it -- the
     * figure and the item are the same amount -- and it is still the way to
     * reach that item and correct it, which is the whole reason the tray is
     * where the plan now lives.
     */
    it("opens a Category planned with a single item as readily as four", () => {
      render(
        variables([
          comparison({
            categoryId: "cat-ocio",
            category: "Ocio",
            plan: [item({ id: "item-ocio", name: "Salidas del mes" })],
          }),
        ]),
      );

      const tray = screen.getByRole("group", { name: "Variables" });

      expect(within(tray).getByText("Salidas del mes")).toBeInTheDocument();
    });

    /*
     * And every one of them starts shut. The screen is read for the two
     * figures on each row first; the items behind them are what somebody
     * reaches for once one of those figures surprises them, and a screen that
     * opened them all would be the long list #63 took away.
     */
    it("leaves every Category closed until somebody opens it", () => {
      render(
        variables([
          weekly,
          comparison({
            categoryId: "cat-ocio",
            category: "Ocio",
            plan: [item({ id: "item-ocio", name: "Salidas del mes" })],
          }),
        ]),
      );

      expect(screen.getByText("Semana 1")).not.toBeVisible();
      expect(screen.getByText("Salidas del mes")).not.toBeVisible();
    });
  });

  it("draws nothing at all for a month with no plan", () => {
    const { container } = render(variables([]));

    expect(container).toBeEmptyDOMElement();
  });
});
