import { eq } from "drizzle-orm";
import { spaceVisibleTo } from "@/domain/space/access";
import { createSpace, type Space } from "@/domain/space/space";
import { isCurrencyCode } from "@/domain/money/currency";
import type { Connection } from "./connection";
import { spaceMembers, spaces } from "./schema";

type Database = Connection["db"];

/** Exactly the columns a domain `Space` is made of. */
const spaceColumns = {
  id: spaces.id,
  name: spaces.name,
  currency: spaces.currency,
};

/**
 * Creates a Space and puts its creator inside it, in one transaction.
 *
 * The two writes are one act: a Space whose membership row never landed is a
 * Space nobody can open and nobody can delete, which is worse than no Space at
 * all. What the Space is, and that its creator is a Member of it, is decided by
 * the domain; this only writes down the answer.
 */
export async function createSpaceForMember(
  db: Database,
  creatorId: string,
  draft: { name: string; currency: string },
): Promise<Space> {
  const { space, memberIds } = createSpace(draft, creatorId);

  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(spaces)
      .values(space)
      .returning(spaceColumns);

    if (!created) {
      throw new Error("Inserting the Space returned no row.");
    }

    await tx.insert(spaceMembers).values(
      memberIds.map((memberId) => ({ spaceId: created.id, memberId })),
    );

    return asSpace(created);
  });
}

/**
 * The Space behind an identifier, if the Member asking is in it.
 *
 * The membership rule is not a WHERE clause: the rows are fetched and the
 * domain decides (see `spaceVisibleTo`). A Space someone is not in comes back
 * as no Space at all, so nothing distinguishes "not yours" from "no such
 * thing".
 */
export async function findSpaceForMember(
  db: Database,
  spaceId: string,
  memberId: string,
): Promise<Space | null> {
  // An id from a URL is any string at all, and Postgres refuses a malformed
  // uuid with an error rather than an empty result. No such Space is the honest
  // answer, and it is not the domain's business what a uuid looks like.
  if (!UUID.test(spaceId)) return null;

  const [row] = await db
    .select(spaceColumns)
    .from(spaces)
    .where(eq(spaces.id, spaceId))
    .limit(1);

  if (!row) return null;

  const membership = await db
    .select({ memberId: spaceMembers.memberId })
    .from(spaceMembers)
    .where(eq(spaceMembers.spaceId, spaceId));

  return spaceVisibleTo(
    memberId,
    asSpace(row),
    membership.map((row) => row.memberId),
  );
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The currency column is text, because the set of codes belongs to the domain
 * and not to a database type. A row holding something outside that set can only
 * come from a write that went round the domain, and rendering it would put a
 * figure on screen in a money nobody can name.
 */
function asSpace(row: { id: string; name: string; currency: string }): Space {
  if (!isCurrencyCode(row.currency)) {
    throw new Error(
      `Space ${row.id} is stored in "${row.currency}", which is not a currency contaro offers.`,
    );
  }

  return { id: row.id, name: row.name, currency: row.currency };
}
