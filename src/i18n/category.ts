import type {
  CategoryBranch,
  CategoryLabel,
} from "@/domain/category/category";
import {
  iconMark,
  letterMark,
  type CategoryMark,
} from "@/ui/category-mark";
import { inReadingOrder, t } from "./index";
import { es, type SpanishMessages } from "./messages.es";

/**
 * How a Category is named to a person.
 *
 * The two kinds are named in two different places, which is the whole reason
 * `CategoryLabel` is not a string: a Category shipped with the product is a
 * row carrying a key, translated like every other piece of copy, so a second
 * language is a file and not a migration. One a Member typed is shown in their
 * words, untranslated, because they are the words they chose.
 */
export function categoryLabel(label: CategoryLabel): string {
  if (label.kind === "own") return label.name;

  const key = `category.${label.slug}`;

  // A slug is a column, so it is any string at all as far as the types are
  // concerned, and casting it into a message key would trade a checked lookup
  // for a promise. Asked the way `isCurrencyCode` asks: the answer is a real
  // one, and category.test.ts fails the build long before this can throw.
  if (!isCategoryName(key)) {
    throw new Error(
      `The Category shipped as "${label.slug}" has no Spanish name. Every slug in the seed migration needs a "category.<slug>" message.`,
    );
  }

  return t(key);
}

function isCategoryName(key: string): key is keyof SpanishMessages {
  return Object.hasOwn(es, key);
}

/**
 * The shipped Categories the design canvas actually draws, by slug.
 *
 * Two of them, and that is not an oversight: `design/Movimientos.dc.html` draws
 * a cart and a car, and nothing on any artboard says what Salud or Mascotas
 * look like. Guessing the other seven here would be inventing drawings the
 * design has not made, and `icon.test.tsx` refuses that on purpose — it asserts
 * the icon set is exactly the set the canvas draws. The third drawing, the
 * arrow, belongs to income, which is not a Category at all (`incomeMark`).
 *
 * Here beside `categoryLabel` rather than in `@/ui`, because it is the same
 * kind of answer that function gives — what this Category is to a person — and
 * because the keys are the shipped catalogue's own slugs. A component library
 * that knew those would be one that knows what a Space ships with.
 */
const DRAWN: Readonly<Record<string, CategoryMark>> = {
  food: iconMark("cart", "green"),
  transport: iconMark("car", "grey"),
};

/**
 * How one Category is drawn on the month's list: an icon where the canvas drew
 * one, and the Category's own letter everywhere else.
 *
 * The letter is the answer to the question this exists for. Two of the nine
 * shipped headings are drawn and a Category a Member typed can never be — there
 * is no glyph for "Ahorro" and there never will be — so the unmapped case is
 * the ordinary one rather than an edge of it. One shared glyph would draw five
 * of somebody's own Categories identically; a letter takes the width of a
 * signal and mostly carries one. Mostly, and not always: "Ocio" and "Otros"
 * both come out as a grey O, and that collision is the honest cost of not
 * inventing drawings. It is a far smaller collision than one glyph for all.
 *
 * Keyed by `slug`, the only stable name a Category has: the shipped rows carry
 * one and the rows a Member typed never do (`categories_shipped_or_typed`). It
 * is deliberately not keyed by the translated name, which changes the day a
 * second language lands.
 *
 * A subcategory falls back to its heading's slug, so `food.groceries` is drawn
 * as `food`: a subcategory is the same shape of spending as what it sits under,
 * and fourteen more rows in the map would say that fourteen times and go stale
 * the day the seed migration gains a fifteenth.
 */
export function categoryMark(slug: string | null, name: string): CategoryMark {
  if (slug === null) return letterMark(name);

  // `split` on a string always yields at least one element, so the fallback is
  // unreachable: it is here because `noUncheckedIndexedAccess` types the first
  // element as possibly missing. Written out rather than asserted away, so the
  // day somebody indexes this differently the compiler is still holding it.
  const heading = slug.split(".")[0] ?? slug;

  return DRAWN[heading] ?? letterMark(name);
}

/**
 * The mark money coming in wears.
 *
 * Named apart from the map above because income is not a Category and carries
 * none (ADR-0016) — there is no slug to look it up by, and adding a fake one to
 * `DRAWN` would put a row in the catalogue's map that the catalogue does not
 * have. It is here rather than in the screen for the reason the map is: what a
 * row on the money list is drawn as is decided in one place.
 */
export const incomeMark: CategoryMark = iconMark("arrow-up", "green");

/** A Category as a screen shows it: an identifier and the name beside it. */
export type ReadableCategory = {
  id: string;
  name: string;
  /** Whether this Space's own Members put it there, or the product did. */
  own: boolean;
  /**
   * What is drawn in the circle at the start of its row (#39).
   *
   * Decided here, beside the name, because it is the same kind of answer: what
   * this Category is to a person. A screen that worked it out for itself would
   * be a second answer to that, and two screens showing money would eventually
   * draw one Category two ways -- the reason `namesFrom` exists at all.
   */
  mark: CategoryMark;
};

export type ReadableBranch = ReadableCategory & {
  children: readonly ReadableCategory[];
};

/**
 * A Space's catalogue in the order it is read: by name, headings and what they
 * hold alike.
 *
 * The order belongs here rather than in the query or the domain, because it is
 * decided by the names — and a shipped Category's name is a translation that
 * neither of those can see. Alphabetical and not curated: a catalogue a person
 * extends is one whose order nobody maintains, and a name is the only thing a
 * thumb can predict the position of.
 */
export function readableCatalogue(
  branches: readonly CategoryBranch[],
): readonly ReadableBranch[] {
  return branches
    .map((branch) => ({
      ...readable(branch.category),
      children: branch.children.map(readable).sort(byName),
    }))
    .sort(byName);
}

function readable(category: CategoryBranch["category"]): ReadableCategory {
  const name = categoryLabel(category.label);

  return {
    id: category.id,
    name,
    own: category.spaceId !== null,
    // The slug where there is one, and the name either way: the map is keyed
    // by slug, and the letter it falls back to has to be the letter of the
    // word the reader is looking at rather than of the key underneath it.
    mark: categoryMark(
      category.label.kind === "catalogue" ? category.label.slug : null,
      name,
    ),
  };
}

const byName = (a: ReadableCategory, b: ReadableCategory) =>
  inReadingOrder(a.name, b.name);
