import { describe, expect, it } from "vitest";
import { initialOf } from "./initial";

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
