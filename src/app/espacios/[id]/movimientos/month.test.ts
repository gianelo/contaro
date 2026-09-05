import { describe, expect, it } from "vitest";
import type { ReadableBranch } from "@/i18n/category";
import { memberColour } from "@/ui/member-colour";
import { chipsFrom, whoseFrom } from "./month";

const catalogue: readonly ReadableBranch[] = [
  {
    id: "food",
    name: "Comida",
    own: false,
    mark: { kind: "icon", name: "cart", tint: "green" },
    children: [
      {
        id: "food.groceries",
        name: "Supermercado",
        own: false,
        mark: { kind: "icon", name: "cart", tint: "green" },
      },
      {
        id: "food.bakery",
        name: "Panadería",
        own: true,
        mark: { kind: "letter", letter: "P", tint: "grey" },
      },
    ],
  },
  {
    id: "pets",
    name: "Mascotas",
    own: false,
    mark: { kind: "letter", letter: "M", tint: "grey" },
    children: [],
  },
];

describe("chipsFrom", () => {
  it("offers one chip per heading, in the order the catalogue is read in", () => {
    expect(chipsFrom(catalogue).map((chip) => chip.label)).toEqual([
      "Comida",
      "Mascotas",
    ]);
  });

  it("keeps what a heading holds under it rather than beside it", () => {
    const [food] = chipsFrom(catalogue);

    expect(food?.value).toBe("food");
    expect(food?.children.map((child) => child.label)).toEqual([
      "Supermercado",
      "Panadería",
    ]);
  });

  it("names each subcategory by its heading, for what is read out", () => {
    // Two Spaces' worth of naming can produce two Categories called the same
    // thing under two different headings, and the second group's legend says
    // "something more precise" rather than which heading it is under.
    const [food] = chipsFrom(catalogue);

    for (const child of food?.children ?? []) {
      expect(child.qualifier).toBe("Comida");
    }
  });

  it("leaves a heading that holds nothing holding nothing", () => {
    const pets = chipsFrom(catalogue).at(1);

    expect(pets?.label).toBe("Mascotas");
    expect(pets?.children).toEqual([]);
  });
});

const gian = { id: "member-1", name: "Gian Solo" };
const ana = { id: "member-2", name: "Ana Junta" };

describe("whose money a Movement was, as a row draws it", () => {
  /*
   * The avatar replaces the "Plata de Ana" line the row used to carry, which
   * cost a whole line to say what a coloured circle says in no space at all
   * (#39). So the row needs the Member's name and the colour their Space
   * seated them in, and neither was on a Movement before.
   */
  it("names each Member and gives them the colour their Space decided", () => {
    const whose = whoseFrom([gian, ana]);

    expect(whose.get("member-1")).toEqual({
      name: "Gian Solo",
      colour: memberColour("member-1", ["member-1", "member-2"]),
    });
    expect(whose.get("member-2")?.colour).toBe(
      memberColour("member-2", ["member-1", "member-2"]),
    );
  });

  /*
   * Hanging off the same fact the second line hung off, rather than a new
   * check: in a Space of one every Movement is the reader's, and a circle that
   * says the same thing on every row is a circle a thumb stops seeing. Empty
   * here is what makes the row draw no avatar at all.
   */
  it("has nothing to say in a Space of one", () => {
    expect(whoseFrom([gian]).size).toBe(0);
  });

  /*
   * `memberColour` throws for somebody the Space does not hold, and rightly:
   * colouring a stranger as one of the Space's own Members is a wrong
   * statement on the screen. That throw must never reach the month's list, so
   * the colours are worked out from the Space's own rows once -- a Movement
   * attributed to somebody no longer in them simply finds nothing here, and
   * the row draws no avatar, exactly as the second line used to say nothing.
   */
  it("finds nothing for a Member the Space no longer holds, rather than throwing", () => {
    expect(whoseFrom([gian, ana]).get("member-3")).toBeUndefined();
  });
});
