import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemberAvatars } from "./member-avatars";
import { memberColour } from "./member-colour";

const gian = { id: "member-1", name: "Gian Solo" };
const ana = { id: "member-2", name: "Ana Junta" };

describe("who is in a Space, as circles", () => {
  it("draws one circle per Member", () => {
    render(<MemberAvatars members={[gian, ana]} />);

    expect(screen.getAllByRole("img")).toHaveLength(2);
  });

  /*
   * The whole reason the circles are labelled: #38 takes the row of names off
   * the card, so these are the only thing left saying who shares a Space. A
   * screen reader that heard "G, A" would have been told nothing.
   */
  it("names every one of them, so the Space is readable without colour", () => {
    render(<MemberAvatars members={[gian, ana]} />);

    expect(screen.getByRole("img", { name: "Gian Solo" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Ana Junta" })).toBeInTheDocument();
  });

  /*
   * The colours are the Space's and not the order they were handed in
   * (ADR-0020). Asked of `memberColour` here rather than pasted, so a repaint
   * of the two seats does not break this.
   */
  it("wears the colour the Space decided for each of them", () => {
    render(<MemberAvatars members={[gian, ana]} />);

    const ids = [gian.id, ana.id];

    expect(screen.getByRole("img", { name: "Gian Solo" })).toHaveClass(
      memberColour(gian.id, ids),
    );
    expect(screen.getByRole("img", { name: "Ana Junta" })).toHaveClass(
      memberColour(ana.id, ids),
    );
  });

  // The ring is what separates two circles that overlap. It is a fact about
  // the pair and not about either Member, so it goes on both or on neither.
  it("rings both circles where they overlap", () => {
    render(<MemberAvatars members={[gian, ana]} />);

    for (const circle of screen.getAllByRole("img")) {
      expect(circle.className).toContain("ringed");
    }
  });

  /*
   * A Space of one is one circle with nothing behind it, so the ring would be
   * a hairline drawing a seam where nothing is joined.
   */
  it("leaves a lone circle unringed, having nothing to lift it off", () => {
    render(<MemberAvatars members={[gian]} />);

    expect(screen.getByRole("img").className).not.toContain("ringed");
  });

  // The order given is the order drawn: the creator first, then whoever was
  // invited after them, which is the order a Space's rows come back in.
  it("draws them in the order it is handed", () => {
    render(<MemberAvatars members={[ana, gian]} />);

    expect(
      screen.getAllByRole("img").map((circle) => circle.textContent),
    ).toEqual(["A", "G"]);
  });
});
