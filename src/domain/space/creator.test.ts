import { describe, expect, it } from "vitest";
import type { Space } from "./space";
import {
  isTheCreatorOf,
  mayApproveTheCarryOver,
  mayCloseTheMonth,
} from "./creator";

const ana = "3f2b0c1e-0000-4000-8000-000000000001";
const beto = "3f2b0c1e-0000-4000-8000-000000000002";

const CASA: Space = {
  id: "3f2b0c1e-0000-4000-8000-0000000000ca",
  name: "Casa",
  currency: "ARS",
  createdBy: ana,
};

describe("who created a Space", () => {
  it("is the Member the Space names", () => {
    expect(isTheCreatorOf(ana, CASA)).toBe(true);
  });

  it("is not the Member who was invited into it", () => {
    expect(isTheCreatorOf(beto, CASA)).toBe(false);
  });
});

describe("the two acts the creator alone may perform", () => {
  it("lets the creator close the month", () => {
    expect(mayCloseTheMonth(ana, CASA)).toBe(true);
  });

  it("does not let the invited Member close the month", () => {
    expect(mayCloseTheMonth(beto, CASA)).toBe(false);
  });

  it("lets the creator approve the carry-over", () => {
    expect(mayApproveTheCarryOver(ana, CASA)).toBe(true);
  });

  it("does not let the invited Member approve the carry-over", () => {
    expect(mayApproveTheCarryOver(beto, CASA)).toBe(false);
  });
});
