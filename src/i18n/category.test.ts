// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { Category, CategoryBranch } from "@/domain/category/category";
import { es } from "./messages.es";
import { categoryLabel, categoryMark, incomeMark, readableCatalogue } from "./category";

const migrations = path.resolve(import.meta.dirname, "..", "db", "migrations");

/** Every slug the seed migration ships, read out of the SQL that ships them. */
const shippedSlugs = [
  ...readFileSync(
    path.join(migrations, "0003_create_categories.sql"),
    "utf8",
  ).matchAll(/,\s*'([a-z][a-z.]*)',\s*NULL\)/g),
].map((match) => match[1]!);

const shipped = (slug: string, parentId: string | null = null): Category => ({
  id: slug,
  spaceId: null,
  parentId,
  label: { kind: "catalogue", slug },
});

const own = (id: string, name: string): Category => ({
  id,
  spaceId: "space",
  parentId: null,
  label: { kind: "own", name },
});

const branch = (
  category: Category,
  children: readonly Category[] = [],
): CategoryBranch => ({ category, children });

describe("naming a Category to a person", () => {
  it("translates a Category shipped with the product", () => {
    expect(categoryLabel({ kind: "catalogue", slug: "food" })).toBe("Comida");
  });

  it("shows a Member's own Category in the words they typed", () => {
    expect(categoryLabel({ kind: "own", name: "Mate" })).toBe("Mate");
  });

  it("has a Spanish name for every Category the product ships", () => {
    // The catalogue is rows in a migration and its names are a message file, so
    // nothing but this stops the two drifting apart. A slug with no message
    // reaches `t`, which throws — this turns that into a failing build.
    // A regex that quietly stopped matching would make this test pass over an
    // empty list, so it is checked against two slugs read by eye: a heading
    // and something under one.
    expect(shippedSlugs).toContain("food");
    expect(shippedSlugs).toContain("food.groceries");

    for (const slug of shippedSlugs) {
      expect(Object.keys(es)).toContain(`category.${slug}`);
    }
  });

  it("keeps the `category.` namespace for shipped names and nothing else", () => {
    const named = Object.keys(es)
      .filter((key) => key.startsWith("category."))
      .map((key) => key.slice("category.".length));

    expect(named.sort()).toEqual([...shippedSlugs].sort());
  });
});

describe("reading a catalogue in order", () => {
  it("puts the headings in the order a Spanish reader expects", () => {
    const ordered = readableCatalogue([
      branch(shipped("transport")),
      branch(shipped("education")),
      branch(shipped("food")),
    ]);

    // Educación, Comida, Transporte — by the name on the screen, not the slug
    // behind it, and not the order the rows came back in.
    expect(ordered.map((entry) => entry.name)).toEqual([
      "Comida",
      "Educación",
      "Transporte",
    ]);
  });

  it("orders what a Category holds the same way", () => {
    const [food] = readableCatalogue([
      branch(shipped("food"), [
        shipped("food.groceries", "food"),
        shipped("food.dining", "food"),
      ]),
    ]);

    expect(food?.children.map((child) => child.name)).toEqual([
      "Restaurantes y delivery",
      "Supermercado",
    ]);
  });

  it("sorts a Member's own Category in among the shipped ones", () => {
    const ordered = readableCatalogue([
      branch(shipped("food")),
      branch(own("mine", "Mate")),
      branch(shipped("home")),
    ]);

    // One catalogue, not the product's list with a person's tacked on the end.
    expect(ordered.map((entry) => entry.name)).toEqual([
      "Comida",
      "Hogar",
      "Mate",
    ]);
  });

  it("carries the identifier through, so a row can be linked and recorded against", () => {
    const ordered = readableCatalogue([branch(own("mine", "Mate"))]);

    expect(ordered[0]).toMatchObject({ id: "mine", name: "Mate" });
  });

  /*
   * The mark is decided here, beside the name, and not on the screen that
   * draws it (#39). Both are answers to "what is this Category to a person",
   * and a screen working the second one out for itself is a screen that would
   * eventually disagree with the next screen that tried.
   */
  it("marks a shipped Category with the icon the canvas draws for it", () => {
    const [food] = readableCatalogue([branch(shipped("food"))]);

    expect(food?.mark).toEqual({ kind: "icon", name: "cart", tint: "green" });
  });

  it("marks a Category a Member typed with the letter of the name they typed", () => {
    const [mine] = readableCatalogue([branch(own("mine", "Mate"))]);

    expect(mine?.mark).toEqual({ kind: "letter", letter: "M", tint: "grey" });
  });

  // The letter is taken from the name a reader sees and not from the slug: a
  // shipped Category with no icon is "Salud" on the screen, and a circle with
  // an H in it beside the word Salud is a circle about a different word.
  it("takes an unmarked shipped Category's letter from its translated name", () => {
    const [health] = readableCatalogue([branch(shipped("health"))]);

    expect(health?.mark).toEqual({ kind: "letter", letter: "S", tint: "grey" });
  });

  it("marks what sits under a heading as well as the heading", () => {
    const [food] = readableCatalogue([
      branch(shipped("food"), [shipped("food.groceries", "food")]),
    ]);

    expect(food?.children[0]?.mark).toEqual({
      kind: "icon",
      name: "cart",
      tint: "green",
    });
  });
});

describe("the mark a Category wears on a row", () => {
  it("gives the shipped Categories the canvas draws their own icon", () => {
    expect(categoryMark("food", "Comida")).toEqual({
      kind: "icon",
      name: "cart",
      tint: "green",
    });
    expect(categoryMark("transport", "Transporte")).toEqual({
      kind: "icon",
      name: "car",
      tint: "grey",
    });
  });

  /*
   * A subcategory is the same shape of spending as the heading it sits under:
   * "Supermercado" is food and "Nafta" is a car. Written as a fallback to the
   * heading rather than as fourteen more rows in the map, so a slug added to
   * the catalogue under a mapped heading is drawn without touching that map.
   */
  it("draws a subcategory as whatever its heading is drawn as", () => {
    expect(categoryMark("food.groceries", "Supermercado")).toEqual(
      categoryMark("food", "Comida"),
    );
    expect(categoryMark("transport.fuel", "Nafta")).toEqual(
      categoryMark("transport", "Transporte"),
    );
  });

  /*
   * The case this exists for. Two of the nine shipped headings are drawn and a
   * Category a Member typed can never be, so the letter is the ordinary answer
   * rather than an edge of it.
   */
  it("draws a shipped Category with no icon as its own letter", () => {
    expect(categoryMark("health", "Salud")).toEqual({
      kind: "letter",
      letter: "S",
      tint: "grey",
    });
  });

  // Null and not a missing key: a Category a Member typed has no slug at all,
  // and the check in the schema is what makes that so.
  it("draws a Category a Member typed as its letter too", () => {
    expect(categoryMark(null, "ahorro")).toMatchObject({
      kind: "letter",
      letter: "A",
    });
  });

  // The letter is the letter of the word the reader is looking at, never of
  // the key underneath it: an H beside the word "Salud" is a circle about a
  // different word.
  it("reads the slug for the icon and the name for the letter", () => {
    expect(categoryMark(null, "Comida")).toMatchObject({ kind: "letter" });
    expect(categoryMark("health", "Salud")).toMatchObject({ letter: "S" });
  });

  /*
   * Two letters do collide -- "Ocio" and "Otros" are both a grey O -- and that
   * is the honest cost of not inventing drawings the canvas never made. It is
   * a far smaller collision than one shared glyph, which collides on every
   * unmapped Category there is. Written down so nobody reads the letter as a
   * promise it does not make.
   */
  it("collides where two Categories start with the same letter, and no further", () => {
    expect(categoryMark("leisure", "Ocio")).toEqual(
      categoryMark("other", "Otros"),
    );
    expect(categoryMark("health", "Salud")).not.toEqual(
      categoryMark("other", "Otros"),
    );
  });
});

describe("the mark income wears", () => {
  /*
   * Income is not a Category and carries none (ADR-0016), so it cannot come
   * out of the map. It is named beside it rather than pasted into the screen
   * for the same reason the map is there: one place decides what a row on the
   * money list is drawn as.
   */
  it("is the arrow the canvas draws, in the green tint", () => {
    expect(incomeMark).toEqual({
      kind: "icon",
      name: "arrow-up",
      tint: "green",
    });
  });
});
