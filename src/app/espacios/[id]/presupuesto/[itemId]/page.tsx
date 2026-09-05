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
import { FixedItemForm } from "../fixed-form";
import { amendBudgetItemAction, amendFixedItemAction } from "../actions";
import { RemoveBudgetItem } from "./remove";
import styles from "./page.module.css";

/**
 * One item of the plan: correcting it, or taking it off the month altogether
 * (#10 for a Variable item, #48 for a Fixed one).
 *
 * One URL and two forms, because there is one item and the two kinds are asked
 * different questions: a Variable item sets what a Category is expected to
 * cost, and a Fixed one is a named amount on a named day. Which form is a
 * branch here rather than a second route, so the row that opens an item does
 * not have to know which kind it is to link to it.
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

  // The item's own month, and never the one the Reader is standing in. An item
  // reached without a month in the URL is still on the month it was planned
  // for, and everything that leaves this screen has to land back on that one.
  const month = item.month;

  const back = (
    <div className={styles.back}>
      <ButtonLink href={`/espacios/${space.id}?mes=${month}`} variant="plain">
        {t("action.cancel")}
      </ButtonLink>
    </div>
  );

  if (item.kind === "fixed") {
    /*
     * A paid item is shown and not offered. The domain refuses its correction
     * and its removal outright while its payment stands (ADR-0034), so a form
     * here would be a form that could only be filled in and then refused —
     * and a person owed that refusal is owed it before they type, together
     * with the one thing that undoes it.
     */
    if (item.paidBy !== null) {
      return (
        <SpaceScreen space={space} tab="budget">
          <h2 className={styles.title}>{item.name}</h2>

          <div className={styles.paid}>
            <p className={styles.paidTitle}>{t("budget.fixed.paid.title")}</p>
            <p className={styles.paidBody}>{t("budget.fixed.paid.body")}</p>
            <ButtonLink
              href={`/espacios/${space.id}/movimientos/${item.paidBy}`}
              variant="plain"
            >
              {t("budget.fixed.paid.movement")}
            </ButtonLink>
          </div>

          {back}
        </SpaceScreen>
      );
    }

    return (
      <SpaceScreen space={space} tab="budget">
        <h2 className={styles.title}>{t("budget.fixed.edit.title")}</h2>

        <FixedItemForm
          spaceId={space.id}
          itemId={item.id}
          month={month}
          categories={categories}
          currency={space.currency}
          locales={locales}
          initial={{
            amount: item.minorUnits,
            name: item.name,
            dueDay: item.dueDay,
            categoryId: item.categoryId,
          }}
          action={amendFixedItemAction}
          submit={t("budget.item.save")}
          working={t("budget.item.save.working")}
        />

        <RemoveBudgetItem spaceId={space.id} itemId={item.id} month={month} />

        {back}
      </SpaceScreen>
    );
  }

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
        initial={{ amount: item.minorUnits, categoryId: item.categoryId }}
        action={amendBudgetItemAction}
        submit={t("budget.item.save")}
        working={t("budget.item.save.working")}
      />

      <RemoveBudgetItem spaceId={space.id} itemId={item.id} month={month} />

      {back}
    </SpaceScreen>
  );
}
