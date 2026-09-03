import type {
  CategoryBranch,
  CategoryLabel,
} from "@/domain/category/category";
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

/** A Category as a screen shows it: an identifier and the name beside it. */
export type ReadableCategory = {
  id: string;
  name: string;
  /** Whether this Space's own Members put it there, or the product did. */
  own: boolean;
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
  return {
    id: category.id,
    name: categoryLabel(category.label),
    own: category.spaceId !== null,
  };
}

const byName = (a: ReadableCategory, b: ReadableCategory) =>
  inReadingOrder(a.name, b.name);
