/**
 * Where `/` sends a Member, decided from three facts and nothing else
 * (#108, ADR-0063).
 *
 * The rule is: the Space last opened; failing that, the only one there is;
 * failing that, the list. It is not "how many Spaces do they have", which is
 * the rule the ticket opened with, because the product already knows something
 * better than a count and has known it since #38 — a person with three Spaces
 * who lives in one of them is thrown at the list by a count and is the Member
 * with the most to gain. The count survives only as the tie-breaker for
 * somebody who has never opened anything, which is exactly the case
 * `lastOpenedSpace` answers null for, by design: ADR-0029 says "A badge
 * nothing supports is worse than no badge."
 *
 * Pure, and separate from the page that reads the three facts, because this is
 * the half that can be wrong. Everything a landing turns on — a stale id, a
 * seat waiting, the difference between one Space and four — is decided here in
 * milliseconds with no session and no database.
 */
export type Landing =
  /** The list of Spaces, which is where `/` has always gone. */
  | { kind: "list" }
  /** Straight into a Space, at its Budget. */
  | { kind: "space"; id: string };

/** The whole of what the answer depends on. */
export type LandingFacts = {
  /** Every Space really theirs, as `listSpacesForMember` narrows it. */
  spaceIds: readonly string[];
  /** The Space they opened last, or nothing if they never have. */
  lastOpenedId: string | null;
  /** How many Spaces are waiting for them to say yes. */
  invitationsWaiting: number;
};

export function whereToLand({
  spaceIds,
  lastOpenedId,
  invitationsWaiting,
}: LandingFacts): Landing {
  /*
   * An Invitation is answered on `/espacios` and nowhere else, and the reason
   * that screen gives for holding it is that it is where everyone lands. This
   * change makes that false for precisely the person most likely to be
   * invited — one Space, invited to their second — who would otherwise be
   * dropped into their own Budget and never see the seat. So the landing
   * yields to it.
   *
   * Provisional, and written down as such on the ticket: #133 is the bell that
   * makes a waiting Invitation visible from every screen in the product rather
   * than from wherever somebody happens to land. Once it ships, seeing the
   * seat no longer depends on this yield and this yield can go. Until then it
   * is the only surface an Invitation has outside `/espacios`.
   */
  if (invitationsWaiting > 0) return { kind: "list" };

  /*
   * Compared against the Spaces really theirs rather than trusted, the way the
   * `Activo` badge is (`listing.ts`): a `last_opened_at` outliving the
   * membership that produced it must land nobody. Handing it to `currentSpace`
   * and letting the 404 sort it out would turn a stale id into a broken
   * landing on the one route a person opens the app with.
   */
  if (lastOpenedId !== null && spaceIds.includes(lastOpenedId)) {
    return { kind: "space", id: lastOpenedId };
  }

  // Somebody who has never opened one, and has only one to open. Nothing is
  // being guessed: there is a single answer to "which money" and the list
  // would be a screen asking a question with one option on it.
  const only = spaceIds.length === 1 ? spaceIds[0] : undefined;

  return only === undefined ? { kind: "list" } : { kind: "space", id: only };
}
