import { database } from "@/db/client";
import { catalogueForSpace } from "@/db/categories";
import { readableCatalogue, type ReadableBranch } from "@/i18n/category";

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
  const named = new Map<string, { name: string; heading: string | null }>();

  for (const branch of catalogue) {
    named.set(branch.id, { name: branch.name, heading: null });
    for (const child of branch.children) {
      named.set(child.id, { name: child.name, heading: branch.name });
    }
  }

  return named;
}

/** A Category's name and the heading it sits under, by identifier. */
export type Naming = ReadonlyMap<
  string,
  { name: string; heading: string | null }
>;
