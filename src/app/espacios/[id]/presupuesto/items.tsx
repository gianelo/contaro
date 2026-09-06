import { GroupedList, GroupedListItem } from "@/ui/grouped-list";
import { t } from "@/i18n";
import type { ReadableVariableItem } from "./budget";
import styles from "./items.module.css";

export type PlannedItemsProps = {
  spaceId: string;
  /**
   * The Variable items, in the order they were planned. Several on one
   * Category stay several rows, because they are how a person thinks in weeks
   * — sixty thousand of groceries a week rather than two hundred and forty a
   * month — and collapsing them here would take away the four rows they meant
   * to be able to edit.
   */
  items: readonly ReadableVariableItem[];
  /**
   * Whether the month has no item of either kind.
   *
   * Handed in rather than read off `items`, because a Budget is its items of
   * *either* kind (CONTEXT.md): a month with the rent on it and nothing else
   * has been planned, and the empty state belongs to the whole plan. The
   * screen above is what holds both lists, so it is what can answer this.
   */
  nothingPlanned: boolean;
};

/**
 * The Variable items of a month's plan: one row per item, in the order they
 * were planned (#10).
 *
 * Every row is read by its name, with the Category quiet under it (#79) — the
 * same shape the Fijos row above has, because it is the same question: which
 * of these four rows is the week I meant. The Category is what they have in
 * common, so it is what tells them apart least.
 *
 * The empty state lives inside the list rather than instead of it: a month
 * nobody has planned yet is the ordinary state of every first of the month,
 * and the heading over it says which list is empty.
 */
export function PlannedItems({
  spaceId,
  items,
  nothingPlanned,
}: PlannedItemsProps) {
  return (
    <GroupedList label={t("budget.title")}>
      {nothingPlanned ? (
        <GroupedListItem>{t("budget.empty")}</GroupedListItem>
      ) : (
        items.map((item) => (
          <GroupedListItem
            key={item.id}
            href={`/espacios/${spaceId}/presupuesto/${item.id}`}
            trailing={item.amount}
          >
            <span className={styles.name}>{item.name}</span>
            {/*
              The Category and the heading it sits under, on the one line the
              Fijos row draws its own second line on. Joined in the message
              rather than in the markup, so the separator is copy like every
              other word on the screen — and absent altogether where the
              Category is itself a heading, because there is nothing to say
              after it and a blank line still takes the height of one.
            */}
            <span className={styles.beneath}>
              {item.heading === null
                ? item.category
                : t("budget.item.beneath", {
                    category: item.category,
                    heading: item.heading,
                  })}
            </span>
          </GroupedListItem>
        ))
      )}
      {/*
        What the whole month's plan adds up to is no longer a row here: it is
        "Presupuestado" on the card at the top of the screen, beside the figure
        it was always meant to be read against (#40). A total at the foot of
        this list was the only place it could go while the two figures were
        deliberately kept apart, and it never was the total of exactly the rows
        above it -- the Fijos section is part of the plan too.
      */}
    </GroupedList>
  );
}
