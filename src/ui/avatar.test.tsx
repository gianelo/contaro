import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Avatar, initialOf } from "./avatar";
import { memberColour } from "./member-colour";

const gian = "member-1";
const ana = "member-2";
const both = [gian, ana];

describe("the letter a person is drawn as", () => {
  it("is the first letter of their name, in capitals", () => {
    expect(initialOf("gian")).toBe("G");
  });

  it("ignores the space somebody typed before their name", () => {
    expect(initialOf("  Ana  ")).toBe("A");
  });

  // "Ángela" is an A with a hat on, not an A. Uppercasing the letter the name
  // really starts with keeps the accent, because that is the letter she wrote.
  it("keeps the accent on a letter that carries one", () => {
    expect(initialOf("ángela")).toBe("Á");
  });

  // One letter and not one code unit: a name beginning outside the basic
  // plane would otherwise be drawn as half a character.
  it("takes one whole character and never half of one", () => {
    expect(initialOf("𝒮ol")).toBe("𝒮");
  });

  // Not "U" for undefined and not a crash: a Member with no name is a row
  // that went wrong upstream, and the circle says nothing rather than a lie.
  it("has nothing to draw for a name that is not there", () => {
    expect(initialOf("   ")).toBe("");
  });
});

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
});
