/**
 * A Category: the bucket a Movement is classified under (see CONTEXT.md).
 *
 * Every Space sees one catalogue, made of two kinds of row that read as one
 * list. A global Category belongs to no Space and is shipped with the product;
 * a Space's own Category was typed by one of its Members and never leaves it.
 * Which of the two a row is decides how it is named, which is why the name is
 * a `CategoryLabel` and not a string: a shipped Category is translated like
 * every other piece of copy, and one a person typed is shown exactly as typed.
 */

export type CategoryLabel =
  /** Shipped with the product. `slug` is the key its name is translated by. */
  | { kind: "catalogue"; slug: string }
  /** Typed by a Member of one Space, in whatever words they chose. */
  | { kind: "own"; name: string };

export type Category = {
  id: string;
  /** The Space it belongs to, or null for the global catalogue. */
  spaceId: string | null;
  parentId: string | null;
  label: CategoryLabel;
};

/**
 * The Categories a Space may use, out of whatever was handed in.
 *
 * The rule this exists for is "a Category added in one Space is invisible from
 * another", and it is a rule of the model rather than a WHERE clause, for the
 * same reason `spaceVisibleTo` is: a query that ever loosens would hand one
 * couple's private naming to another, and a rule that only a query knows about
 * is a rule that survives until the second query.
 *
 * The order given is the order kept: which Category comes first is a question
 * about how they were fetched, not a rule of the model.
 */
export function categoriesVisibleTo(
  spaceId: string,
  categories: readonly Category[],
): readonly Category[] {
  return categories.filter(
    (category) => category.spaceId === null || category.spaceId === spaceId,
  );
}

/**
 * One Category and whatever it holds — a row of the browsable catalogue.
 *
 * Two levels and no more: "food" holds "groceries", and "groceries" holds
 * nothing. A Budget on a parent covers its whole subtree (ADR-0021, and
 * `comparedToPlan` is where that is said), and a tree of unbounded depth
 * turns that into a walk nobody can picture while looking at a phone.
 * `addCategory` is what keeps the depth true.
 */
export type CategoryBranch = {
  category: Category;
  children: readonly Category[];
};

/**
 * A Space's catalogue as it is read: the Categories it may use, each carrying
 * the subcategories under it.
 *
 * Visibility is decided by `categoriesVisibleTo` rather than beside it, so a
 * Category invisible to this Space cannot arrive here as somebody's child.
 */
export function catalogueFor(
  spaceId: string,
  categories: readonly Category[],
): readonly CategoryBranch[] {
  const visible = categoriesVisibleTo(spaceId, categories);
  const held = new Set(visible.map((category) => category.id));

  // This arranges whatever rows it is handed, and a caller may hand it a part
  // of a catalogue rather than all of it -- #7's picker will. A Category whose
  // heading is not among them stands on its own rather than disappearing,
  // because a Category off the screen is money nobody can record.
  const headingOf = (category: Category) =>
    category.parentId !== null && held.has(category.parentId)
      ? category.parentId
      : null;

  const children = new Map<string, Category[]>();
  for (const category of visible) {
    const heading = headingOf(category);
    if (heading === null) continue;
    children.set(heading, [...(children.get(heading) ?? []), category]);
  }

  return visible
    .filter((category) => headingOf(category) === null)
    .map((category) => ({
      category,
      children: children.get(category.id) ?? [],
    }));
}

/** A Category a Member has asked for, before it exists and has an id. */
export type NewCategory = {
  spaceId: string;
  parentId: string | null;
  name: string;
};

/** Long enough for "Regalos y cumpleaños", short enough to fit a row. */
export const MAX_CATEGORY_NAME_LENGTH = 40;

/**
 * Thrown when a Category cannot be added as asked. `field` says which answer
 * was the bad one, so a screen can point at the input rather than showing one
 * apology for a form of two.
 */
export class UnusableCategoryError extends Error {
  readonly field: "name" | "parent" | "space";

  constructor(field: "name" | "parent" | "space", reason: string) {
    super(`This Category cannot be added: ${reason}.`);
    this.name = "UnusableCategoryError";
    this.field = field;
  }
}

/**
 * What a Member adds to their Space's catalogue, checked against what that
 * Space can already see.
 *
 * The whole catalogue arrives as an argument rather than being looked up,
 * because every rule here is about the shape of that catalogue — the parent
 * has to be in it, the parent has to be a heading rather than already under
 * one, and the name has to be new where it is going. Deciding those against
 * rows handed in is what lets them be driven in milliseconds.
 */
export function addCategory(
  draft: NewCategory,
  categories: readonly Category[],
): NewCategory {
  const spaceId = draft.spaceId.trim();
  if (spaceId === "") {
    // No Space means the global catalogue, which is shipped with the product.
    // Nothing a person types may reach every other Space in it.
    throw new UnusableCategoryError("space", "it names no Space to live in");
  }

  const visible = categoriesVisibleTo(spaceId, categories);
  const parentId = parent(draft.parentId, visible);
  const name = categoryName(draft.name, parentId, visible);

  return { spaceId, parentId, name };
}

function parent(
  proposed: string | null,
  visible: readonly Category[],
): string | null {
  if (proposed === null) return null;

  const found = visible.find((category) => category.id === proposed);

  // Not found covers both "no such Category" and "one this Space cannot see":
  // the second is the first as far as this Space is concerned, and saying
  // otherwise would confirm that another Space's Category exists.
  if (!found) {
    throw new UnusableCategoryError(
      "parent",
      "the Category it would go under is not one this Space has",
    );
  }
  if (found.parentId !== null) {
    throw new UnusableCategoryError(
      "parent",
      "a subcategory cannot hold subcategories of its own",
    );
  }

  return proposed;
}

function categoryName(
  proposed: string,
  parentId: string | null,
  visible: readonly Category[],
): string {
  const name = proposed.trim();

  if (name === "") {
    throw new UnusableCategoryError("name", "it has no name");
  }
  if (name.length > MAX_CATEGORY_NAME_LENGTH) {
    throw new UnusableCategoryError(
      "name",
      `its name is longer than ${MAX_CATEGORY_NAME_LENGTH} characters`,
    );
  }

  // Only against what this Space's own Members typed. A shipped Category is
  // named by a translation the domain cannot read, so a collision with one is
  // not a question that can be asked here — and "Comida" beside the catalogue's
  // own is a smaller surprise than two rows a person typed the same name into.
  const taken = visible.some(
    (category) =>
      category.parentId === parentId &&
      category.label.kind === "own" &&
      category.label.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
  );

  if (taken) {
    throw new UnusableCategoryError(
      "name",
      `this Space already has a Category called "${name}" there`,
    );
  }

  return name;
}
