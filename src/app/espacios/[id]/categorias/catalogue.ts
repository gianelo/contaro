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
