import type { Month } from "@/domain/calendar/month";
import { reportOfClosedMonth } from "@/domain/space/report";
import type { Space } from "@/domain/space/space";
import type { Queries } from "./connection";
import { budgetItemsInMonth } from "./budget-items";
import { categoriesTheSpaceCanSee } from "./categories";
import { movementsInMonth } from "./movements";
import { findClosedMonth } from "./closed-months";
import { membersOfSpace } from "./spaces";

/**
 * Financial reads share one snapshot after the caller established membership.
 * No PDF is stored: each request builds from the closed month's rows.
 */
export async function readClosedMonthReport(db: Queries, space: Space, of: Month) {
  return db.transaction(async (tx) => {
    const closed = await findClosedMonth(tx, space.id, of);
    if (!closed) return null;

    const [items, movements, categories, members] = await Promise.all([
      budgetItemsInMonth(tx, space, of),
      movementsInMonth(tx, space, of),
      categoriesTheSpaceCanSee(tx, space.id),
      membersOfSpace(tx, space.id),
    ]);

    return {
      ...reportOfClosedMonth({
        space,
        closed,
        items,
        movements,
        categories,
      }),
      members,
    };
  }, { isolationLevel: "repeatable read", accessMode: "read only" });
}
