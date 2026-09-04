import { database } from "@/db/client";
import { membersOfSpace } from "@/db/spaces";
import { findMovementInSpace, movementsInMonth } from "@/db/movements";
import type { CalendarDate, Month, MonthsAround } from "@/domain/calendar/month";
import {
  calendarDate,
  isMonth,
  monthOf,
  monthsAround,
} from "@/domain/calendar/month";
import { formatMoney } from "@/domain/money/money";
import {
  earned,
  movementsByDay,
  spent,
  type Movement,
  type MovementDirection,
} from "@/domain/movement/movement";
import type { SpaceMember } from "@/domain/space/access";
import type { Space } from "@/domain/space/space";
import { t } from "@/i18n";
import { dayLabel, monthLabel } from "@/i18n/day";
import type { Chip } from "@/ui/chip-field";
import { readableCatalogueFor } from "../categorias/catalogue";

/**
 * The day it is, by the server's clock.
 *
 * UTC, and no longer the day any screen names. What a person calls "hoy" is
 * the Reader's day, taken from the zone the request arrived with (ADR-0018);
 * this is what remains once that moved out, and it is deliberately the blunter
 * answer of the two.
 *
 * It is the bound on how late a day may be, with the twenty-four hours of
 * slack `movement.ts` explains. That guard rail wants to be generous: it exists
 * to catch a nonsense date, and tightening it to the Reader's day would start
 * refusing real entries from a device whose clock is off — a worse outcome
 * than admitting one dated tomorrow.
 *
 * It is also the day the entry form falls back to when the browser has not yet
 * answered, which is a frame of server render and never what gets recorded:
 * `form.tsx` prefers the browser's own day, because that is the person's.
 */
export function todayOnTheServer(): CalendarDate {
  return calendarDate(new Date().toISOString().slice(0, 10));
}

/**
 * Which month a screen is showing: the one asked for, or the Reader's own.
 *
 * The day is passed in rather than read here, because it is the Reader's and
 * only a request knows where its Reader is (`timeZoneFor`). This used to fall
 * back to the server's month, and at nine at night on the 30th in Bogota that
 * is already the month after — so a plain visit opened on a month the expense
 * just recorded was not in, and showed an empty list. The same skew as the day
 * headings, in the place where the failure is silent rather than odd.
 *
 * A month off a URL is any string at all, and every reader of one builds days
 * out of it, which throws (`isMonth`). Something that is not a month is
 * treated as nothing asked for. There is no control that changes this yet: #8
 * brings the picker, and it will read exactly here.
 */
export function monthInView(asked: string | undefined, today: CalendarDate): Month {
  return asked !== undefined && isMonth(asked) ? asked : monthOf(today);
}

/**
 * A Movement as a screen shows it: named by its Category, written in the
 * reader's separators, dated in words.
 */
export type ReadableMovement = {
  id: string;
  direction: MovementDirection;
  /**
   * What the row is called: the Category an expense is filed under, as a
   * person reads it, and the word for income, which is filed nowhere (#8).
   */
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
  categoryId: string | null;
  attributedTo: string;
  /**
   * Whose money it was, named — or nothing at all in a Space with one Member,
   * where every Movement is theirs and saying so on every row says nothing.
   */
  attribution: string | null;
  /** Who typed it in. Shown and never offered as something to change. */
  recordedBy: string;
};

/** One day of the month and everything recorded on it, as a screen reads it. */
export type ReadableDay = {
  day: CalendarDate;
  /** The day named the way a person says it: "Hoy", "2 de septiembre". */
  label: string;
  movements: readonly ReadableMovement[];
};

/** One Space's month, as the screen showing it needs to know it. */
export type ReadableMonth = {
  month: Month;
  /** The month named at the top of the screen: "Septiembre". */
  label: string;
  /** The days that had something in them, most recent first. */
  days: readonly ReadableDay[];
  /** What went out and what came in, in the Space's money. */
  spent: string;
  earned: string;
  /** Where the control at the top of the screen can go from here. */
  around: MonthsAround;
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
 * One Space's month: what was recorded in it, what it adds up to, and where a
 * thumb can go from it.
 *
 * The Category names come from `readableCatalogueFor`, which is the one place
 * a Category is named — a second answer to "what is this Category called"
 * would eventually disagree with the catalogue screen. The Member names come
 * from the Space's own rows, and only where there is more than one of them:
 * that is what makes "whose money was this" a question worth answering.
 */
export async function readableMonth(
  space: Space,
  month: Month,
  locales: readonly string[],
  today: CalendarDate,
): Promise<ReadableMonth> {
  const [recorded, catalogue, members] = await Promise.all([
    movementsInMonth(database(), space, month),
    readableCatalogueFor(space.id),
    spaceMembers(space.id),
  ]);

  const named = namesFrom(catalogue);
  const attributions = attributionsFrom(members);
  const asRead = (movement: Movement) =>
    readable(movement, named, attributions, locales, today);

  return {
    month,
    label: monthLabel(month, monthOf(today)),
    days: movementsByDay(recorded).map((day) => ({
      day: day.day,
      label: dayLabel(day.day, today),
      movements: day.movements.map(asRead),
    })),
    // Read off the Movements rather than summed in SQL, so what the screen
    // shows is the total of exactly the rows beneath it and can never disagree
    // with them.
    spent: formatMoney(spent(recorded, space.currency), locales),
    earned: formatMoney(earned(recorded, space.currency), locales),
    around: monthsAround(month, monthOf(today)),
  };
}

/** One Movement of a Space, as its own screen shows it. */
export async function readableMovement(
  space: Space,
  movementId: string,
  locales: readonly string[],
  today: CalendarDate,
): Promise<ReadableMovement | null> {
  const movement = await findMovementInSpace(database(), space, movementId);
  if (!movement) return null;

  // No attributions, and so no query for the Members: this is the correction
  // screen's reader, and that screen asks who the money belongs to with a
  // picker rather than saying it in a line. `attribution` is a thing the
  // month's list shows, and fetching a Space's Members to fill a field nobody
  // reads is a round trip bought for nothing.
  return readable(
    movement,
    namesFrom(await readableCatalogueFor(space.id)),
    new Map(),
    locales,
    today,
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

/**
 * How each Member is named on a row, or nothing at all.
 *
 * Empty in a personal Space, and deliberately: "In a shared Space each
 * Movement shows whose money it was" (#8), and in a Space of one the answer is
 * always the person reading it. A line that says the same thing on every row
 * is a line a thumb stops seeing, and it costs a row's worth of width.
 */
function attributionsFrom(
  members: readonly SpaceMember[],
): ReadonlyMap<string, string> {
  if (members.length < 2) return new Map();

  return new Map(members.map((member) => [member.id, member.name]));
}

function readable(
  movement: Movement,
  named: Naming,
  attributions: ReadonlyMap<string, string>,
  locales: readonly string[],
  today: CalendarDate,
): ReadableMovement {
  // A Movement whose Category is not in the catalogue can only come from a
  // Category retired by a migration. The money stays on the screen with its
  // identifier showing rather than disappearing, because a figure nobody can
  // see is worse than one nobody can name.
  const category =
    movement.categoryId === null ? undefined : named.get(movement.categoryId);
  const attributedTo = attributions.get(movement.attributedTo);

  return {
    id: movement.id,
    direction: movement.direction,
    // Income is filed nowhere, so the word for it is the whole of its name.
    // The empty string on the end is unreachable and is here for the type
    // checker alone: `categoryId` is nullable because income makes it so, and
    // an expense that reached this line has one (`filing`, plus the check in
    // migration 0005). Written down rather than left as a mystery, because a
    // fallback with no reason reads like a case somebody expected.
    category:
      movement.direction === "income"
        ? t("movements.income")
        : (category?.name ?? movement.categoryId ?? ""),
    heading: category?.heading ?? null,
    amount: formatMoney(movement.amount, locales),
    minorUnits: movement.amount.amount,
    day: dayLabel(movement.occurredOn, today),
    occurredOn: movement.occurredOn,
    categoryId: movement.categoryId,
    attributedTo: movement.attributedTo,
    attribution: attributedTo
      ? t("movements.attributed", { member: attributedTo })
      : null,
    recordedBy: movement.recordedBy,
  };
}
