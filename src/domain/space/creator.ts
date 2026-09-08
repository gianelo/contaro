import type { Space } from "./space";

/**
 * The one asymmetry between a Space's two Members, and everything it covers.
 *
 * ADR-0020 made the two Members deliberately symmetric, down to their colours
 * coming from sorted ids rather than from who arrived first, and it still
 * stands. This is its one named exception (ADR-0051): closing a month, and
 * approving the carry-over, are the creator's and nobody else's.
 *
 * Two acts and no others. Renaming the Space, recording Movements, editing the
 * plan, inviting -- all of those remain a question about membership, which is
 * `access.ts`, and none of them belong here.
 *
 * The two acts ask one question rather than two on purpose. Written twice they
 * would eventually disagree, and the day they disagree is the day one Member
 * can close a month the other one has to live inside.
 */
export function isTheCreatorOf(memberId: string, space: Space): boolean {
  return space.createdBy === memberId;
}

/** Only the Space's creator closes a month. The invited Member cannot. */
export function mayCloseTheMonth(memberId: string, space: Space): boolean {
  return isTheCreatorOf(memberId, space);
}

/** Only the Space's creator approves the carry-over. */
export function mayApproveTheCarryOver(memberId: string, space: Space): boolean {
  return isTheCreatorOf(memberId, space);
}
