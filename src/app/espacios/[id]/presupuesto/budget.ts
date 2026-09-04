import { database } from "@/db/client";
import { budgetItemsInMonth, findBudgetItemInSpace } from "@/db/budget-items";
import { categoriesTheSpaceCanSee } from "@/db/categories";
import { movementsInMonth } from "@/db/movements";
import {
  comparedToPlan,
  expected,
  type BudgetItem,
} from "@/domain/budget/budget";
import {
  monthOf,
  monthsToPlan,
  type Month,
  type MonthsToPlan,
} from "@/domain/calendar/month";
import { formatAmount, formatMoney } from "@/domain/money/money";
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

/**
 * One Category of the plan, what it expected, and what it really cost (#11).
 *
 * Two strings for one figure: the screen writes "$210.000 / 400.000" as a
 * single amount whose second half is quieter, so the symbol belongs to the
 * first half only (`formatAmount`).
 */
export type ReadableComparison = {
  categoryId: string;
  category: string;
  /** What the Category has cost so far, with the symbol on it. */
  spent: string;
  /** What the whole of it expected, without one: `spent` carries it. */
  expected: string;
  /**
   * How far past what it expected, written out. Null while it is inside the
   * plan. A string and not a flag, because the sentence a person reads is
   * "Te pasaste $100.000" and that is what tells somebody who cannot see the
   * red that they are over.
   */
  over: string | null;
  /**
   * How much of the plan has been spent, as a fraction of it: what the meter
   * draws. Past 1 on a Category that went over, which the meter clamps.
   */
  filled: number;
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
   * The same items collapsed to one line per Category and measured against
   * what really got spent (#11), which is what "several items on one Category
   * behave as a single item of their combined amount" means once it reaches
   * eyes.
   *
   * Every Category the month planned for, not only those with several items:
   * #10 hid the single ones because the line only repeated the row above it,
   * and now it carries what the row above cannot — the spending.
   */
  variables: readonly ReadableComparison[];
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
  const [planned, spending, categories, catalogue] = await Promise.all([
    budgetItemsInMonth(database(), space, month),
    // Read here rather than handed in by the screen, so this stays one
    // question anybody can ask: a reader that only works when another reader
    // has already run is a reader with a screen baked into it.
    movementsInMonth(database(), space, month),
    // The headings, so a plan on "Comida" counts what was spent under
    // "Comida · Súper". The catalogue below names Categories; this one says
    // which sits under which, and `comparedToPlan` needs the second.
    categoriesTheSpaceCanSee(database(), space.id),
    readableCatalogueFor(space.id),
  ]);

  const named = namesFrom(catalogue);

  return {
    month,
    label: monthLabel(month, monthOf(reader.today)),
    around: monthsToPlan(month),
    items: planned.map((item) => readable(item, named, reader)),
    variables: comparedToPlan(
      planned,
      spending,
      categories,
      space.currency,
    ).map(({ categoryId, expected, spent, over, share }) => ({
      categoryId,
      category: named.get(categoryId)?.name ?? categoryId,
      spent: formatMoney(spent, reader.locales),
      expected: formatAmount(expected, reader.locales),
      over: over === null ? null : formatMoney(over, reader.locales),
      filled: share,
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
