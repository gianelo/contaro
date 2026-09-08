import { isCurrencyCode } from "@/domain/money/currency";
import type { Space } from "@/domain/space/space";

/**
 * A `spaces` row read back as a domain Space, and the two things it is refused
 * for.
 *
 * Said once here rather than in every file that reads the table, the way
 * `bySpace` says its argument once: two copies of a refusal are two copies that
 * stop agreeing the day one of them gains a third reason, and the reasons below
 * are exactly the ones a screen must never be handed past.
 */
export function asSpace(row: {
  id: string;
  name: string;
  currency: string;
  createdBy: string | null;
}): Space {
  // The currency column is text, because the set of codes belongs to the domain
  // and not to a database type. A row holding something outside that set can
  // only come from a write that went round the domain, and rendering it would
  // put a figure on screen in a money nobody can name.
  if (!isCurrencyCode(row.currency)) {
    throw new Error(
      `Space ${row.id} is stored in "${row.currency}", which is not a currency contaro offers.`,
    );
  }

  // `created_by` is nullable only for the length of ADR-0008's window:
  // migration 0015 filled every row that predates it and bridges every row
  // written since by a deploy that had not caught up. A null here is a Space
  // inserted by a path that seated no Member -- which is a Space nobody can
  // open anyway -- and ADR-0051 rests two acts on the answer, so it is refused
  // rather than reported as "nobody".
  if (row.createdBy === null) {
    throw new Error(
      `Space ${row.id} does not say who created it, and ADR-0051 rests on the answer.`,
    );
  }

  return {
    id: row.id,
    name: row.name,
    currency: row.currency,
    createdBy: row.createdBy,
  };
}
