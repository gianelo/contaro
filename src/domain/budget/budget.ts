/**
 * A Budget: the plan of expenses a Space expects to make in a given month, made
 * up of Budget items (see CONTEXT.md).
 *
 * The plan has no row of its own and no moment it is created. A Budget *is*
 * the items a Space has for a month, so it comes into existence with the first
 * one and needs nobody to declare it first: asking a Member to create an empty
 * plan before they can plan anything is a tollbooth in front of the only act
 * that matters. What the close of a month freezes (ADR-0002) is the month —
 * its Movements as much as its plan — so that does not hang here either.
 *
 * A Budget is a plan and never a limit: it never refuses a Movement, and
 * measuring real spending against it is #11.
 */

import { isMonth, type Month } from "../calendar/month";
import { categoriesVisibleTo, type Category } from "../category/category";
import type { CurrencyCode } from "../money/currency";
import { money, zero, type Money } from "../money/money";
import { spent, type Movement } from "../movement/movement";
import type { Space } from "../space/space";

/**
 * One expected expense inside a Budget: an amount for a Category, in a month.
 *
 * This is the Variable item of CONTEXT.md, and the only kind there is so far.
 * It carries no due date and no paid state, and that is the difference rather
 * than an omission: a Fixed item is a known amount on a known day whose
 * marking paid is what creates its Movement (#13), and a Variable item is an
 * expectation that Movements in its Category count against. There is nothing
 * on one to mark.
 */
export type BudgetItem = {
  id: string;
  spaceId: string;
  month: Month;
  categoryId: string;
  amount: Money;
};

/** An item as it is planned, before the database gives it an id. */
export type NewBudgetItem = Omit<BudgetItem, "id">;

/**
 * What arrives from the entry screen: strings and a number, none of them
 * trusted. The month is a plain string because a URL carries any string at
 * all, and the amount is minor units because the keypad counts in them.
 */
export type BudgetItemDraft = {
  spaceId: string;
  month: string;
  categoryId: string;
  amount: number;
};

/**
 * What a correction may change, and by its absence what it may not. An item
 * never moves between months or Spaces: that is not a correction of this plan
 * but an item on another one.
 */
export type BudgetItemAmendment = {
  categoryId?: string;
  amount?: number;
};

/**
 * The Space a plan is being made in, and the Categories it can see.
 *
 * Handed in rather than looked up, for the reason `Recording` is: it is what
 * lets every rule here be driven directly, and it keeps the domain free of the
 * database (ADR-0005). No clock: a plan is about a month somebody named, not
 * about the day it was written on.
 */
export type Planning = {
  space: Space;
  categories: readonly Category[];
};

/**
 * The point past which an expectation is a slipped thumb rather than a plan.
 *
 * The same ceiling as a Movement's, and deliberately: a plan and the spending
 * measured against it are compared all month (#11), and a plan that could hold
 * a figure no Movement can reach would be an expectation nothing could ever
 * meet.
 */
export const MAX_BUDGET_ITEM_AMOUNT = 999_999_999_999;

/**
 * Which answer on the entry screen was the bad one. Its own type for the
 * reason `MovementField` is: the domain throws over it and the screen switches
 * over it to say what went wrong, and a field added to one list and not the
 * other is a refusal nobody is ever told about.
 */
export type BudgetItemField = "amount" | "category" | "month" | "space";

/**
 * Thrown when an item cannot be planned or corrected as asked. `field` says
 * which answer was the bad one, so a screen can point at the input.
 */
export class UnplannableBudgetItemError extends Error {
  readonly field: BudgetItemField;

  constructor(field: BudgetItemField, reason: string) {
    super(`This Budget item cannot be planned: ${reason}.`);
    this.name = "UnplannableBudgetItemError";
    this.field = field;
  }
}

/**
 * What a Member's answers become, checked against the Space being planned for.
 *
 * Nothing here refuses a second item on a Category that already has one. That
 * is not an oversight and not a duplicate: several items on one Category are
 * how a person plans a month in weeks, and they behave as a single item of
 * their combined amount (`expectedByCategory`).
 */
export function planItem(
  draft: BudgetItemDraft,
  planning: Planning,
): NewBudgetItem {
  inTheSameSpace(draft.spaceId, planning.space.id);

  return {
    spaceId: planning.space.id,
    month: whichMonth(draft.month),
    categoryId: category(draft.categoryId, planning),
    amount: amount(draft.amount, planning.space.currency),
  };
}

/**
 * An item as a correction leaves it, held to every rule the planning was held
 * to.
 *
 * A Budget stays editable throughout its month (CONTEXT.md), and nothing here
 * asks whether the month is still open. The close is what shuts editing down,
 * it freezes a month's Movements as much as its plan, and it has not been
 * built yet -- so it will refuse this in one place, above the domain, rather
 * than growing a second half-answer here that would then have to agree with it.
 *
 * Neither the month nor the Space is a change: an item on another month is not
 * a correction of this plan, it is an item on another one. They are absent
 * from `BudgetItemAmendment`, so that is a refusal the type makes.
 */
export function amendItem(
  item: BudgetItem,
  changes: BudgetItemAmendment,
  planning: Planning,
): BudgetItem {
  inTheSameSpace(item.spaceId, planning.space.id);

  return {
    ...item,
    categoryId:
      changes.categoryId === undefined
        ? item.categoryId
        : category(changes.categoryId, planning),
    amount:
      changes.amount === undefined
        ? item.amount
        : amount(changes.amount, planning.space.currency),
  };
}

/**
 * What one Category is expected to cost this month, once per Category.
 *
 * This is where "several items on one Category behave exactly like a single
 * item of their combined amount" is said. The several are a way of thinking in
 * weeks -- sixty thousand of groceries a week rather than two hundred and
 * forty a month -- and not a way of creating four comparisons; #11 measures
 * spending against these entries, so there is one line per Category to be over
 * or under, however many items add up to it.
 *
 * The items stay several: this collapses them for the comparison and never in
 * the plan, so the four weeks remain four editable rows on the screen.
 *
 * The order is the order the Categories were first seen, for the reason
 * `movementsByDay` keeps the order within a day: which of two Categories comes
 * first is a question about how they were fetched, and the screen sorts by
 * what a person reads (`inReadingOrder`).
 */
export function expectedByCategory(
  items: readonly BudgetItem[],
  currency: CurrencyCode,
): readonly CategoryExpectation[] {
  const byCategory = new Map<string, Money>();

  for (const item of items) {
    inTheSameCurrency(item, currency);
    const running = byCategory.get(item.categoryId) ?? zero(currency);
    byCategory.set(
      item.categoryId,
      money(running.amount + item.amount.amount, currency),
    );
  }

  return [...byCategory.entries()].map(([categoryId, expected]) => ({
    categoryId,
    expected,
  }));
}

/** One Category of a month's plan, and what the whole of it expects. */
export type CategoryExpectation = {
  categoryId: string;
  expected: Money;
};

/**
 * One Category of a month's plan, what it expected, and what it really cost.
 *
 * `over` is the figure and not a flag, because the screen has to write it out:
 * "Te pasaste $100.000" is what tells a person who cannot see the red that
 * they are over, and a boolean would leave that sentence with nothing in it.
 * It is null rather than zero when nothing has been overspent, so "not over"
 * and "over by nothing" cannot be confused for one another.
 */
export type CategoryComparison = {
  categoryId: string;
  expected: Money;
  spent: Money;
  /** How far past its expected amount, or null while it is not past it. */
  over: Money | null;
  /**
   * How much of what it expected has been spent, as a share of it: 0.52 is
   * just over half. Past 1 on a Category that went over.
   *
   * Here and not in the reader that draws the meter, because it is the one
   * arithmetic on these two amounts that is not formatting — and a screen
   * doing sums on `Money.amount` is a screen that can disagree with the
   * figures beside it.
   */
  share: number;
};

/**
 * What each Category of a month's plan expected, and what it really cost.
 *
 * The rows are the plan's, not the spending's: a Category nobody planned for
 * has nothing to be over or under, and a comparison against no expectation is
 * a figure with one half missing rather than a line worth drawing.
 *
 * One comparison per Category, driven by the Category's monthly total. That is
 * the same rule `expectedByCategory` states for the plan, asked of the
 * spending too: four weekly items of sixty thousand are not four things to be
 * over, and neither are the eleven Movements measured against them. A Member
 * who is under on every single shop and over for the month is over, and this
 * is the only place that can see it.
 */
export function comparedToPlan(
  items: readonly BudgetItem[],
  movements: readonly Movement[],
  categories: readonly Category[],
  currency: CurrencyCode,
): readonly CategoryComparison[] {
  // The headings each Category sits under, read once rather than searched per
  // Movement per row: the same walk done inside a filter is the catalogue
  // walked again for every line the screen ends up drawing.
  const headings = new Map(
    categories.map((category) => [category.id, category.parentId]),
  );

  return expectedByCategory(items, currency).map(({ categoryId, expected }) => {
    // Asked through `spent` rather than summed here: "income is not spending"
    // and "two currencies are never added up" are that function's rules, and
    // a second copy of them is a second place for them to stop being true.
    const cost = spent(
      movements.filter((movement) =>
        countsAgainst(movement, categoryId, headings),
      ),
      currency,
    );

    return {
      categoryId,
      expected,
      spent: cost,
      over:
        cost.amount > expected.amount
          ? money(cost.amount - expected.amount, currency)
          : null,
      // Never a division by nothing: the domain refuses an item that expects
      // an amount of nothing, so a Category with a comparison has something
      // to be measured against.
      share: cost.amount / expected.amount,
    };
  });
}

/**
 * Whether a Movement is spending this row of the plan measures.
 *
 * A plan on a heading covers everything filed under it, which is the rule
 * `CategoryBranch` states and the only reading that makes a plan on "Comida"
 * mean anything: nobody shops under a heading, they shop under "Súper", and a
 * heading that counted only its own Movements would read zero all month.
 *
 * One step up and no further, because the catalogue is two levels and no more.
 * Income never gets here: it carries no Category at all (ADR-0016).
 */
function countsAgainst(
  movement: Movement,
  categoryId: string,
  headings: ReadonlyMap<string, string | null>,
): boolean {
  if (movement.categoryId === null) return false;

  return (
    movement.categoryId === categoryId ||
    headings.get(movement.categoryId) === categoryId
  );
}

/**
 * What the month's plan adds up to, in the Space's money.
 *
 * The currency is passed in rather than read off the first item, so a month
 * nobody has planned yet is still a figure denominated in the Space's money
 * rather than no answer at all -- the same reason `spent` takes one.
 */
export function expected(
  items: readonly BudgetItem[],
  currency: CurrencyCode,
): Money {
  return items.reduce((running, item) => {
    inTheSameCurrency(item, currency);
    return money(running.amount + item.amount.amount, currency);
  }, zero(currency));
}

/**
 * Two currencies are never added up. A plan in one money measured against
 * spending in another is not a comparison, and converting behind a person's
 * back is the one thing ADR-0007 exists to prevent.
 */
function inTheSameCurrency(item: BudgetItem, currency: CurrencyCode): void {
  if (item.amount.currency !== currency) {
    throw new UnplannableBudgetItemError(
      "amount",
      `${item.id} is in ${item.amount.currency} and this Space is in ${currency}`,
    );
  }
}

function inTheSameSpace(claimed: string, actual: string): void {
  if (claimed !== actual) {
    throw new UnplannableBudgetItemError(
      "space",
      "it is being planned in one Space and claims another",
    );
  }
}

function whichMonth(proposed: string): Month {
  if (!isMonth(proposed)) {
    throw new UnplannableBudgetItemError(
      "month",
      `"${proposed}" is not a month on any calendar`,
    );
  }

  return proposed;
}

function category(proposed: string, planning: Planning): string {
  // Asked through `categoriesVisibleTo` rather than beside it, exactly as a
  // Movement's Category is: "a Category added in one Space is invisible from
  // another" is one rule, and a second answer to it would eventually disagree.
  const visible = categoriesVisibleTo(planning.space.id, planning.categories);

  if (!visible.some((category) => category.id === proposed)) {
    throw new UnplannableBudgetItemError(
      "category",
      "it plans for a Category this Space does not have",
    );
  }

  return proposed;
}

function amount(proposed: number, currency: CurrencyCode): Money {
  if (!Number.isInteger(proposed)) {
    throw new UnplannableBudgetItemError(
      "amount",
      `${proposed} is not a whole number of minor units`,
    );
  }
  if (proposed <= 0) {
    // Expecting nothing of a Category is not a plan for it; it is the absence
    // of one, which is what having no item already says.
    throw new UnplannableBudgetItemError(
      "amount",
      "it expects an amount of nothing",
    );
  }
  if (proposed > MAX_BUDGET_ITEM_AMOUNT) {
    throw new UnplannableBudgetItemError(
      "amount",
      `it is larger than ${MAX_BUDGET_ITEM_AMOUNT} minor units`,
    );
  }

  return money(proposed, currency);
}
