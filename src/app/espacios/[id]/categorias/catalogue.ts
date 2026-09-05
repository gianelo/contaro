import { database } from "@/db/client";
import { catalogueForSpace } from "@/db/categories";
import { readableCatalogue, type ReadableBranch } from "@/i18n/category";
import type { CategoryMark } from "@/ui/category-mark";

/**
 * A Space's catalogue as its screens read it: the rows, arranged, named and
 * put in the order a Spanish reader expects.
 *
 * One place because both screens need the same answer -- the catalogue shows
 * it and the form offers its headings as somewhere to add to -- and a form
 * offering headings the catalogue does not show is a person choosing something
 * that is not there.
 */
export async function readableCatalogueFor(
  spaceId: string,
): Promise<readonly ReadableBranch[]> {
  return readableCatalogue(await catalogueForSpace(database(), spaceId));
}

/**
 * How each Category is named on a row, by its identifier.
 *
 * Beside `readableCatalogueFor` because it is the same answer read the other
 * way round: the catalogue screen walks the branches, and every screen that
 * shows money looks a Category up by the id on the row. Said once, so the
 * month's list and the month's plan can never name one Category two ways.
 */
export function namesFrom(catalogue: readonly ReadableBranch[]): Naming {
  const named = new Map<string, Named>();

  for (const branch of catalogue) {
    named.set(branch.id, {
      name: branch.name,
      heading: null,
      mark: branch.mark,
    });
    for (const child of branch.children) {
      named.set(child.id, {
        name: child.name,
        heading: branch.name,
        mark: child.mark,
      });
    }
  }

  return named;
}

/**
 * A Category's name, the heading it sits under, and what it is drawn as.
 *
 * The mark rides along with the name rather than being looked up separately,
 * because a row has only an identifier: two lookups would be two chances for a
 * screen to name one Category and draw another (#39).
 */
type Named = {
  name: string;
  heading: string | null;
  mark: CategoryMark;
};

/** A Category's name and the heading it sits under, by identifier. */
export type Naming = ReadonlyMap<string, Named>;
