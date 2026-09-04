import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Icon } from "@/ui/icon";
import { Pace } from "./pace";
import type { ReadablePace } from "./budget";

const pace = (changes: Partial<ReadablePace> = {}): ReadablePace => ({
  lead: "Día 18 de 30 · en gastos variables vas",
  standing: "$620.000 arriba del ritmo",
  ahead: true,
  ...changes,
});

describe("the pace of the month", () => {
  // The whole shape of the answer: one sentence, not a second meter. A person
  // reading two meters does not need a third figure to line up against them.
  it("says the day, the month's length and the standing as one sentence", () => {
    render(<Pace pace={pace()} />);

    expect(
      screen.getByText(/Día 18 de 30/).textContent?.replace(/\s+/g, " "),
    ).toBe("Día 18 de 30 · en gastos variables vas $620.000 arriba del ritmo");
  });

  // The line names its own scope, so nobody has to know why the rent is not
  // in it. This is an acceptance criterion of #14 and not a detail of the copy.
  it("says out loud that it covers variable spending", () => {
    render(<Pace pace={pace()} />);

    expect(screen.getByText(/en gastos variables/)).toBeInTheDocument();
  });

  it("draws the alert circle beside a month spending faster than its pace", () => {
    const { container } = render(<Pace pace={pace()} />);

    // Compared against what `Icon` draws rather than against a pasted path,
    // for the reason the Variables section does it: which shapes make an
    // `alert-circle` is `icon.tsx`'s to say, and a redrawn circle that is
    // still perfectly correct must not break this screen's test.
    const circle = render(<Icon name="alert-circle" size={15} />);

    expect(container.querySelector("svg")?.outerHTML).toBe(
      circle.container.querySelector("svg")?.outerHTML,
    );
  });

  describe("a month that is not spending faster than its pace", () => {
    const quiet = pace({ standing: "$600.000 abajo del ritmo", ahead: false });

    it("still says where the month stands", () => {
      render(<Pace pace={quiet} />);

      expect(screen.getByText(/abajo del ritmo/)).toBeInTheDocument();
    });

    // Behind the pace is not news, and an alert beside "you have spent less
    // than you planned to by now" would be a warning about nothing.
    it("draws no alert", () => {
      const { container } = render(<Pace pace={quiet} />);

      expect(container.querySelector("svg")).toBeNull();
    });
  });

  it("draws nothing at all where there is no pace to speak of", () => {
    const { container } = render(<Pace pace={null} />);

    expect(container).toBeEmptyDOMElement();
  });
});
