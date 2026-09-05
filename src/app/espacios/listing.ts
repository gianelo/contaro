import type { Reader } from "@/app/reader";
import { database } from "@/db/client";
import { budgetItemsInMonthForSpaces } from "@/db/budget-items";
import { movementsInMonthForSpaces } from "@/db/movements";
import { lastOpenedSpace, listSpacesForMember } from "@/db/spaces";
import type { Month } from "@/domain/calendar/month";
import { expected, type BudgetItem } from "@/domain/budget/budget";
import { formatMoney } from "@/domain/money/money";
import { spent, type Movement } from "@/domain/movement/movement";
import type { SpaceMember, SpaceWithMembers } from "@/domain/space/access";
import { t } from "@/i18n";

/**
 * A Space as its card reads it: everything already turned into words, so the
 * card draws and decides nothing.
 *
 * The amounts arrive written rather than as `Money`, for the reason every
 * other readable does: how an amount is punctuated is the Reader's (ADR-0014)
 * and what money it is written in is the Space's (ADR-0001), and neither of
 * those questions belongs to a component.
 */
export type ReadableSpace = {
  id: string;
  name: string;
  /** Everyone in it, in the order the Space's rows name them. */
  members: readonly SpaceMember[];
  /** How many are in it and what money it holds: "2 miembros · COP". */
  who: string;
  /** Whether this is the Space last opened -- the one being used. */
  lastOpened: boolean;
  /** What the month has really cost. */
  spent: string;
  /** What it was planned to cost. Zero where nothing has been planned. */
  expected: string;
};

/**
 * The Space list, read: every Space a Member may open, with the month's two
 * figures already written on each one.
 *
 * The rows arrive as arguments rather than being fetched here, so the part
 * that can actually be wrong — one Space's money landing on another's card —
 * is driven in milliseconds with no database. `spacesToChooseFrom` is the
 * half that reads.
 *
 * The order handed in is the order kept. Floating the Space being used to the
 * top would move a row under a thumb every time somebody came back to this
 * screen, which is exactly what `listSpacesForMember` refuses to do by sorting
 * on when a Member joined rather than on a name that can change.
 */
export function readableSpaces(
  listed: readonly SpaceWithMembers[],
  movements: ReadonlyMap<string, readonly Movement[]>,
  planned: ReadonlyMap<string, readonly BudgetItem[]>,
  lastOpenedId: string | null,
  reader: Reader,
): readonly ReadableSpace[] {
  return listed.map(({ space, members }) => ({
    id: space.id,
    name: space.name,
    members,
    who: whoIsIn(members, space.currency),
    // Compared against the Spaces really on the list rather than trusted: an
    // id outliving the membership that produced it must mark nothing, and
    // never the card that happens to sit where that Space used to.
    lastOpened: space.id === lastOpenedId,
    /*
     * Both figures are denominated by the Space and not by whatever rows came
     * back. The currency is passed to the arithmetic rather than read off the
     * first row, which is what lets a Space nobody has planned a month for
     * still answer with a figure instead of a blank (ADR-0007).
     */
    spent: formatMoney(
      spent(movements.get(space.id) ?? [], space.currency),
      reader.locales,
    ),
    expected: formatMoney(
      expected(planned.get(space.id) ?? [], space.currency),
      reader.locales,
    ),
  }));
}

/**
 * Who is in a Space and what money it holds, in the one line under its name.
 *
 * A count and not the names, which is what the card has room for once the
 * avatars are drawing them: the names are still on the screen, carried by the
 * circles for anybody not reading the colours (see `MemberAvatars`).
 *
 * "Solo vos" and not "1 miembro", because a Space of one is a Member's own
 * money and saying so in a count is a strange way to tell somebody that.
 */
function whoIsIn(
  members: readonly SpaceMember[],
  currency: string,
): string {
  return members.length === 1
    ? t("spaces.who.alone", { currency })
    : t("spaces.who.several", { count: members.length, currency });
}

/**
 * Every Space a Member may open, ready to be drawn (#38).
 *
 * Six queries whatever the answer's size, and that is the whole shape of this
 * function. The obvious version asks each card for its own month and costs a
 * query per Space — a screen that gets slower the more Spaces somebody has,
 * on the one screen every single session starts at. The Spaces are read once
 * and their months are read for all of them together.
 *
 * Two rounds and not one, because the second pair cannot be asked until it is
 * known which Spaces are really this Member's: whose money is being totalled
 * is the question `listSpacesForMember` answers, and asking it first is what
 * keeps a batch from being a way round it.
 */
export async function spacesToChooseFrom(
  memberId: string,
  asOf: Month,
  reader: Reader,
): Promise<readonly ReadableSpace[]> {
  const db = database();

  const [listed, lastOpened] = await Promise.all([
    listSpacesForMember(db, memberId),
    lastOpenedSpace(db, memberId),
  ]);

  if (listed.length === 0) return [];

  const spaces = listed.map(({ space }) => space);

  const [movements, planned] = await Promise.all([
    movementsInMonthForSpaces(db, spaces, asOf),
    budgetItemsInMonthForSpaces(db, spaces, asOf),
  ]);

  return readableSpaces(listed, movements, planned, lastOpened, reader);
}
