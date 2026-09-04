import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/ui/button";
import { t } from "@/i18n";
import { numberLocalesFor, readerOf } from "@/app/reader";
import { SpaceScreen } from "../../screen";
import { currentSpace } from "../../space";
import { categoryChips } from "../../movimientos/month";
import { readableBudgetItem } from "../budget";
import { BudgetItemForm } from "../form";
import { amendBudgetItemAction } from "../actions";
import { RemoveBudgetItem } from "./remove";
import styles from "./page.module.css";

/**
 * One item of the plan: correcting what a Category is expected to cost, or
 * taking it off the month altogether (#10).
 *
 * A Budget stays editable throughout its month, and nothing here asks whether
 * the month is still open. The close is what shuts editing down — it freezes
 * a month's Movements as much as its plan (ADR-0002) — and it has not been
 * built yet, so it will refuse this in one place rather than in two that would
 * then have to agree.
 */
export default async function BudgetItemPage({
  params,
}: {
  params: Promise<{ id: string; itemId: string }>;
}) {
  const { id, itemId } = await params;
  const space = await currentSpace(id);
  const asked = await headers();
  const reader = readerOf(asked);

  const item = await readableBudgetItem(space, itemId, reader);
  // Not found rather than forbidden, the way every route here refuses: an item
  // in a Space this Member is not in must read the same as one that never was.
  if (!item) notFound();

  const [categories, locales] = await Promise.all([
    categoryChips(space.id),
    Promise.resolve(numberLocalesFor(asked)),
  ]);

  // The item's own month, and never the one the Reader is standing in. An
  // item reached without a month in the URL -- a bookmark, a link somebody was
  // sent -- is still on the month it was planned for, and a Cancel or a
  // removal that landed on this month would land on a plan it was never in.
  const month = item.month;

  return (
    <SpaceScreen space={space} tab="budget">
      <h2 className={styles.title}>{t("budget.item.edit.title")}</h2>

      <BudgetItemForm
        spaceId={space.id}
        itemId={item.id}
        month={month}
        categories={categories}
        currency={space.currency}
        locales={locales}
        initial={{
          // The figure the keypad counts in, not the one on the row: reading
          // it back off the formatted string would mean parsing separators
          // that are the reader's rather than anybody's rule.
          amount: item.minorUnits,
          categoryId: item.categoryId,
        }}
        action={amendBudgetItemAction}
        submit={t("budget.item.save")}
        working={t("budget.item.save.working")}
      />

      <RemoveBudgetItem
        spaceId={space.id}
        itemId={item.id}
        month={month}
      />

      <div className={styles.back}>
        <ButtonLink href={`/espacios/${space.id}?mes=${month}`} variant="plain">
          {t("action.cancel")}
        </ButtonLink>
      </div>
    </SpaceScreen>
  );
}
