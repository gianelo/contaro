import { eq, inArray } from "drizzle-orm";
import {
  spaceVisibleTo,
  spacesVisibleTo,
  type SpaceMember,
  type SpaceWithMembers,
} from "@/domain/space/access";
import { createSpace, type Space } from "@/domain/space/space";
import { isCurrencyCode } from "@/domain/money/currency";
import type { Connection } from "./connection";
import { members, spaceMembers, spaces } from "./schema";

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

/**
 * Every Space a Member may open, oldest membership first, each with everyone
 * its row names.
 *
 * The membership rule is asked twice on purpose. The query narrows to the
 * Spaces this Member has a row in — a list cannot read the whole table and
 * filter afterwards — and the domain then decides, on Spaces whose Members were
 * fetched in full, which of them are really theirs. A join that ever loosens
 * is caught by the second gate rather than quietly handing over someone
 * else's money.
 */
export async function listSpacesForMember(
  db: Database,
  memberId: string,
): Promise<readonly SpaceWithMembers[]> {
  const mine = await db
    .select({ spaceId: spaceMembers.spaceId })
    .from(spaceMembers)
    .where(eq(spaceMembers.memberId, memberId))
    // The order a person joined them, which is stable: alphabetical would move
    // a row under their thumb the day a Space is renamed.
    .orderBy(spaceMembers.joinedAt, spaceMembers.spaceId);

  if (mine.length === 0) return [];

  const ids = mine.map((row) => row.spaceId);

  const [rows, memberships] = await Promise.all([
    db.select(spaceColumns).from(spaces).where(inArray(spaces.id, ids)),
    db
      .select({
        spaceId: spaceMembers.spaceId,
        memberId: members.id,
        name: members.name,
      })
      .from(spaceMembers)
      .innerJoin(members, eq(members.id, spaceMembers.memberId))
      .where(inArray(spaceMembers.spaceId, ids))
      // The creator first, then whoever was invited after them (#9).
      .orderBy(spaceMembers.joinedAt, members.id),
  ]);

  const byId = new Map(rows.map((row) => [row.id, row]));
  const membersOf = new Map<string, SpaceMember[]>();
  for (const entry of memberships) {
    const group = membersOf.get(entry.spaceId) ?? [];
    group.push({ id: entry.memberId, name: entry.name });
    membersOf.set(entry.spaceId, group);
  }

  const listed = ids.flatMap((id) => {
    const row = byId.get(id);
    return row
      ? [{ space: asSpace(row), members: membersOf.get(id) ?? [] }]
      : [];
  });

  return spacesVisibleTo(memberId, listed);
}
