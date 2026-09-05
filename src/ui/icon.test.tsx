import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Icon, iconNames, type IconName } from "./icon";

const drawn = (container: HTMLElement) => {
  const svg = container.querySelector("svg");
  if (!svg) throw new Error("The icon drew no <svg> at all.");
  return svg;
};

describe("Icon", () => {
  it("draws the icon it was asked for by name, rather than a pasted path", () => {
    const { container } = render(<Icon name="plus" />);

    expect(drawn(container).innerHTML).toContain("M12 5v14M5 12h14");
  });

  it("draws a different icon for a different name", () => {
    const { container } = render(<Icon name="check" />);

    expect(drawn(container).innerHTML).toContain("M4 12.5l5 5L20 6.5");
  });

  it("draws every shape an icon is made of, not only its first", () => {
    // `users` is three shapes. An icon module that renders one of them is an
    // icon module that silently loses two thirds of the set.
    const { container } = render(<Icon name="users" />);
    const svg = drawn(container);

    expect(svg.querySelectorAll("path")).toHaveLength(2);
    expect(svg.querySelectorAll("circle")).toHaveLength(1);
  });

  describe("colour", () => {
    it("takes its colour from the text around it, so it needs none of its own", () => {
      for (const name of iconNames) {
        const { container } = render(<Icon name={name} />);
        const svg = drawn(container);

        expect(svg.getAttribute("stroke")).toBe("currentColor");
        expect(svg.getAttribute("fill")).toBe("none");
      }
    });
  });

  it("rounds its ends and leaves its corners alone, as the canvas draws them", () => {
    // The canvas sets no stroke-linejoin on any artboard, so its corners are
    // SVG's default mitre. Rounding them would blunt the point of the alert
    // triangle and the tick of the check, which is a different drawing.
    const { container } = render(<Icon name="alert-triangle" />);
    const svg = drawn(container);

    expect(svg.getAttribute("stroke-linecap")).toBe("round");
    expect(svg.getAttribute("stroke-linejoin")).toBeNull();
  });

  describe("size", () => {
    it("comes out at the size the canvas draws it", () => {
      const { container } = render(<Icon name="calendar" size={15} />);
      const svg = drawn(container);

      expect(svg.getAttribute("width")).toBe("15");
      expect(svg.getAttribute("height")).toBe("15");
    });

    it("keeps the same 24x24 grid whatever size it comes out at", () => {
      // The geometry is written once against one viewBox; a size is a scale of
      // it and never a second set of coordinates.
      const { container } = render(<Icon name="calendar" size={27} />);

      expect(drawn(container).getAttribute("viewBox")).toBe("0 0 24 24");
    });

    it("is drawn at 24 when nobody says otherwise", () => {
      const { container } = render(<Icon name="calendar" />);

      expect(drawn(container).getAttribute("width")).toBe("24");
    });
  });

  describe("weight", () => {
    it("draws at the common weight", () => {
      const { container } = render(<Icon name="calendar" />);

      expect(drawn(container).getAttribute("stroke-width")).toBe("2");
    });

    it("thins the backspace and thickens the check, as the canvas draws them", () => {
      // Two icons the common weight reads wrong at: the backspace outline
      // closes into a blob, and the check disappears beside the row it sits in.
      const backspace = render(<Icon name="backspace" />);
      const check = render(<Icon name="check" />);

      expect(drawn(backspace.container).getAttribute("stroke-width")).toBe("1.8");
      expect(drawn(check.container).getAttribute("stroke-width")).toBe("2.6");
    });

    it("draws at the weight it was asked for", () => {
      // The canvas compensates optically: the smaller an icon comes out, the
      // heavier its line, so a small glyph does not fade beside its text. That
      // is a fact about the screen the icon sits on, so the screen says it.
      const { container } = render(<Icon name="plus" size={26} weight={2.4} />);

      expect(drawn(container).getAttribute("stroke-width")).toBe("2.4");
    });

    it("lets the asking screen outweigh an icon's own exception", () => {
      // Precedence, written down once: what the call site asks for beats the
      // per-icon exception, which beats the common weight. Without this the two
      // rules would have no answer for a `check` drawn small.
      const { container } = render(<Icon name="check" size={13} weight={2.2} />);

      expect(drawn(container).getAttribute("stroke-width")).toBe("2.2");
    });

    it("keeps an icon's own exception when no screen asks for a weight", () => {
      const { container } = render(<Icon name="check" size={13} />);

      expect(drawn(container).getAttribute("stroke-width")).toBe("2.6");
    });
  });

  describe("what a screen reader hears", () => {
    it("says nothing where the text beside it already says what it is", () => {
      render(
        <span>
          <Icon name="calendar" />
          Hoy
        </span>,
      );

      expect(screen.queryByRole("img")).not.toBeInTheDocument();
    });

    it("names itself when it is the only thing saying what it is", () => {
      render(<Icon name="close" label="Cancelar la invitación" />);

      expect(
        screen.getByRole("img", { name: "Cancelar la invitación" }),
      ).toBeInTheDocument();
    });
  });

  describe("the two calendars", () => {
    it("draws the tab's calendar with the day marked inside its grid", () => {
      // Shorter, more rounded, and carrying a stroke inside the grid: what
      // makes it read as a month with a day in it rather than as an empty box.
      const { container } = render(<Icon name="calendar-day" />);
      const svg = drawn(container);

      expect(svg.innerHTML).toContain('rx="3"');
      expect(svg.innerHTML).toContain("M8 2v4M16 2v4M3 10h18M8 15h3");
    });

    it("leaves the day pill's calendar as the canvas draws it", () => {
      const { container } = render(<Icon name="calendar" />);
      const svg = drawn(container);

      expect(svg.innerHTML).toContain('rx="2"');
      expect(svg.innerHTML).toContain("M16 2v4M8 2v4M3 10h18");
    });
  });

  it("draws something for every name it offers", () => {
    for (const name of iconNames) {
      const { container } = render(<Icon name={name} />);

      expect(drawn(container).innerHTML.length).toBeGreaterThan(0);
    }
  });

  it("offers every icon the canvas draws", () => {
    const canvas: readonly IconName[] = [
      "calendar",
      "calendar-day",
      "list",
      "users",
      "target",
      "plus",
      "person",
      "backspace",
      "check",
      "close",
      "chevron-down",
      "alert-circle",
      "alert-triangle",
      "cart",
      "car",
      "arrow-up",
      "rotate",
    ];

    expect([...iconNames].sort()).toEqual([...canvas].sort());
  });
});
