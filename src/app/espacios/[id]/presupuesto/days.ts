import { daysIn, month as asMonth } from "@/domain/calendar/month";
import type { Choice } from "@/ui/field";

/**
 * The days a month has, offered as a list to pick a due day from.
 *
 * One copy, because two screens ask the question: the plan's entry screen,
 * where answering it is what makes an item Fixed (#80), and the correction of
 * a Fixed item, where the kind is already settled (#48). Two copies would be
 * two places for one of them to go on offering a 30th of February.
 *
 * The month arrives as the string a screen is carrying rather than as a
 * `Month`, because that is the shape both forms hold it in — a form field is a
 * claim, and `asMonth` is where this one is made to be a month or refused.
 */
export function daysOf(month: string): readonly Choice[] {
  return Array.from({ length: daysIn(asMonth(month)) }, (_, index) => ({
    value: String(index + 1),
    label: String(index + 1),
  }));
}
