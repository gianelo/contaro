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
import type { ReadableBranch } from "@/i18n/category";
import { dayLabel, monthLabel } from "@/i18n/day";
import type { Reader } from "@/app/reader";
import type { ChipBranch } from "@/ui/branching-chip-field";
import { incomeMark } from "@/i18n/category";
import { letterMark, type CategoryMark } from "@/ui/category-mark";
import { memberColour } from "@/ui/member-colour";
import {
  namesFrom,
  readableCatalogueFor,
  type Naming,
} from "../categorias/catalogue";

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
   * What is drawn in the circle at the start of the row (#39).
   *
   * It arrives already decided, from the one place a Category is named. Income
   * is not a Category and carries none (ADR-0016), so it wears a mark of its
   * own rather than one looked up by an identifier it does not have.
   */
  mark: CategoryMark;
  /**
   * Whose money it was, as a circle can draw them — or nothing at all in a
   * Space with one Member, where every Movement is theirs and saying so on
   * every row says nothing.
   *
   * The name and the colour together, because an avatar needs both and neither
   * can be worked out from a Member's identifier alone: the colour is the
   * Space's answer about which of two seats they hold (ADR-0020), and a row
   * has no idea who else is in the Space.
   */
  whose: Whose | null;
  /** Who typed it in. Shown and never offered as something to change. */
  recordedBy: string;
};

/** A Member as a row draws them: their name, and the colour their Space seated
 * them in. The two travel together everywhere — an avatar needs both and can
 * work out neither from an identifier — so they are one type rather than a pair
 * of parameters that keep turning up side by side. */
export type Whose = { name: string; colour: string };

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
 * The headings, each one holding what is under it. Which branch a chip belongs
 * to has to survive the trip to the screen, because that is what the screen
 * draws with: a heading is chosen in one tap and what it holds is offered next
 * (`BranchingChipField`, #45). Flat, they were twenty-four identical chips
 * with nothing saying which sat inside which.
 *
 * Read in the order `readableCatalogue` puts it in, so a thumb can predict
 * where a chip is.
 */
export async function categoryChips(
  spaceId: string,
): Promise<readonly ChipBranch[]> {
  return chipsFrom(await readableCatalogueFor(spaceId));
}

/**
 * The catalogue as the picker offers it.
 *
 * A subcategory carries its heading as the qualifier, because two Spaces'
 * worth of naming can produce two Categories called the same thing under two
 * different headings, and a chip nobody can tell apart is a chip that files
 * money in the wrong place. The second group's legend asks for something more
 * precise rather than naming the heading, so the qualifier is still the only
 * thing saying which branch a child is heard in.
 */
export function chipsFrom(
  catalogue: readonly ReadableBranch[],
): readonly ChipBranch[] {
  return catalogue.map((branch) => ({
    value: branch.id,
    label: branch.name,
    children: branch.children.map((child) => ({
      value: child.id,
      label: child.name,
      qualifier: branch.name,
    })),
  }));
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
  reader: Reader,
): Promise<ReadableMonth> {
  const [recorded, catalogue, members] = await Promise.all([
    movementsInMonth(database(), space, month),
    readableCatalogueFor(space.id),
    spaceMembers(space.id),
  ]);

  const named = namesFrom(catalogue);
  const whose = whoseFrom(members);
  const asRead = (movement: Movement) =>
    readable(movement, named, whose, reader);

  return {
    month,
    label: monthLabel(month, monthOf(reader.today)),
    days: movementsByDay(recorded).map((day) => ({
      day: day.day,
      label: dayLabel(day.day, reader.today),
      movements: day.movements.map(asRead),
    })),
    // Read off the Movements rather than summed in SQL, so what the screen
    // shows is the total of exactly the rows beneath it and can never disagree
    // with them.
    spent: formatMoney(spent(recorded, space.currency), reader.locales),
    earned: formatMoney(earned(recorded, space.currency), reader.locales),
    around: monthsAround(month, monthOf(reader.today)),
  };
}

/** One Movement of a Space, as its own screen shows it. */
export async function readableMovement(
  space: Space,
  movementId: string,
  reader: Reader,
): Promise<ReadableMovement | null> {
  const movement = await findMovementInSpace(database(), space, movementId);
  if (!movement) return null;

  // Nobody to draw, and so no query for the Members: this is the correction
  // screen's reader, and that screen asks who the money belongs to with a
  // picker rather than saying it in a circle. `whose` is a thing the month's
  // list shows, and fetching a Space's Members to fill a field nobody reads is
  // a round trip bought for nothing.
  return readable(
    movement,
    namesFrom(await readableCatalogueFor(space.id)),
    new Map(),
    reader,
  );
}

/**
 * How each Member is drawn on a row, or nothing at all.
 *
 * Empty in a personal Space, and deliberately: "In a shared Space each
 * Movement shows whose money it was" (#8), and in a Space of one the answer is
 * always the person reading it. A circle that says the same thing on every row
 * is a circle a thumb stops seeing, and it costs the row width it has not got.
 *
 * The colours are worked out here, once, from the Space's own rows — and that
 * is what keeps `memberColour`'s throw off this screen. It refuses to colour
 * somebody the Space does not hold, because drawing a stranger as one of the
 * Space's Members is a wrong statement rather than a missing one (ADR-0020).
 * A Movement attributed to somebody who has since left simply finds nothing in
 * this map and draws no avatar, which is the missing statement and the honest
 * one. Asking for a colour per row would have put that question to an id the
 * Space no longer holds, and taken the whole month's list down with it.
 */
export function whoseFrom(
  members: readonly SpaceMember[],
): ReadonlyMap<string, Whose> {
  if (members.length < 2) return new Map();

  const seated = members.map((member) => member.id);

  return new Map(
    members.map((member) => [
      member.id,
      { name: member.name, colour: memberColour(member.id, seated) },
    ]),
  );
}

function readable(
  movement: Movement,
  named: Naming,
  whose: ReadonlyMap<string, Whose>,
  reader: Reader,
): ReadableMovement {
  // A Movement whose Category is not in the catalogue can only come from a
  // Category retired by a migration. The money stays on the screen with its
  // identifier showing rather than disappearing, because a figure nobody can
  // see is worse than one nobody can name.
  const category =
    movement.categoryId === null ? undefined : named.get(movement.categoryId);
  // Income is filed nowhere, so the word for it is the whole of its name. The
  // empty string on the end is unreachable and is here for the type checker
  // alone: `categoryId` is nullable because income makes it so, and an expense
  // that reached this line has one (`filing`, plus the check in migration
  // 0005). Written down rather than left as a mystery, because a fallback with
  // no reason reads like a case somebody expected.
  const name =
    movement.direction === "income"
      ? t("movements.income")
      : (category?.name ?? movement.categoryId ?? "");

  return {
    id: movement.id,
    direction: movement.direction,
    category: name,
    // The Category's own mark, the arrow for income, and — for a Movement
    // whose Category a migration retired — the letter of whatever the row is
    // showing instead, which is the identifier. That row already keeps its
    // money on the screen with its identifier where the name should be, and a
    // circle carrying the same first character is the same wrong word twice
    // rather than a hole beside it.
    // The Category's own mark, and the arrow for income. A Movement whose
    // Category a migration retired finds neither: its name is already showing
    // an identifier nobody can read, and the first character of a uuid in the
    // circle beside it would be a second unreadable thing rather than a mark.
    // So the circle comes out empty and keeps the column, which is the honest
    // picture of a row that has lost its name.
    mark:
      movement.direction === "income"
        ? incomeMark
        : (category?.mark ?? letterMark("")),
    heading: category?.heading ?? null,
    amount: formatMoney(movement.amount, reader.locales),
    minorUnits: movement.amount.amount,
    day: dayLabel(movement.occurredOn, reader.today),
    occurredOn: movement.occurredOn,
    categoryId: movement.categoryId,
    attributedTo: movement.attributedTo,
    whose: whose.get(movement.attributedTo) ?? null,
    recordedBy: movement.recordedBy,
  };
}
