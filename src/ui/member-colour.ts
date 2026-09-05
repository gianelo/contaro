import styles from "./member-colour.module.css";

/**
 * The seats there are. A Space holds at most two Members, so two pairs are not
 * a starting point that will grow: they are the whole set.
 */
const SEATS = [styles.first, styles.second] as const;

/**
 * The colour a Member wears inside a Space: a class carrying an ink and a
 * ground, the same on every screen that draws them.
 *
 * The Space decides it and the reader never does. Sorting the ids gives the
 * same answer to both Members, so "the blue one" names one person for the two
 * of them; were the reader put first instead, each of them would see themselves
 * in blue and they could not talk about the same avatar.
 *
 * Sorted by the raw id and not by `inReadingOrder`: that one exists to put text
 * in front of a person in the order they read it, and nobody reads a uuid. What
 * is wanted here is only an order that cannot change, which plain comparison of
 * two opaque strings gives and a collator does not promise across versions.
 */
export function memberColour(
  memberId: string,
  memberIds: readonly string[],
): string {
  if (memberIds.length > SEATS.length) {
    // Checked before the seat is looked up, not after: with a third Member,
    // which two keep their colour would come down to how the ids happened to
    // sort, so two of the three would be coloured and the answer would look
    // right. A Space that holds three has gone wrong upstream of here.
    throw new Error(
      `A Space holds at most two Members, and this one was handed ${memberIds.length}.`,
    );
  }

  const seated = [...memberIds].sort();
  const seat = seated.indexOf(memberId);

  if (seat === -1) {
    // Not a fallback to the first colour: that would draw a stranger as one of
    // the Space's own Members, which is a wrong statement rather than a
    // missing one.
    throw new Error(
      `Cannot colour "${memberId}", who is not a Member of this Space.`,
    );
  }

  // The two guards above leave `seat` as 0 or 1, so this always finds a
  // colour. It is written out rather than asserted away because the thing that
  // makes it true is the length check, and a `!` here would keep on compiling
  // the day somebody deletes it.
  const colour = SEATS[seat];

  if (!colour) {
    throw new Error(
      `Seat ${seat} has no colour, which means the count above stopped guarding it.`,
    );
  }

  return colour;
}

