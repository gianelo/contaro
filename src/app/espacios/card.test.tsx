import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SpaceCard } from "./card";
import type { ReadableSpace } from "./listing";

const space = (changes: Partial<ReadableSpace> = {}): ReadableSpace => ({
  id: "space-1",
  name: "Compartido con Ana",
  members: [
    { id: "member-1", name: "Gian Solo" },
    { id: "member-2", name: "Ana Junta" },
  ],
  who: "2 miembros · COP",
  lastOpened: true,
  spent: "$3.994.900",
  expected: "$4.603.900",
  ...changes,
});

describe("a Space, as a card", () => {
  /*
   * One link, covering the whole card and named by its heading. Somebody
   * moving through the page by links hears "Compartido con Ana" rather than
   * the whole card read out as one run-on sentence -- while a thumb still has
   * the whole card to aim at.
   */
  it("is named by the Space, and the way in is named by it too", () => {
    render(<SpaceCard space={space()} />);

    expect(
      screen.getByRole("link", { name: "Compartido con Ana" }),
    ).toHaveAttribute("href", "/espacios/space-1");
  });

  it("draws everyone who is in it", () => {
    render(<SpaceCard space={space()} />);

    expect(screen.getByRole("img", { name: "Gian Solo" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Ana Junta" })).toBeInTheDocument();
  });

  it("says how many are in it and what money it holds", () => {
    render(<SpaceCard space={space()} />);

    expect(screen.getByText("2 miembros · COP")).toBeInTheDocument();
  });

  /*
   * Story 5 of #1, which no ticket ever carried: what the month has cost
   * against what it was planned to, before opening anything. Two labelled
   * figures and never two bare numbers -- a card with "$3.994.900" and
   * "$4.603.900" on it says nothing about which is which.
   */
  it("says what the month cost against what it was planned to", () => {
    render(<SpaceCard space={space()} />);

    // Each label against the figure it names, and not merely both present:
    // two amounts on one card with the labels swapped would pass that.
    expect(screen.getByText("Gastado").nextElementSibling).toHaveTextContent(
      "$3.994.900",
    );
    expect(
      screen.getByText("Presupuesto").nextElementSibling,
    ).toHaveTextContent("$4.603.900");
  });

  // A month nobody has planned still owes an honest figure. Zero is an
  // answer; a blank is the card failing at the thing it exists to do.
  it("still shows a figure for a Space with no plan yet", () => {
    render(<SpaceCard space={space({ expected: "$0" })} />);

    expect(screen.getByText("$0")).toBeInTheDocument();
  });

  /*
   * Said in a word and not in a border alone. The accent outline is the fast
   * way to find it in a column of cards, and "Activo" is what makes the same
   * fact reach somebody who cannot see the outline.
   */
  it("says out loud which Space is the one being used", () => {
    render(<SpaceCard space={space({ lastOpened: true })} />);

    expect(screen.getByText("Activo")).toBeInTheDocument();
  });

  it("says nothing of the sort on a Space that is not", () => {
    render(<SpaceCard space={space({ lastOpened: false })} />);

    expect(screen.queryByText("Activo")).not.toBeInTheDocument();
  });

  // A personal Space is one circle, and the card still reads as a whole.
  it("draws a Space of one as one circle", () => {
    render(
      <SpaceCard
        space={space({
          name: "Personal",
          members: [{ id: "member-1", name: "Gian Solo" }],
          who: "Solo vos · COP",
          lastOpened: false,
        })}
      />,
    );

    expect(screen.getAllByRole("img")).toHaveLength(1);
    expect(screen.getByText("Solo vos · COP")).toBeInTheDocument();
  });
});
