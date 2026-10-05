import { daysIn, monthOf } from "../calendar/month";
import {
  expectedByCategory,
  countsAgainst,
  isPaid,
  monthAgainstPlan,
  paceOf,
  type BudgetItem,
} from "../budget/budget";
import { categoriesVisibleTo, type Category } from "../category/category";
import { earned, spent, type Movement } from "../movement/movement";
import { zero } from "../money/money";
import type { ClosedMonth } from "./closure";
import { carryOverOf } from "./carry-over";
import type { Space } from "./space";

/** The renderer's data, independent of PDF layout or the requesting Reader. */
export function reportOfClosedMonth(source: {
  space: Space;
  closed: ClosedMonth;
  items: readonly BudgetItem[];
  movements: readonly Movement[];
  categories: readonly Category[];
}) {
  const { space, closed } = source;
  if (closed.spaceId !== space.id) {
    throw new Error("The close belongs to another Space.");
  }
  const items = source.items.filter(
    (item) => item.spaceId === space.id && item.month === closed.month,
  );
  const movements = source.movements.filter(
    (movement) => movement.spaceId === space.id &&
      monthOf(movement.occurredOn) === closed.month,
  );
  const categories = categoriesVisibleTo(space.id, source.categories);
  const totals = monthAgainstPlan(items, movements, space.currency);
  const days = daysIn(closed.month);
  const planned = new Map(
    expectedByCategory(items, space.currency).map((line) => [line.categoryId, line.expected]),
  );
  const parentOf = new Map(
    categories.map((category) => [category.id, category.parentId]),
  );
  // Heading lines include their children. They are detail, not additive totals.
  const lines = categories
    .map((category) => ({
      category,
      expected: planned.get(category.id) ?? zero(space.currency),
      spent: spent(
        movements.filter((movement) => countsAgainst(movement, category.id, parentOf)),
        space.currency,
      ),
    }))
    .filter((line) => line.expected.amount > 0 || line.spent.amount > 0);

  return {
    space,
    closed,
    plan: items,
    movements,
    fixed: items
      .filter((item) => item.kind === "fixed")
      .map((item) => ({ item, paid: isPaid(item) })),
    categories: lines,
    income: earned(movements, space.currency),
    totals,
    balance: carryOverOf(closed.month, totals),
    pace: paceOf(items, movements, categories, space.currency, { day: days, days }),
  };
}

export type MonthReport = ReturnType<typeof reportOfClosedMonth>;
