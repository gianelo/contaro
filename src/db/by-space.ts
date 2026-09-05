import type { Space } from "@/domain/space/space";

/**
 * Rows read for several Spaces at once, sorted back under the Space each one
 * belongs to and read in that Space's own money.
 *
 * The Space list asks two of these questions in one landing -- what a month
 * cost and what it was planned to -- and the part that could go wrong is the
 * same for both: a row read against the wrong Space is an amount written in a
 * neighbour's currency, which ADR-0007 exists to make unwritable. Said once
 * here rather than twice, so that argument has one place to be right.
 *
 * A row naming a Space that was not asked about is dropped. The `IN` was built
 * from these very keys, so such a row means the query has stopped saying what
 * it says -- and reading it against whichever Space is nearest is the one way
 * this could put a figure on a card in the wrong money.
 */
export function bySpace<Row extends { spaceId: string }, Read>(
  rows: readonly Row[],
  spaces: ReadonlyMap<string, Space>,
  read: (row: Row, space: Space) => Read,
): ReadonlyMap<string, readonly Read[]> {
  const grouped = new Map<string, Read[]>();

  for (const row of rows) {
    const space = spaces.get(row.spaceId);
    if (!space) continue;

    const group = grouped.get(row.spaceId) ?? [];
    group.push(read(row, space));
    grouped.set(row.spaceId, group);
  }

  return grouped;
}
