import { eq, isNull, or } from "drizzle-orm";
import {
  addCategory,
  categoriesVisibleTo,
  catalogueFor,
  type Category,
  type CategoryBranch,
  type NewCategory,
} from "@/domain/category/category";
import type { Connection } from "./connection";
import { categories } from "./schema";

type Database = Connection["db"];

/** Exactly the columns a domain `Category` is made of. */
const categoryColumns = {
  id: categories.id,
  spaceId: categories.spaceId,
  parentId: categories.parentId,
  slug: categories.slug,
  name: categories.name,
};

/**
 * The rows a Space is allowed to see: the shipped catalogue and its own.
 *
 * Said once and used by both readers. It is the privacy rule "#6" rests on,
 * and written twice it is a rule one loosening edit can half-undo -- the
 * catalogue would keep someone else's Category out while the form let one in.
 */
const visibleToSpace = (spaceId: string) =>
  or(isNull(categories.spaceId), eq(categories.spaceId, spaceId));

type CategoryRow = {
  id: string;
  spaceId: string | null;
  parentId: string | null;
  slug: string | null;
  name: string | null;
};

/**
 * A Space's catalogue: the Categories shipped with the product and the ones
 * its own Members added, arranged into the two levels a person browses.
 *
 * The visibility rule is asked twice on purpose, the way `listSpacesForMember`
 * asks it twice. The query narrows to the global rows plus this Space's — a
 * catalogue cannot read every Space's Categories and filter afterwards — and
 * the domain then decides which of them are really this Space's. A WHERE
 * clause that ever loosens is caught by the second gate rather than quietly
 * showing one couple another's private naming.
 */
export async function catalogueForSpace(
  db: Database,
  spaceId: string,
): Promise<readonly CategoryBranch[]> {
  const rows = await db
    .select(categoryColumns)
    .from(categories)
    .where(visibleToSpace(spaceId))
    // Deterministic, and nothing more: what order a person reads the catalogue
    // in depends on the names, which are translations this layer cannot see.
    // `readableCatalogue` sorts what is shown, where the names exist.
    .orderBy(categories.createdAt, categories.id);

  return catalogueFor(spaceId, rows.map(asCategory));
}

/**
 * Adds a Category to a Space, if the Space's catalogue can hold it there.
 *
 * The catalogue is read first because every rule about the new Category is
 * about that catalogue: whether the heading it would go under is one this
 * Space has, whether that heading is already under one itself, whether the
 * name is free where it is going. The domain decides all three; this only
 * fetches the rows it decides over and writes down the answer.
 */
export async function addCategoryToSpace(
  db: Database,
  draft: NewCategory,
): Promise<Category> {
  const visible = await db
    .select(categoryColumns)
    .from(categories)
    .where(visibleToSpace(draft.spaceId));

  const checked = addCategory(draft, visible.map(asCategory));

  const [created] = await db
    .insert(categories)
    .values({
      spaceId: checked.spaceId,
      parentId: checked.parentId,
      name: checked.name,
    })
    .returning(categoryColumns);

  if (!created) {
    throw new Error("Inserting the Category returned no row.");
  }

  return asCategory(created);
}

/**
 * `slug` and `name` are exclusive by a check constraint, and this is what turns
 * that into the two kinds the domain reasons about. A row holding both or
 * neither could only come from a write that went round the constraint, and
 * guessing which half to believe would put a Category on screen under a name
 * nobody chose.
 */
function asCategory(row: CategoryRow): Category {
  if (row.spaceId === null) {
    if (row.slug === null) {
      throw new Error(
        `Category ${row.id} belongs to no Space and has no slug to be named by.`,
      );
    }
    return {
      id: row.id,
      spaceId: null,
      parentId: row.parentId,
      label: { kind: "catalogue", slug: row.slug },
    };
  }

  if (row.name === null) {
    throw new Error(`Category ${row.id} is in a Space and has no name.`);
  }

  return {
    id: row.id,
    spaceId: row.spaceId,
    parentId: row.parentId,
    label: { kind: "own", name: row.name },
  };
}

/**
 * Every Category a Space may file or plan money against.
 *
 * Read whole and narrowed by `categoriesVisibleTo`, so "a Category added in
 * one Space is invisible from another" is answered here exactly as the domain
 * answers it -- and the domain is handed the rows to decide over rather than a
 * query it has to trust.
 *
 * One place because both writers need the same answer: a Movement is filed
 * under one of these (#7) and a Budget item plans against one of these (#10),
 * and two readings of "what can this Space see" would eventually disagree.
 */
export async function categoriesTheSpaceCanSee(
  db: Database,
  spaceId: string,
): Promise<readonly Category[]> {
  const rows = await db
    .select({
      id: categories.id,
      spaceId: categories.spaceId,
      parentId: categories.parentId,
      slug: categories.slug,
      name: categories.name,
    })
    .from(categories);

  return categoriesVisibleTo(spaceId, rows.map(asVisibleCategory));
}

/**
 * The same row, read for its identifier alone rather than for its name.
 *
 * Deliberately without the throwing `asCategory` above does: these rows answer
 * "may this Space put money against this Category", and a contradictory one
 * cannot be chosen anyway -- it fails the same visibility test as any other,
 * and the catalogue's own reader is where it is refused loudly. Throwing here
 * would take a Movement screen down over a row nobody was going to pick.
 */
function asVisibleCategory(row: {
  id: string;
  spaceId: string | null;
  parentId: string | null;
  slug: string | null;
  name: string | null;
}): Category {
  return {
    id: row.id,
    spaceId: row.spaceId,
    parentId: row.parentId,
    label:
      row.spaceId === null
        ? { kind: "catalogue", slug: row.slug ?? "" }
        : { kind: "own", name: row.name ?? "" },
  };
}
