import { describe, expect, it } from "vitest";
import { memberColour } from "./member-colour";

const gian = "3f1b8a2c-0000-4000-8000-000000000001";
const ana = "9c4d7e5f-0000-4000-8000-000000000002";

describe("a Member's colour", () => {
  it("is the same wherever that Member appears", () => {
    // The same Space handed over in the order two different queries happened to
    // return it. An avatar that changes colour between two screens is an avatar
    // that has stopped naming anybody.
    expect(memberColour(gian, [gian, ana])).toBe(memberColour(gian, [ana, gian]));
  });

  it("is the same for a Member alone in a Space and beside somebody", () => {
    // A personal Space that gains its second Member must not repaint the first.
    expect(memberColour(gian, [gian])).toBe(memberColour(gian, [gian, ana]));
  });

  it("is not the same for the two Members of a Space", () => {
    expect(memberColour(gian, [gian, ana])).not.toBe(
      memberColour(ana, [gian, ana]),
    );
  });

  it("is decided by the Space and never by who is reading it", () => {
    // Both Members see the same colours, so "the blue one" names one person for
    // the two of them rather than each of them.
    const asGianSeesIt = memberColour(ana, [gian, ana]);
    const asAnaSeesIt = memberColour(ana, [ana, gian]);

    expect(asGianSeesIt).toBe(asAnaSeesIt);
  });

  it("refuses a Member the Space does not hold", () => {
    // Falling back to the first colour would draw a stranger as one of the two
    // Members, which is a wrong statement rather than a missing one.
    expect(() => memberColour("someone-else", [gian, ana])).toThrow(
      /not a Member/i,
    );
  });

  it("refuses a third Member, because a Space can never hold one", () => {
    const third = "00000000-0000-4000-8000-000000000003";

    expect(() => memberColour(third, [gian, ana, third])).toThrow(/two/i);
  });
});
