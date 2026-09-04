import { database } from "@/db/client";
import { budgetItemsInMonth, findBudgetItemInSpace } from "@/db/budget-items";
import {
  expected,
  expectedByCategory,
  type BudgetItem,
} from "@/domain/budget/budget";
import {
  monthOf,
  monthsToPlan,
  type Month,
  type MonthsToPlan,
} from "@/domain/calendar/month";
import { formatMoney } from "@/domain/money/money";
import type { Space } from "@/domain/space/space";
import { monthLabel } from "@/i18n/day";
import type { Reader } from "@/app/reader";
import {
  namesFrom,
  readableCatalogueFor,
  type Naming,
} from "../categorias/catalogue";

/**
 * One item of a month's plan, as a screen shows it: named by its Category and
 * written in the reader's separators.
 */
export type ReadableBudgetItem = {
  id: string;
  /**
   * The month this item is on. Carried, and not recomputed from the Reader's
   * day by the screen that opens it: an item reached without a month in the
   * URL — a bookmark, a link somebody was sent — is still on the month it was
   * planned for, and taking it off the plan has to land back on that one.
   */
  month: Month;
  /** What the row is called: the Category, as a person reads it. */
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
  categoryId: string;
};

/** One Category of the plan, and what the whole of it expects. */
export type ReadableExpectation = {
  categoryId: string;
  category: string;
  expected: string;
};

/** One Space's Budget for a month, as the screen showing it needs to know it. */
export type ReadableBudget = {
  month: Month;
  /** The month named at the top of the screen: "Septiembre". */
  label: string;
  /** Where the control at the top of the screen can go from here. */
  around: MonthsToPlan;
  /**
   * The items, in the order they were planned. Several on one Category stay
   * several here: they are how a person thinks in weeks, and collapsing them
   * on the screen would take away the four rows they meant to edit.
   */
  items: readonly ReadableBudgetItem[];
  /**
   * The same items collapsed to one line per Category, which is what "several
   * items on one Category behave as a single item of their combined amount"
   * means once it reaches eyes. It is what #11 will measure spending against,
   * and it is shown only where it says something the rows above do not — a
   * Category with one item would repeat itself.
   */
  byCategory: readonly ReadableExpectation[];
  /** What the whole month's plan adds up to, in the Space's money. */
  expected: string;
};

/**
 * One Space's plan for a month, read for its own screen.
 *
 * The Category names come from `readableCatalogueFor`, which is the one place
 * a Category is named — a second answer to "what is this Category called"
 * would eventually disagree with the catalogue screen and with the month's
 * list, which reads the same way.
 */
export async function readableBudget(
  space: Space,
  month: Month,
  reader: Reader,
): Promise<ReadableBudget> {
  const [planned, catalogue] = await Promise.all([
    budgetItemsInMonth(database(), space, month),
    readableCatalogueFor(space.id),
  ]);

  const named = namesFrom(catalogue);
  // Counted once rather than per Category: the same walk done inside a filter
  // is the list walked once for every line it ends up keeping.
  const howMany = new Map<string, number>();
  for (const item of planned) {
    howMany.set(item.categoryId, (howMany.get(item.categoryId) ?? 0) + 1);
  }

  return {
    month,
    label: monthLabel(month, monthOf(reader.today)),
    around: monthsToPlan(month),
    items: planned.map((item) => readable(item, named, reader)),
    byCategory: expectedByCategory(planned, space.currency)
      // Only where a Category really has several: with one item the combined
      // figure is the row above it said twice.
      .filter(({ categoryId }) => (howMany.get(categoryId) ?? 0) > 1)
      .map(({ categoryId, expected }) => ({
        categoryId,
        category: named.get(categoryId)?.name ?? categoryId,
        expected: formatMoney(expected, reader.locales),
      })),
    // Read off the items rather than summed in SQL, so what the screen shows
    // is the total of exactly the rows beneath it and can never disagree with
    // them.
    expected: formatMoney(expected(planned, space.currency), reader.locales),
  };
}

/** One item of a Space's plan, as its correction screen shows it. */
export async function readableBudgetItem(
  space: Space,
  itemId: string,
  reader: Reader,
): Promise<ReadableBudgetItem | null> {
  const item = await findBudgetItemInSpace(database(), space, itemId);
  if (!item) return null;

  return readable(item, namesFrom(await readableCatalogueFor(space.id)), reader);
}

function readable(
  item: BudgetItem,
  named: Naming,
  reader: Reader,
): ReadableBudgetItem {
  const category = named.get(item.categoryId);

  return {
    id: item.id,
    month: item.month,
    // The identifier showing rather than a blank row, the way the month's
    // list reads one: a plan whose Category was retired by a migration is a
    // figure a person should still see and be able to correct, and a line
    // with nothing on the left of it is a line nobody can tap on purpose.
    category: category?.name ?? item.categoryId,
    heading: category?.heading ?? null,
    amount: formatMoney(item.amount, reader.locales),
    minorUnits: item.amount.amount,
    categoryId: item.categoryId,
  };
}
