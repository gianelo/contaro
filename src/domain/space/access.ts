import type { Space } from "./space";

/**
 * Whether a Member may open a Space is a rule of the model, not a WHERE clause
 * (see the seams in #1). The rows arrive as arguments and the answer is decided
 * here, so the rule is driven by tests in milliseconds and cannot be undone by
 * a query written elsewhere.
 */
export function spaceVisibleTo(
  memberId: string,
  space: Space,
  memberIds: readonly string[],
): Space | null {
  // A Space is invisible rather than forbidden: telling someone a Space exists
  // but is not theirs is already telling them something about it.
  return memberIds.includes(memberId) ? space : null;
}

/** A Member as a Space's row names them: who they are, not how they signed in. */
export type SpaceMember = {
  id: string;
  name: string;
};

/**
 * A Space and everyone in it — one row of the list a Member lands on.
 *
 * Everyone, not the part that concerns the reader: the row exists so a person
 * can tell the shared Space from the personal one before opening either, and
 * it cannot do that while it only names them.
 */
export type SpaceWithMembers = {
  space: Space;
  members: readonly SpaceMember[];
};

/**
 * The Spaces a Member may open, out of whatever was handed in.
 *
 * The order given is the order kept: which Space comes first is a question
 * about how they were fetched, not a rule of the model, so this does not
 * invent an answer to it.
 */
export function spacesVisibleTo(
  memberId: string,
  spaces: readonly SpaceWithMembers[],
): readonly SpaceWithMembers[] {
  // Decided by `spaceVisibleTo` rather than beside it: one Space and many
  // Spaces are the same question asked twice, and two answers to it would
  // eventually disagree.
  return spaces.filter(
    (listed) =>
      spaceVisibleTo(
        memberId,
        listed.space,
        listed.members.map((member) => member.id),
      ) !== null,
  );
}
