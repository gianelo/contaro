import { and, eq } from "drizzle-orm";
import {
  acceptInvitation,
  declineInvitation,
  invitationsAddressedTo,
  inviteToSpace,
  isInvitationStatus,
  normaliseEmail,
  pendingInvitations,
  revokeInvitation,
  type Invitation,
  type PendingInvitation,
  type WaitingInvitation,
} from "@/domain/space/invitation";
import { isCurrencyCode } from "@/domain/money/currency";
import type { Space } from "@/domain/space/space";
import type { Connection } from "./connection";
import { members, spaceInvitations, spaceMembers, spaces } from "./schema";

type Database = Connection["db"];

/** Exactly the columns a domain `Invitation` is made of. */
const invitationColumns = {
  id: spaceInvitations.id,
  spaceId: spaceInvitations.spaceId,
  email: spaceInvitations.email,
  invitedBy: spaceInvitations.invitedBy,
  status: spaceInvitations.status,
};

type InvitationRow = {
  id: string;
  spaceId: string;
  email: string;
  invitedBy: string;
  status: string;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Offers a Space's second seat to an address.
 *
 * The rows every rule is decided over are fetched first and the domain decides
 * all of them: whether the sender is really inside, whether the address is one,
 * whether the seat is free. This only fetches and writes the answer.
 *
 * The Space arrives as an argument rather than an identifier because every
 * caller has already been handed one by `findSpaceForMember`, which is what
 * proved the membership in the first place.
 */
export async function inviteToSpaceByEmail(
  db: Database,
  inviting: { space: Space; invitedBy: string },
  email: string,
): Promise<Invitation> {
  const [seated, pending] = await Promise.all([
    db
      .select({ id: members.id, email: members.email })
      .from(spaceMembers)
      .innerJoin(members, eq(members.id, spaceMembers.memberId))
      .where(eq(spaceMembers.spaceId, inviting.space.id)),
    pendingIn(db, inviting.space.id),
  ]);

  const checked = inviteToSpace(
    { spaceId: inviting.space.id, email },
    {
      space: inviting.space,
      invitedBy: inviting.invitedBy,
      memberIds: seated.map((member) => member.id),
      memberEmails: seated.map((member) => member.email),
      pending,
    },
  );

  const [created] = await db
    .insert(spaceInvitations)
    .values(checked)
    .returning(invitationColumns);

  if (!created) {
    throw new Error("Inserting the invitation returned no row.");
  }

  return asInvitation(created);
}

/**
 * What a Space's own screen shows: the seat it has offered and who offered it.
 *
 * The membership rule is not asked here, for the reason `membersOfSpace` does
 * not ask it: every caller has already been handed a `Space`, which is what
 * proved it.
 */
export async function pendingInvitationsInSpace(
  db: Database,
  spaceId: string,
): Promise<readonly PendingInvitation[]> {
  const rows = await db
    .select({ ...invitationColumns, invitedByName: members.name })
    .from(spaceInvitations)
    .innerJoin(members, eq(members.id, spaceInvitations.invitedBy))
    .where(eq(spaceInvitations.spaceId, spaceId))
    .orderBy(spaceInvitations.createdAt);

  // Filtered by the domain and not by a WHERE clause, the way membership is:
  // a query that ever loosens is caught here rather than showing a Space a
  // seat it does not actually have on offer.
  return stillOpen(
    rows.map((row) => ({
      invitation: asInvitation(row),
      invitedByName: row.invitedByName,
    })),
  );
}

/**
 * The entries whose Invitation is still holding a seat.
 *
 * The domain decides which those are (`pendingInvitations`), and it is asked
 * over the entries rather than over bare Invitations so that the name and the
 * Space fetched alongside each row come back attached. Filtering the
 * Invitations and then looking their rows up again would be the same join
 * walked twice, in two readers, for an answer the first walk already had.
 */
function stillOpen<Entry extends { invitation: Invitation }>(
  entries: readonly Entry[],
): readonly Entry[] {
  const open = new Set(
    pendingInvitations(entries.map((entry) => entry.invitation)).map(
      (invitation) => invitation.id,
    ),
  );

  return entries.filter((entry) => open.has(entry.invitation.id));
}

/**
 * The Invitations waiting for a Member, each with the Space it opens.
 *
 * This is the one place a person is shown a Space they are not in, and the
 * only thing that makes it theirs to see is that their own verified address is
 * the one written on the row. So the address is read off the Member's record
 * and the domain does the matching (`invitationsAddressedTo`) — never a
 * WHERE clause built from something a request carried.
 */
export async function invitationsWaitingFor(
  db: Database,
  memberId: string,
): Promise<readonly WaitingInvitation[]> {
  const [member] = await db
    .select({ email: members.email })
    .from(members)
    .where(eq(members.id, memberId))
    .limit(1);

  if (!member) return [];

  const rows = await db
    .select({
      ...invitationColumns,
      invitedByName: members.name,
      spaceName: spaces.name,
      spaceCurrency: spaces.currency,
    })
    .from(spaceInvitations)
    .innerJoin(members, eq(members.id, spaceInvitations.invitedBy))
    .innerJoin(spaces, eq(spaces.id, spaceInvitations.spaceId))
    // Through `normaliseEmail` and never a `.toLowerCase()` typed here: the
    // domain owns what one shape means, and a second hand-written copy of it
    // is a copy that stops agreeing the day the rule changes. The domain then
    // decides the same question again over the rows this narrowed to.
    .where(eq(spaceInvitations.email, normaliseEmail(member.email)))
    .orderBy(spaceInvitations.createdAt);

  const entries = rows.map((row) => ({
    invitation: asInvitation(row),
    invitedByName: row.invitedByName,
    space: asSpace({
      id: row.spaceId,
      name: row.spaceName,
      currency: row.spaceCurrency,
    }),
  }));

  const mine = new Set(
    invitationsAddressedTo(
      member.email,
      entries.map((entry) => entry.invitation),
    ).map((invitation) => invitation.id),
  );

  return entries.filter((entry) => mine.has(entry.invitation.id));
}

/**
 * A Member takes the seat they were offered, and the Space becomes theirs.
 *
 * The two writes are one act, the way creating a Space and seating its creator
 * are: an Invitation marked accepted whose membership row never landed is a
 * seat nobody holds and nobody can offer again.
 *
 * No such Invitation rather than forbidden, the way `findSpaceForMember`
 * refuses: one addressed to somebody else must read exactly like one that
 * never existed, or holding the identifier buys something.
 */
export async function acceptInvitationAsMember(
  db: Database,
  memberId: string,
  invitationId: string,
): Promise<Space | null> {
  const found = await mine(db, memberId, invitationId);
  if (!found) return null;

  const { invitation, email } = found;

  const seated = await db
    .select({ memberId: spaceMembers.memberId })
    .from(spaceMembers)
    .where(eq(spaceMembers.spaceId, invitation.spaceId));

  const accepted = acceptInvitation(invitation, {
    memberId,
    email,
    memberIds: seated.map((row) => row.memberId),
  });

  const [space] = await db
    .select({ id: spaces.id, name: spaces.name, currency: spaces.currency })
    .from(spaces)
    .where(eq(spaces.id, invitation.spaceId))
    .limit(1);

  if (!space) return null;

  try {
    await db.transaction(async (tx) => {
      // Conditional on the row still being pending, so two requests racing to
      // accept the same Invitation cannot both go on to insert a membership.
      // The domain checked the same thing a moment ago; this is what makes the
      // check and the write one act instead of two.
      const written = await tx
        .update(spaceInvitations)
        .set({ status: accepted.status, resolvedAt: new Date() })
        .where(
          and(
            eq(spaceInvitations.id, accepted.id),
            eq(spaceInvitations.status, "pending"),
          ),
        )
        .returning({ id: spaceInvitations.id });

      // Somebody got here first -- the other Member withdrew it, or a second
      // tap landed. Thrown rather than returned, because the membership below
      // must not be written, and a transaction is undone by throwing.
      if (written.length === 0) {
        throw new AlreadyAnswered();
      }

      await tx
        .insert(spaceMembers)
        .values({ spaceId: accepted.spaceId, memberId });
    });
  } catch (error) {
    // An Invitation somebody else already answered is no Invitation, which is
    // what the screen says: "esa invitación ya no está". Reported as a failure
    // instead, it would tell a person who was accepting that we could not send
    // an invitation -- wrong about the act and wrong about the cause.
    if (error instanceof AlreadyAnswered) return null;
    throw error;
  }

  return asSpace(space);
}

/** Not a failure and never shown: see the catch above. */
class AlreadyAnswered extends Error {}

/** The person invited says no, and the Space's seat is free again. */
export async function declineInvitationAsMember(
  db: Database,
  memberId: string,
  invitationId: string,
): Promise<boolean> {
  const found = await mine(db, memberId, invitationId);
  if (!found) return false;

  const declined = declineInvitation(found.invitation, { email: found.email });

  return answered(db, declined);
}

/**
 * The Space takes an Invitation back — a mistyped address, or a change of mind.
 *
 * Any Member may do it, which is the domain's rule and not this module's; what
 * this adds is that the Invitation has to belong to the Space that was proved.
 */
export async function revokeInvitationInSpace(
  db: Database,
  space: Space,
  by: string,
  invitationId: string,
): Promise<boolean> {
  if (!UUID.test(invitationId)) return false;

  const [row] = await db
    .select(invitationColumns)
    .from(spaceInvitations)
    .where(
      and(
        eq(spaceInvitations.id, invitationId),
        eq(spaceInvitations.spaceId, space.id),
      ),
    )
    .limit(1);

  if (!row) return false;

  const seated = await db
    .select({ memberId: spaceMembers.memberId })
    .from(spaceMembers)
    .where(eq(spaceMembers.spaceId, space.id));

  const revoked = revokeInvitation(asInvitation(row), {
    memberIds: seated.map((member) => member.memberId),
    by,
  });

  return answered(db, revoked);
}

/**
 * An Invitation stops being pending, if nobody got there first.
 *
 * Conditional on the status it was read at, so the last write does not quietly
 * overwrite the first: two taps on "no" leave one answer, and a "no" arriving
 * after a "yes" changes nothing at all.
 */
async function answered(
  db: Database,
  invitation: Invitation,
): Promise<boolean> {
  const rows = await db
    .update(spaceInvitations)
    .set({ status: invitation.status, resolvedAt: new Date() })
    .where(
      and(
        eq(spaceInvitations.id, invitation.id),
        eq(spaceInvitations.status, "pending"),
      ),
    )
    .returning({ id: spaceInvitations.id });

  return rows.length > 0;
}

/**
 * The Invitation with this identifier, if it is really addressed to this
 * Member — and their own address, which is what said so.
 */
async function mine(
  db: Database,
  memberId: string,
  invitationId: string,
): Promise<{ invitation: Invitation; email: string } | null> {
  if (!UUID.test(invitationId)) return null;

  const [member] = await db
    .select({ email: members.email })
    .from(members)
    .where(eq(members.id, memberId))
    .limit(1);

  if (!member) return null;

  const [row] = await db
    .select(invitationColumns)
    .from(spaceInvitations)
    .where(eq(spaceInvitations.id, invitationId))
    .limit(1);

  if (!row) return null;

  const [addressed] = invitationsAddressedTo(member.email, [asInvitation(row)]);

  return addressed ? { invitation: addressed, email: member.email } : null;
}

/** The Invitations of a Space that are still holding its seat. */
async function pendingIn(
  db: Database,
  spaceId: string,
): Promise<readonly Invitation[]> {
  const rows = await db
    .select(invitationColumns)
    .from(spaceInvitations)
    .where(eq(spaceInvitations.spaceId, spaceId));

  return invitationsAddressedToNobodyInParticular(rows.map(asInvitation));
}

/**
 * The pending ones, whoever they are for.
 *
 * `invitationsAddressedTo` answers "is this one mine", which is the question
 * a reader asks. A Space asks a different one — "what have I got out on
 * offer" — and the address is not part of it.
 */
function invitationsAddressedToNobodyInParticular(
  invitations: readonly Invitation[],
): readonly Invitation[] {
  return invitations.filter((invitation) => invitation.status === "pending");
}

/**
 * The status column is text, because the set of words belongs to the domain
 * and not to a database type. A row holding something outside that set can only
 * come from a write that went round the domain and round the check in
 * migration 0006, and treating it as pending would offer a seat twice.
 */
function asInvitation(row: InvitationRow): Invitation {
  if (!isInvitationStatus(row.status)) {
    throw new Error(
      `Invitation ${row.id} is "${row.status}", which is not something an invitation can be.`,
    );
  }

  return {
    id: row.id,
    spaceId: row.spaceId,
    email: row.email,
    invitedBy: row.invitedBy,
    status: row.status,
  };
}

/** The same refusal `spaces.ts` makes, for the same reason. */
function asSpace(row: { id: string; name: string; currency: string }): Space {
  if (!isCurrencyCode(row.currency)) {
    throw new Error(
      `Space ${row.id} is stored in "${row.currency}", which is not a currency contaro offers.`,
    );
  }

  return { id: row.id, name: row.name, currency: row.currency };
}
