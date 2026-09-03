// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { Category, CategoryBranch } from "@/domain/category/category";
import { es } from "./messages.es";
import { categoryLabel, readableCatalogue } from "./category";

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
});
