import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Avatar } from "./avatar";
import { memberColour } from "./member-colour";

const gian = "member-1";
const ana = "member-2";
const both = [gian, ana];

describe("the avatar", () => {
  it("draws the initial of the person it is about", () => {
    render(<Avatar name="Gian" colour={memberColour(gian, both)} />);

    expect(screen.getByRole("img")).toHaveTextContent("G");
  });

  /*
   * The whole reason this is a labelled image and not a decorative letter:
   * on the Space list the avatars are the only thing that says who is in a
   * Space. A screen reader that hears "G, A" has been told nothing at all.
   */
  it("says the whole name to anybody who cannot see the colour", () => {
    render(<Avatar name="Ana Junta" colour={memberColour(ana, both)} />);

    expect(screen.getByRole("img", { name: "Ana Junta" })).toBeInTheDocument();
  });

  it("wears the colour its Space decided for that Member", () => {
    render(<Avatar name="Gian" colour={memberColour(gian, both)} />);

    expect(screen.getByRole("img")).toHaveClass(memberColour(gian, both));
  });

  // The two Members of one Space never come back the same colour, whichever
  // way round the seats fall. `memberColour` decides it; this only proves the
  // avatar carries the decision through rather than flattening it.
  it("draws the two Members of a Space apart", () => {
    render(
      <>
        <Avatar name="Gian" colour={memberColour(gian, both)} />
        <Avatar name="Ana" colour={memberColour(ana, both)} />
      </>,
    );

    const [first, second] = screen.getAllByRole("img");

    expect(first?.className).not.toBe(second?.className);
  });

  it("comes in the small size the Space cards stack", () => {
    render(<Avatar name="Gian" colour={memberColour(gian, both)} size="sm" />);

    expect(screen.getByRole("img").className).toContain("sm");
  });

  // The third size, and the smallest: whose money a Movement was, sitting
  // before the amount on the month's list (#39). It is a size and not a new
  // component because it is the same circle saying the same thing -- only the
  // room it has to say it in has changed.
  it("comes in the smallest size a row on the month's list carries", () => {
    render(<Avatar name="Ana" colour={memberColour(ana, both)} size="xs" />);

    expect(screen.getByRole("img").className).toContain("xs");
  });

  /*
   * Still a labelled image at 21px, and that is the whole reason a ten-pixel
   * letter is allowed to be that small: nobody is meant to read it. On a row
   * in a shared Space this circle is the only thing that says whose money it
   * was -- the "Plata de Ana" line it replaced is gone -- so a circle that
   * said nothing to a screen reader would have deleted the fact rather than
   * drawn it.
   */
  it("still says the whole name at the size nobody can read", () => {
    render(<Avatar name="Ana Junta" colour={memberColour(ana, both)} size="xs" />);

    expect(screen.getByRole("img", { name: "Ana Junta" })).toBeInTheDocument();
  });
});
