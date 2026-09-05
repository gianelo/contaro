import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TabBar, type Tab } from "./tab-bar";
import { Icon } from "./icon";

type Id = "budget" | "movements" | "spaces" | "settings";

const tabs: readonly Tab<Id>[] = [
  { id: "budget", href: "/b", label: "Presupuesto", icon: "calendar-day" },
  { id: "movements", href: "/m", label: "Movimientos", icon: "list" },
  { id: "spaces", href: "/e", label: "Espacios", icon: "users" },
  { id: "settings", href: "/a", label: "Ajustes", icon: "target" },
];

const action = { href: "/m/nuevo", label: "Anotar un movimiento" };

describe("the tab bar", () => {
  it("draws each destination's icon above its label", () => {
    render(<TabBar tabs={tabs} activeId="budget" />);

    for (const tab of tabs) {
      const link = screen.getByRole("link", { name: tab.label });
      const drawn = render(<Icon name={tab.icon} />);

      expect(link.querySelector("svg")?.outerHTML).toBe(
        drawn.container.querySelector("svg")?.outerHTML,
      );
    }
  });

  it("leaves the icon out of what a screen reader hears", () => {
    // The label beside it already says where the tab goes. An icon that named
    // itself too would have the destination read out twice and meant once.
    render(<TabBar tabs={tabs} activeId="budget" />);

    expect(
      within(screen.getByRole("link", { name: "Presupuesto" })).queryByRole(
        "img",
      ),
    ).toBeNull();
  });

  it("tells a screen reader which destination is the one being looked at", () => {
    render(<TabBar tabs={tabs} activeId="movements" />);

    expect(screen.getByRole("link", { name: "Movimientos" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      screen.getByRole("link", { name: "Presupuesto" }),
    ).not.toHaveAttribute("aria-current");
  });

  describe("the raised button", () => {
    it("goes where it was told to go", () => {
      render(<TabBar tabs={tabs} activeId="budget" action={action} />);

      expect(
        screen.getByRole("link", { name: "Anotar un movimiento" }),
      ).toHaveAttribute("href", "/m/nuevo");
    });

    it("names itself, because it carries no words of its own", () => {
      // The canvas draws a plus and nothing else. Without a name of its own a
      // screen reader reaches the most important control in the app and can
      // only say "link".
      render(<TabBar tabs={tabs} activeId="budget" action={action} />);
      const button = screen.getByRole("link", { name: "Anotar un movimiento" });

      expect(button).not.toHaveTextContent(/\S/);
    });

    it("sits between the second destination and the third", () => {
      // It is not a fifth tab: it is the one thing on the bar that does
      // something rather than going somewhere, and the middle is what makes it
      // reachable by either thumb.
      render(<TabBar tabs={tabs} activeId="budget" action={action} />);

      // getAllByRole returns them in the order they are on the screen, which
      // is the whole question here.
      const names = screen
        .getAllByRole("link")
        .map((link) => link.getAttribute("aria-label") ?? link.textContent);

      expect(names).toEqual([
        "Presupuesto",
        "Movimientos",
        "Anotar un movimiento",
        "Espacios",
        "Ajustes",
      ]);
    });

    it("draws its plus at the weight the canvas draws it", () => {
      render(<TabBar tabs={tabs} activeId="budget" action={action} />);
      const plus = screen
        .getByRole("link", { name: "Anotar un movimiento" })
        .querySelector("svg");

      expect(plus?.getAttribute("width")).toBe("26");
      expect(plus?.getAttribute("stroke-width")).toBe("2.4");
    });

    it("is left off where there is nothing for it to do", () => {
      render(<TabBar tabs={tabs} activeId="budget" />);

      expect(screen.getAllByRole("link")).toHaveLength(tabs.length);
    });
  });
});
