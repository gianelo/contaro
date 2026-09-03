import { describe, expect, it } from "vitest";
import { spaceVisibleTo } from "./access";

const ana = "3f2b0c1e-0000-4000-8000-000000000001";
const beto = "3f2b0c1e-0000-4000-8000-000000000002";

const casa = {
  id: "3f2b0c1e-0000-4000-8000-0000000000ca",
  name: "Casa",
  currency: "ARS",
} as const;

describe("who may open a Space", () => {
  it("is a Member of it", () => {
    expect(spaceVisibleTo(ana, casa, [ana, beto])).toEqual(casa);
  });

  it("is not someone who is not in it, however they came by its identifier", () => {
    expect(spaceVisibleTo(beto, casa, [ana])).toBeNull();
  });

  it("is nobody, when the Space has no Members at all", () => {
    expect(spaceVisibleTo(ana, casa, [])).toBeNull();
  });
});
