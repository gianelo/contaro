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
