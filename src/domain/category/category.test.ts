import { describe, expect, it } from "vitest";
import {
  addCategory,
  catalogueFor,
  categoriesVisibleTo,
  MAX_CATEGORY_NAME_LENGTH,
  type Category,
} from "./category";

const ANA = "space-ana";
const BETO = "space-beto";

const global = (id: string, slug: string, parentId: string | null = null): Category => ({
  id,
  spaceId: null,
  parentId,
  label: { kind: "catalogue", slug },
});

const own = (
  id: string,
  spaceId: string,
  name: string,
  parentId: string | null = null,
): Category => ({ id, spaceId, parentId, label: { kind: "own", name } });

describe("what a Space's catalogue is made of", () => {
  it("shows a Space the global catalogue it was born with", () => {
    const food = global("food", "food");

    expect(categoriesVisibleTo(ANA, [food])).toEqual([food]);
  });

  it("shows a Space the Categories its own Members added", () => {
    const mate = own("mate", ANA, "Mate");

    expect(categoriesVisibleTo(ANA, [mate])).toEqual([mate]);
  });

  it("hides a Category added inside another Space", () => {
    const food = global("food", "food");
    const hers = own("mate", ANA, "Mate");
    const his = own("asado", BETO, "Asado");

    expect(categoriesVisibleTo(ANA, [food, hers, his])).toEqual([food, hers]);
  });

  it("keeps the order it was given, rather than inventing one", () => {
    const rows = [own("mate", ANA, "Mate"), global("food", "food")];

    expect(categoriesVisibleTo(ANA, rows)).toEqual(rows);
  });
});

describe("browsing a Space's catalogue", () => {
  it("hangs a subcategory under the Category that holds it", () => {
    const food = global("food", "food");
    const groceries = global("groceries", "food.groceries", "food");

    expect(catalogueFor(ANA, [food, groceries])).toEqual([
      { category: food, children: [groceries] },
    ]);
  });

  it("lists a Category that holds nothing as a branch with no children", () => {
    const rent = global("rent", "rent");

    expect(catalogueFor(ANA, [rent])).toEqual([
      { category: rent, children: [] },
    ]);
  });

  it("hangs a Space's own subcategory under a Category from the catalogue", () => {
    // Story 15 in #1: the bakery is a kind of food, not a heading of its own.
    const food = global("food", "food");
    const bakery = own("bakery", ANA, "Panadería", "food");

    expect(catalogueFor(ANA, [food, bakery])).toEqual([
      { category: food, children: [bakery] },
    ]);
  });

  it("never hangs another Space's subcategory under a shared parent", () => {
    const food = global("food", "food");
    const hers = own("bakery", ANA, "Panadería", "food");
    const his = own("asado", BETO, "Asado", "food");

    expect(catalogueFor(ANA, [food, hers, his])).toEqual([
      { category: food, children: [hers] },
    ]);
  });

  it("stands a subcategory on its own when its heading was not handed in", () => {
    // A caller may arrange part of a catalogue rather than all of it -- #7's
    // picker will. A Category off the screen is money nobody can record.
    const bakery = own("bakery", ANA, "Panadería", "retired");

    expect(catalogueFor(ANA, [bakery])).toEqual([
      { category: bakery, children: [] },
    ]);
  });
});

describe("adding a Category to a Space", () => {
  const catalogue = [
    global("food", "food"),
    global("groceries", "food.groceries", "food"),
  ];

  it("writes down the Space, the name and no parent", () => {
    expect(addCategory({ spaceId: ANA, parentId: null, name: "Mate" }, catalogue))
      .toEqual({ spaceId: ANA, parentId: null, name: "Mate" });
  });

  it("takes the whitespace off a name before anyone reads it", () => {
    expect(
      addCategory({ spaceId: ANA, parentId: null, name: "  Mate  " }, catalogue),
    ).toMatchObject({ name: "Mate" });
  });

  it("refuses a Category with no name at all", () => {
    expect(() =>
      addCategory({ spaceId: ANA, parentId: null, name: "   " }, catalogue),
    ).toThrow(expect.objectContaining({ field: "name" }));
  });

  it("refuses a name longer than a row can show", () => {
    expect(() =>
      addCategory(
        { spaceId: ANA, parentId: null, name: "x".repeat(MAX_CATEGORY_NAME_LENGTH + 1) },
        catalogue,
      ),
    ).toThrow(expect.objectContaining({ field: "name" }));
  });

  it("refuses a Category that names no Space, rather than making a global one", () => {
    // The global catalogue is shipped with the product; nothing a person types
    // may reach every other Space in it.
    expect(() =>
      addCategory({ spaceId: "  ", parentId: null, name: "Mate" }, catalogue),
    ).toThrow(expect.objectContaining({ field: "space" }));
  });

  it("hangs a new Category under a Category from the catalogue", () => {
    expect(
      addCategory({ spaceId: ANA, parentId: "food", name: "Panadería" }, catalogue),
    ).toEqual({ spaceId: ANA, parentId: "food", name: "Panadería" });
  });

  it("hangs a new Category under one the Space added itself", () => {
    const mate = own("mate", ANA, "Mate");

    expect(
      addCategory({ spaceId: ANA, parentId: "mate", name: "Yerba" }, [
        ...catalogue,
        mate,
      ]),
    ).toMatchObject({ parentId: "mate" });
  });

  it("refuses a parent belonging to another Space", () => {
    const his = own("asado", BETO, "Asado");

    expect(() =>
      addCategory({ spaceId: ANA, parentId: "asado", name: "Vacío" }, [
        ...catalogue,
        his,
      ]),
    ).toThrow(expect.objectContaining({ field: "parent" }));
  });

  it("refuses a parent that is a subcategory itself", () => {
    // Two levels, so a Budget on a parent covers a subtree a person can picture.
    expect(() =>
      addCategory(
        { spaceId: ANA, parentId: "groceries", name: "Verdulería" },
        catalogue,
      ),
    ).toThrow(expect.objectContaining({ field: "parent" }));
  });

  it("refuses a parent no Category has", () => {
    expect(() =>
      addCategory({ spaceId: ANA, parentId: "nothing", name: "Mate" }, catalogue),
    ).toThrow(expect.objectContaining({ field: "parent" }));
  });

  it("refuses a name this Space already gave a Category in the same place", () => {
    const mate = own("mate", ANA, "Mate");

    expect(() =>
      addCategory({ spaceId: ANA, parentId: null, name: "  mate " }, [
        ...catalogue,
        mate,
      ]),
    ).toThrow(expect.objectContaining({ field: "name" }));
  });

  it("allows the same name under two different Categories", () => {
    const otros = own("otros-food", ANA, "Otros", "food");

    expect(
      addCategory({ spaceId: ANA, parentId: null, name: "Otros" }, [
        ...catalogue,
        otros,
      ]),
    ).toMatchObject({ name: "Otros" });
  });

  it("does not mind another Space having used the name", () => {
    const his = own("mate-beto", BETO, "Mate");

    expect(
      addCategory({ spaceId: ANA, parentId: null, name: "Mate" }, [
        ...catalogue,
        his,
      ]),
    ).toMatchObject({ name: "Mate" });
  });
});
