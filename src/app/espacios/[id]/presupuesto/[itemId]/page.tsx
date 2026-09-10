import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { AppShell } from "@/ui/app-shell";
import { ButtonLink } from "@/ui/button";
import { EntryHead } from "@/ui/entry-head";
import { Refusal } from "@/ui/refusal";
import { t } from "@/i18n";
import { numberLocalesFor, readerOf } from "@/app/reader";
import { currentSpace } from "../../space";
import { categoryChips } from "../../movimientos/month";
import { readableBudgetItem } from "../budget";
import { BudgetItemForm } from "../form";
import { FixedItemForm } from "../fixed-form";
import { amendBudgetItemAction, amendFixedItemAction } from "../actions";
import { RemoveBudgetItem } from "./remove";
import { monthIsClosed } from "../../closed";

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
 * A Budget stays editable throughout its month, and the close is what ends
 * that: `refuseAClosedMonth` refuses every write into a closed month in one
 * place, which every store asks before it writes — its plan and its Movements
 * alike (ADR-0002).
 *
 * #119 is that refusal arriving before somebody types instead of after they
 * submit. It is a question about a screen rather than about a rule, and the
 * shape the product already has for it is the paid item below: omission and a
 * sentence, never a greyed-out control. It is asked first because a closed
 * month refuses both kinds and both acts — the correction and the removal —
 * so branching on it inside either arm would be the same branch written twice.
 *
 * It carries no tab bar, no account row and no Space heading, which is why it
 * renders `AppShell` directly rather than going through `SpaceScreen` like
 * every other screen inside a Space. ADR-0028 made that trade for the
 * Movement entry screen and ADR-0047 read it again for the Movement
 * correction screen; this is that same reading extended to a plan item's
 * correction, which holds the identical typed-but-unsaved state — a keypad,
 * a name, a picker and a `Guardar` under the same thumb (#105). It is also the
 * only way either form fits a phone: neither did before this, on the worst
 * Space either can be opened in (ADR-0047 amended, which carries the
 * measurements).
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

  // The item's own month, and never the one the Reader is standing in. An item
  // reached without a month in the URL is still on the month it was planned
  // for, and everything that leaves this screen has to land back on that one.
  const month = item.month;

  const [categories, locales, closed] = await Promise.all([
    categoryChips(space.id),
    Promise.resolve(numberLocalesFor(asked)),
    // Asked of the item's month and never of the Reader's: an item planned for
    // a September that is closed is refused in October just the same.
    monthIsClosed(space.id, month),
  ]);

  // Where Cancelar goes on every branch: the month this item was opened from,
  // and never "this month" (the item may be on one the Reader is not standing
  // in at all).
  const back = `/espacios/${space.id}?mes=${month}`;

  /*
   * A closed month is shown and not offered (#119), before either kind is
   * asked which form it wants. Nothing on this screen survives the close: the
   * correction is refused, the removal is refused, and a paid item's link to
   * the Movement that paid it leads to a screen where striking it is refused
   * too — so the way out that a paid item is owed does not exist here, and a
   * sentence pointing at one would be a lie with good manners.
   *
   * There is no undo to name and there never will be (ADR-0002). What is left
   * is the item as it stands and the way back to the month it is on.
   */
  if (closed) {
    return (
      <AppShell>
        <EntryHead back={back} cancel={t("action.cancel")} title={item.name} />

        <Refusal
          title={t("budget.item.closed.title")}
          body={t("budget.item.closed.body")}
        />
      </AppShell>
    );
  }

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
        <AppShell>
          <EntryHead back={back} cancel={t("action.cancel")} title={item.name} />

          <Refusal
            title={t("budget.fixed.paid.title")}
            body={t("budget.fixed.paid.body")}
          >
            <ButtonLink
              href={`/espacios/${space.id}/movimientos/${item.paidBy}`}
              variant="plain"
            >
              {t("budget.fixed.paid.movement")}
            </ButtonLink>
          </Refusal>
        </AppShell>
      );
    }

    return (
      <AppShell>
        <EntryHead
          back={back}
          cancel={t("action.cancel")}
          title={t("budget.fixed.edit.title")}
        />

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
      </AppShell>
    );
  }

  return (
    <AppShell>
      <EntryHead
        back={back}
        cancel={t("action.cancel")}
        title={t("budget.item.edit.title")}
      />

      <BudgetItemForm
        spaceId={space.id}
        itemId={item.id}
        month={month}
        categories={categories}
        currency={space.currency}
        locales={locales}
        initial={{
          amount: item.minorUnits,
          name: item.name,
          categoryId: item.categoryId,
        }}
        action={amendBudgetItemAction}
        submit={t("budget.item.save")}
        working={t("budget.item.save.working")}
      />

      <RemoveBudgetItem spaceId={space.id} itemId={item.id} month={month} />
    </AppShell>
  );
}
