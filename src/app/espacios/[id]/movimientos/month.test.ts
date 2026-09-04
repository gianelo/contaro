import { describe, expect, it } from "vitest";
import type { ReadableBranch } from "@/i18n/category";
import { chipsFrom } from "./month";

const catalogue: readonly ReadableBranch[] = [
  {
    id: "food",
    name: "Comida",
    own: false,
    children: [
      { id: "food.groceries", name: "Supermercado", own: false },
      { id: "food.bakery", name: "Panadería", own: true },
    ],
  },
  { id: "pets", name: "Mascotas", own: false, children: [] },
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
