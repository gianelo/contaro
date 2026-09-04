import { database } from "@/db/client";
import { budgetItemsInMonth, findBudgetItemInSpace } from "@/db/budget-items";
import { categoriesTheSpaceCanSee } from "@/db/categories";
import { movementsInMonth } from "@/db/movements";
import {
  comparedToPlan,
  dueNotice,
  expected,
  isPaid,
  paceOf,
  type BudgetItem,
  type DueNotice,
  type FixedItem,
  type PaceStanding,
  type VariableItem,
} from "@/domain/budget/budget";
import {
  monthOf,
  monthSoFar,
  monthsToPlan,
  type Month,
  type MonthsToPlan,
} from "@/domain/calendar/month";
import type { Category } from "@/domain/category/category";
import type { CurrencyCode } from "@/domain/money/currency";
import { formatAmount, formatMoney } from "@/domain/money/money";
import type { Movement } from "@/domain/movement/movement";
import type { Space } from "@/domain/space/space";
import { t } from "@/i18n";
import { monthLabel, shortDayLabel } from "@/i18n/day";
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

/**
 * The pace of the month, already in words (#14).
 *
 * Two halves for one sentence, the way the payment confirmation is two: the
 * canvas writes the standing in heavier ink than the day it is counted from,
 * and a single interpolated string would render both the same. Split at a
 * clause boundary, so neither half carries a space it could lose.
 *
 * `ahead` and not a `kind`: this is the whole of what the screen still has to
 * decide, because past the pace is the only one of the three answers that is a
 * warning. Behind it and on it are the same quiet line with different words.
 */
export type ReadablePace = {
  /** "Día 18 de 30 · en gastos variables vas". */
  lead: string;
  /** "$620.000 arriba del ritmo", or "justo en el ritmo". */
  standing: string;
  /** Whether the month is spending faster than an even pace. */
  ahead: boolean;
};

/**
 * One Fixed item, as the FIJOS section shows it (#13).
 *
 * Everything here is already words. The row draws a name, a line under it and
 * a badge, and the two decisions behind those -- how near the day is, and
 * whether it is paid -- were made in the domain and said in the interface's
 * language here, so the component has nothing left to decide.
 */
export type ReadableFixedItem = {
  id: string;
  /** What the row is called: "Arriendo", "Netflix". */
  name: string;
  /**
   * The Category it is filed under, named. Carried apart from the line below
   * as well as inside it, because the confirmation writes it into a sentence
   * of its own — and reading it back out of `beneath` would mean splitting a
   * formatted string on a separator that is copy.
   */
  category: string;
  /** The line under the name: "Vivienda · 1 sep". */
  beneath: string;
  amount: string;
  /**
   * Whether it has been paid, which is the badge. A boolean and not the two
   * words, because the row also turns on it: a paid item is not tappable and
   * says nothing about its day.
   */
  paid: boolean;
  /**
   * What its day means, while it is pending and close: "vence en 4 días",
   * "vence hoy", "vencido". Null while it is far off or already paid.
   *
   * In words and never only in the amber it is written in (#13). Somebody who
   * cannot tell the two greys apart still reads that the day is near, which is
   * the whole reason the sentence is there -- and it says the day is near and
   * nothing more, because the advance warning before a subscription renews is
   * phase two in #1.
   */
  due: string | null;
};

/** One Space's Budget for a month, as the screen showing it needs to know it. */
export type ReadableBudget = {
  month: Month;
  /** The month named at the top of the screen: "Septiembre". */
  label: string;
  /** Where the control at the top of the screen can go from here. */
  around: MonthsToPlan;
  /**
   * The Variable items, in the order they were planned. Several on one
   * Category stay several here: they are how a person thinks in weeks, and
   * collapsing them on the screen would take away the four rows they meant to
   * edit.
   */
  items: readonly ReadableBudgetItem[];
  /**
   * The Fixed items, in the order they were planned, drawn above the rest
   * (#13). Their own list and not rows among the others, because they are read
   * for a different question: not "how much is left" but "what have I paid".
   */
  fixed: readonly ReadableFixedItem[];
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
  /**
   * What the whole month's plan adds up to, in the Space's money -- both kinds
   * together, because both are what the month expects to cost (#13).
   */
  expected: string;
  /**
   * Whether the month is ahead of or behind an even spread of its Variable
   * items, or nothing where there is no such question to answer (#14).
   */
  pace: ReadablePace | null;
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
    items: planned
      .filter((item): item is VariableItem => item.kind === "variable")
      .map((item) => readable(item, named, reader)),
    fixed: planned
      .filter((item): item is FixedItem => item.kind === "fixed")
      .map((item) => readableFixed(item, named, reader)),
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
    pace: readablePace(
      planned,
      spending,
      categories,
      space.currency,
      month,
      reader,
    ),
  };
}

/**
 * The pace of the month put into words, or nothing where there is none.
 *
 * Two ways there is none, and both of them are silence rather than a figure.
 * A month the Reader is not standing in has no day to count from -- the plan
 * walks months in both directions (`monthsToPlan`), and "Día 18 de 30" about
 * October read in September is a sentence about a day nobody is on. A month
 * with no Variable item has nothing anybody meant to spread across it.
 *
 * The day is the Reader's and never the server's (ADR-0018), which is what
 * makes the first of those two answers come out right at nine at night on the
 * 30th: the server is already in the next month, and this is not.
 */
function readablePace(
  planned: readonly BudgetItem[],
  spending: readonly Movement[],
  categories: readonly Category[],
  currency: CurrencyCode,
  month: Month,
  reader: Reader,
): ReadablePace | null {
  const through = monthSoFar(month, reader.today);

  if (through === null) return null;

  const pace = paceOf(planned, spending, categories, currency, through);

  if (pace === null) return null;

  return {
    lead: t("budget.pace.lead", { day: pace.day, days: pace.days }),
    standing: standingInWords(pace.standing, reader),
    ahead: pace.standing.kind === "ahead",
  };
}

/**
 * The three things a standing can be, in the interface's language.
 *
 * Beside the reader that uses it rather than in the domain, for the reason
 * `dueInWords` is here: which of the three it is, is a rule and is decided
 * once in `paceOf`; what a person reads is copy, and copy is Spanish. The
 * switch is exhaustive, so a fourth standing added upstream is a type error
 * here rather than a blank sentence on somebody's plan.
 */
function standingInWords(standing: PaceStanding, reader: Reader): string {
  switch (standing.kind) {
    case "ahead":
      return t("budget.pace.ahead", {
        amount: formatMoney(standing.by, reader.locales),
      });
    case "behind":
      return t("budget.pace.behind", {
        amount: formatMoney(standing.by, reader.locales),
      });
    case "onPace":
      return t("budget.pace.onPace");
  }
}

/** One item of a Space's plan, as its correction screen shows it. */
export async function readableBudgetItem(
  space: Space,
  itemId: string,
  reader: Reader,
): Promise<ReadableBudgetItem | null> {
  const item = await findBudgetItemInSpace(database(), space, itemId);
  // A Fixed item reads as no item at all from here, and so its correction
  // screen is a 404. It is a screen shaped for the other kind: it asks for a
  // Category and an amount and nothing else, so opening one on a Fixed item
  // would offer to save a row with its name, its day and its payment quietly
  // left out. #13 gave the kind no correction screen of its own; this is that
  // gap said out loud rather than half-answered.
  if (!item || item.kind === "fixed") return null;

  return readable(item, namesFrom(await readableCatalogueFor(space.id)), reader);
}

/**
 * A Fixed item put into words.
 *
 * The Category is named through `readableCatalogueFor` like everything else,
 * and falls back to its identifier for the reason the Variable row does: a
 * plan whose Category was retired by a migration is a figure a person should
 * still see, and a line with nothing on the left of it is a line nobody can
 * tap on purpose.
 */
function readableFixed(
  item: FixedItem,
  named: Naming,
  reader: Reader,
): ReadableFixedItem {
  const notice = dueNotice(item, reader.today);
  const category = named.get(item.categoryId)?.name ?? item.categoryId;

  return {
    id: item.id,
    name: item.name,
    category,
    beneath: t("budget.fixed.beneath", {
      category,
      day: shortDayLabel(item.dueOn),
    }),
    amount: formatMoney(item.amount, reader.locales),
    paid: isPaid(item),
    due: notice === null ? null : dueInWords(notice),
  };
}

/**
 * The four things a due day can mean, in the interface's language.
 *
 * Beside the reader that uses it rather than in the domain: which of the four
 * it is, is a rule and is decided once in `dueNotice`; what a person reads is
 * copy, and copy is Spanish (story 43 in #1). The switch is exhaustive, so a
 * fifth kind added upstream is a type error here rather than a blank line on
 * somebody's plan.
 */
function dueInWords(notice: DueNotice): string {
  switch (notice.kind) {
    case "overdue":
      return t("budget.fixed.due.overdue");
    case "today":
      return t("budget.fixed.due.today");
    case "tomorrow":
      return t("budget.fixed.due.tomorrow");
    case "soon":
      return t("budget.fixed.due.soon", { days: notice.days });
  }
}

function readable(
  item: VariableItem,
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
