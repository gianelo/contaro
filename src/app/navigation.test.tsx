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

  it("offers Ajustes, and no longer the catalogue it now holds", () => {
    // The tabs are the four places a thumb goes every day. A person edits
    // their Categories once and then rarely, so the catalogue moved inside
    // Ajustes and stopped spending a quarter of the bar.
    render(<SpaceNavigation spaceId={casa} activeId="budget" />);

    expect(screen.getByRole("link", { name: "Ajustes" })).toHaveAttribute(
      "href",
      `/espacios/${casa}/ajustes`,
    );
    expect(screen.queryByRole("link", { name: "Categorías" })).toBeNull();
  });

  it("carries the way to record a Movement inside the Space too", () => {
    render(<SpaceNavigation spaceId={casa} activeId="budget" />);

    expect(
      screen.getByRole("link", { name: "Anotar un movimiento" }),
    ).toHaveAttribute("href", `/espacios/${casa}/movimientos/nuevo`);
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
