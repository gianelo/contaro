import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SpaceNavigation } from "./navigation";

const casa = "3f2b0c1e-0000-4000-8000-0000000000ca";

/**
 * The Space a person is looking at is the URL and nothing else (#5). These
 * hold that: every destination the tab bar offers stays inside the Space it
 * was given, so no screen can be reached without saying which money it is
 * about.
 */
describe("navigating inside a Space", () => {
  it("keeps the budget and the movements inside the Space it was given", () => {
    render(<SpaceNavigation spaceId={casa} activeId="budget" />);

    expect(screen.getByRole("link", { name: "Presupuesto" })).toHaveAttribute(
      "href",
      `/espacios/${casa}`,
    );
    expect(screen.getByRole("link", { name: "Movimientos" })).toHaveAttribute(
      "href",
      `/espacios/${casa}/movimientos`,
    );
  });

  it("offers the way back out to the list, which belongs to no Space", () => {
    render(<SpaceNavigation spaceId={casa} activeId="budget" />);

    expect(screen.getByRole("link", { name: "Espacios" })).toHaveAttribute(
      "href",
      "/espacios",
    );
  });

  it("marks the tab the person is on", () => {
    render(<SpaceNavigation spaceId={casa} activeId="movements" />);

    expect(screen.getByRole("link", { name: "Movimientos" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      screen.getByRole("link", { name: "Presupuesto" }),
    ).not.toHaveAttribute("aria-current");
  });
});
