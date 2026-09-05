import { describe, expect, it } from "vitest";
import type { ReadableBranch } from "@/i18n/category";
import { namesFrom } from "./catalogue";

const catalogue: readonly ReadableBranch[] = [
  {
    id: "food-id",
    name: "Comida",
    own: false,
    mark: { kind: "icon", name: "cart", tint: "green" },
    children: [
      {
        id: "groceries-id",
        name: "Supermercado",
        own: false,
        mark: { kind: "icon", name: "cart", tint: "green" },
      },
    ],
  },
  {
    id: "mine-id",
    name: "Mate",
    own: true,
    mark: { kind: "letter", letter: "M", tint: "grey" },
    children: [],
  },
];

describe("looking a Category up by the identifier on a row", () => {
  it("finds a heading by its identifier", () => {
    expect(namesFrom(catalogue).get("food-id")).toMatchObject({
      name: "Comida",
      heading: null,
    });
  });

  it("finds what sits under a heading, and says which heading that is", () => {
    expect(namesFrom(catalogue).get("groceries-id")).toMatchObject({
      name: "Supermercado",
      heading: "Comida",
    });
  });

  /*
   * The mark comes through the same lookup as the name (#39). A row on the
   * month's list has a Category's identifier and nothing else, so if the mark
   * did not travel here the screen would have to decide it -- which is the one
   * thing `categoryMark` exists to stop.
   */
  it("carries the mark the Category was given, so a row never decides its own", () => {
    const named = namesFrom(catalogue);

    expect(named.get("food-id")?.mark).toEqual({
      kind: "icon",
      name: "cart",
      tint: "green",
    });
    expect(named.get("mine-id")?.mark).toEqual({
      kind: "letter",
      letter: "M",
      tint: "grey",
    });
  });
});
