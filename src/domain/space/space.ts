import { isCurrencyCode, type CurrencyCode } from "../money/currency";

/**
 * A Space: the container that holds Members, one currency, and — from #7 on —
 * its Movements and Budgets. Everything a person sees in contaro is inside one.
 *
 * The currency is chosen here and never again (ADR-0001). That is enforced by
 * `amendSpace` refusing the change outright, not by screens declining to offer
 * it: a rule only a form knows about is a rule that survives until the second
 * caller.
 */

export type Space = {
  id: string;
  name: string;
  currency: CurrencyCode;
};

/** A Space that does not exist yet, so it has no id to give. */
export type NewSpace = Omit<Space, "id">;

/** A Space and the Members it comes into existence with. */
export type SpaceCreation = {
  space: NewSpace;
  memberIds: readonly string[];
};

/** What a caller may propose changing about a Space. */
export type SpaceAmendment = {
  name?: string;
  /** Accepted only to be refused: see `amendSpace`. */
  currency?: string;
};

/** Long enough for "Casa de la playa", short enough to fit a row. */
export const MAX_SPACE_NAME_LENGTH = 60;

/**
 * Thrown when a Space cannot be made or changed as asked. `field` says which
 * answer was the bad one, so a screen can point at the input rather than
 * showing one apology for a form of two.
 */
export class UnusableSpaceError extends Error {
  readonly field: "name" | "currency" | "creator";

  constructor(field: "name" | "currency" | "creator", reason: string) {
    super(`This Space cannot be used: ${reason}.`);
    this.name = "UnusableSpaceError";
    this.field = field;
  }
}

/**
 * Thrown by any attempt to move a Space to another currency. ADR-0001: there
 * is no rate that makes January's expense true in September, so the history
 * cannot be converted and the currency cannot move.
 */
export class CurrencyIsImmutableError extends Error {
  constructor(from: CurrencyCode, to: string) {
    super(
      `A Space's currency can never be changed, and this one is ${from}, not ${to} (ADR-0001). Create another Space instead.`,
    );
    this.name = "CurrencyIsImmutableError";
  }
}

export function createSpace(
  draft: { name: string; currency: string },
  creatorId: string,
): SpaceCreation {
  if (creatorId.trim() === "") {
    throw new UnusableSpaceError("creator", "it names no Member as its creator");
  }

  return {
    space: { name: spaceName(draft.name), currency: currency(draft.currency) },
    // The creator is a Member from the first instant: a Space nobody belongs to
    // is a Space nobody can open, and #9 adds the second Member to this list.
    memberIds: [creatorId],
  };
}

export function amendSpace(space: Space, changes: SpaceAmendment): Space {
  // Checked before anything is applied, so a refused amendment changes nothing
  // at all rather than landing its acceptable half.
  if (changes.currency !== undefined && changes.currency !== space.currency) {
    throw new CurrencyIsImmutableError(space.currency, changes.currency);
  }

  return {
    ...space,
    name: changes.name === undefined ? space.name : spaceName(changes.name),
  };
}

function spaceName(proposed: string): string {
  const name = proposed.trim();

  if (name === "") {
    throw new UnusableSpaceError("name", "it has no name");
  }
  if (name.length > MAX_SPACE_NAME_LENGTH) {
    throw new UnusableSpaceError(
      "name",
      `its name is longer than ${MAX_SPACE_NAME_LENGTH} characters`,
    );
  }

  return name;
}

function currency(proposed: string): CurrencyCode {
  if (!isCurrencyCode(proposed)) {
    throw new UnusableSpaceError(
      "currency",
      `"${proposed}" is not a currency contaro offers`,
    );
  }

  return proposed;
}
