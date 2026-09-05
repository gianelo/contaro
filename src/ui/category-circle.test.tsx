import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CategoryCircle } from "./category-circle";
import { iconMark, letterMark } from "./category-mark";

describe("the circle at the start of a row", () => {
  it("draws the icon a Category was marked with", () => {
    const { container } = render(
      <CategoryCircle mark={iconMark("cart", "green")} />,
    );

    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("draws the letter a Category with no icon was marked with", () => {
    render(<CategoryCircle mark={letterMark("Ahorro")} />);

    expect(screen.getByText("A")).toBeInTheDocument();
  });

  // The two tints are how a row is told from the one above it at a glance.
  // Were they one class, the circles would all come out the same colour and
  // the tint would have quietly stopped existing.
  it("wears the tint its mark was given", () => {
    const { container: green } = render(
      <CategoryCircle mark={iconMark("arrow-up", "green")} />,
    );
    const { container: grey } = render(
      <CategoryCircle mark={iconMark("car", "grey")} />,
    );

    expect(green.firstElementChild?.className).not.toBe(
      grey.firstElementChild?.className,
    );
  });

  /*
   * Silent to a screen reader, both kinds of it. The Category's name is the
   * next thing on the row, so a labelled icon reads the row out twice and a
   * labelled letter reads out the first letter of a word that follows it
   * whole. The circle is what a thumb scans, not what a listener hears.
   */
  it("says nothing that the name beside it does not already say", () => {
    render(
      <>
        <CategoryCircle mark={iconMark("cart", "green")} />
        <CategoryCircle mark={letterMark("Ahorro")} />
      </>,
    );

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
