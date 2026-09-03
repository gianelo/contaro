import { database } from "@/db/client";
import { membersOfSpace } from "@/db/spaces";
import { findMovementInSpace, movementsInMonth } from "@/db/movements";
import type { CalendarDate, Month } from "@/domain/calendar/month";
import { calendarDate, isMonth, monthOf } from "@/domain/calendar/month";
import { formatMoney } from "@/domain/money/money";
import { spent, type Movement } from "@/domain/movement/movement";
import type { SpaceMember } from "@/domain/space/access";
import type { Space } from "@/domain/space/space";
import { dayLabel } from "@/i18n/day";
import type { Chip } from "@/ui/chip-field";
import { readableCatalogueFor } from "../categorias/catalogue";

/**
 * The day it is, by the server's clock.
 *
 * UTC, and deliberately so: neither a Space nor a Member carries a timezone,
 * so there is no truer answer available to a server. It is used for two
 * things, and being a few hours out costs little in either — the month a list
 * opens on, which #8 makes choosable, and the bound on how late a day may be,
 * which already allows a day of slack for exactly this reason. What a person's
 * own day is, is a question the browser answers, and the entry screen asks it.
 */
export function todayOnTheServer(): CalendarDate {
  return calendarDate(new Date().toISOString().slice(0, 10));
}

/**
 * Which month a screen is showing.
 *
 * Asked rather than assumed, because the server's month and the reader's are
 * not always the same one. `todayOnTheServer` is UTC, so at ten at night on
 * the 30th in Buenos Aires it is already the 1st here — the expense that was
 * just recorded is dated the 30th, in last month, and a list that assumed the
 * server's month would open on the next one and not show it. So whoever writes
 * a Movement says which month it landed in, and a plain visit gets this one.
 *
 * A month off a URL is any string at all, and every reader of one builds days
 * out of it, which throws (`isMonth`). Something that is not a month is
 * treated as nothing asked for. There is no control that changes this yet: #8
 * brings the picker, and it will read exactly here.
 */
export function monthInView(asked?: string): Month {
  return asked !== undefined && isMonth(asked)
    ? asked
    : monthOf(todayOnTheServer());
}

/**
 * A Movement as a screen shows it: named by its Category, written in the
 * reader's separators, dated in words.
 */
export type ReadableMovement = {
  id: string;
  /** The Category it is filed under, as a person reads it. */
  category: string;
  /** The heading that Category sits under, if it sits under one. */
  heading: string | null;
  amount: string;
  /**
   * The same amount as the figure the keypad counts in. `amount` above is for
   * eyes; this is what the correction screen opens the keypad on, and reading
   * it back off the formatted string would mean parsing separators that are
   * the reader's rather than anybody's rule.
   */
  minorUnits: number;
  day: string;
  occurredOn: CalendarDate;
  categoryId: string;
  attributedTo: string;
  /** Who typed it in. Shown and never offered as something to change. */
  recordedBy: string;
};

/**
 * The Categories a Movement can be filed under, as chips.
 *
 * The whole catalogue, flat: a Category has to be one tap from the amount
 * (story 19 in #1), and a heading that has to be opened before its
 * subcategories appear is a second tap on every expense a person records. It
 * is read in the order `readableCatalogue` puts it in, headings first and each
 * one followed by what it holds, so a thumb can predict where a chip is.
 *
 * A subcategory carries its heading as the qualifier, because two Spaces'
 * worth of naming can produce two Categories called the same thing under two
 * different headings, and a chip nobody can tell apart is a chip that files
 * money in the wrong place.
 */
export async function categoryChips(spaceId: string): Promise<readonly Chip[]> {
  const catalogue = await readableCatalogueFor(spaceId);

  return catalogue.flatMap((branch) => [
    { value: branch.id, label: branch.name },
    ...branch.children.map((child) => ({
      value: child.id,
      label: child.name,
      qualifier: branch.name,
    })),
  ]);
}

export async function spaceMembers(
  spaceId: string,
): Promise<readonly SpaceMember[]> {
  return membersOfSpace(database(), spaceId);
}

/**
 * One Space's month: what was recorded in it and what it adds up to.
 *
 * The Category names come from `readableCatalogueFor`, which is the one place
 * a Category is named — a second answer to "what is this Category called"
 * would eventually disagree with the catalogue screen.
 */
export async function readableMonth(
  space: Space,
  month: Month,
  locales: readonly string[],
): Promise<{ movements: readonly ReadableMovement[]; spent: string }> {
  const [recorded, catalogue] = await Promise.all([
    movementsInMonth(database(), space, month),
    readableCatalogueFor(space.id),
  ]);

  const named = namesFrom(catalogue);
  const today = todayOnTheServer();

  return {
    movements: recorded.map((movement) => readable(movement, named, locales, today)),
    // Read off the Movements rather than summed in SQL, so what the screen
    // shows is the total of exactly the rows beneath it and can never disagree
    // with them.
    spent: formatMoney(spent(recorded, space.currency), locales),
  };
}

/** One Movement of a Space, as its own screen shows it. */
export async function readableMovement(
  space: Space,
  movementId: string,
  locales: readonly string[],
): Promise<ReadableMovement | null> {
  const movement = await findMovementInSpace(database(), space, movementId);
  if (!movement) return null;

  return readable(
    movement,
    namesFrom(await readableCatalogueFor(space.id)),
    locales,
    todayOnTheServer(),
  );
}

type Naming = ReadonlyMap<string, { name: string; heading: string | null }>;

function namesFrom(
  catalogue: Awaited<ReturnType<typeof readableCatalogueFor>>,
): Naming {
  const named = new Map<string, { name: string; heading: string | null }>();

  for (const branch of catalogue) {
    named.set(branch.id, { name: branch.name, heading: null });
    for (const child of branch.children) {
      named.set(child.id, { name: child.name, heading: branch.name });
    }
  }

  return named;
}

function readable(
  movement: Movement,
  named: Naming,
  locales: readonly string[],
  today: CalendarDate,
): ReadableMovement {
  // A Movement whose Category is not in the catalogue can only come from a
  // Category retired by a migration. The money stays on the screen with its
  // identifier showing rather than disappearing, because a figure nobody can
  // see is worse than one nobody can name.
  const category = named.get(movement.categoryId);

  return {
    id: movement.id,
    category: category?.name ?? movement.categoryId,
    heading: category?.heading ?? null,
    amount: formatMoney(movement.amount, locales),
    minorUnits: movement.amount.amount,
    day: dayLabel(movement.occurredOn, today),
    occurredOn: movement.occurredOn,
    categoryId: movement.categoryId,
    attributedTo: movement.attributedTo,
    recordedBy: movement.recordedBy,
  };
}
