import { GroupedList, GroupedListItem } from "@/ui/grouped-list";
import { Icon } from "@/ui/icon";
import { Meter } from "@/ui/meter";
import { cx } from "@/ui/cx";
import { t } from "@/i18n";
import type { ReadableComparison } from "./budget";
import styles from "./variables.module.css";

/**
 * What the month planned for each Category, and what it really cost.
 *
 * One line per Category and never one per item: four weekly items of sixty
 * thousand are how a person plans a month in weeks, and they are one thing to
 * be over or under (`comparedToPlan`). The items themselves stay several, and
 * editable, in the plan above this.
 *
 * A Category that has passed what it expected is told three ways at once —
 * the figure and the meter turn, the triangle is drawn, and the amount is
 * written out. Somebody who cannot see the red still reads "Te pasaste
 * $100.000", which is the whole reason the sentence is there.
 */
export function Variables({
  comparisons,
}: {
  comparisons: readonly ReadableComparison[];
}) {
  // A month nobody has planned has nothing to compare. The plan above has
  // already said so in words, and a heading over no rows says it twice.
  if (comparisons.length === 0) return null;

  return (
    <GroupedList label={t("budget.variables")}>
      {comparisons.map((comparison) => {
        // The one fact this row turns on, named once: the figure turns, the
        // meter turns, and the sentence appears, all because this Category
        // is past what it expected. Kept as the amount rather than a flag,
        // so the sentence below still has the figure to write out.
        const { over } = comparison;

        return (
        <GroupedListItem key={comparison.categoryId}>
          <div className={cx(over !== null && styles.past)}>
            <div className={styles.line}>
              <span className={styles.category}>{comparison.category}</span>
              <span className={styles.figure}>
                {comparison.spent}{" "}
                <span className={styles.expectation}>
                  / {comparison.expected}
                </span>
              </span>
            </div>

            <div className={styles.meter}>
              <Meter filled={comparison.filled} over={over !== null} />
            </div>

            {over === null ? null : (
              <p className={styles.alert}>
                {/*
                  No label on the icon: the words beside it are the message,
                  and a screen reader that heard "alert triangle" first would
                  hear the same fact twice.
                */}
                <Icon name="alert-triangle" size={13} weight={2.2} />
                {t("budget.over", { amount: over })}
              </p>
            )}
          </div>
        </GroupedListItem>
        );
      })}
    </GroupedList>
  );
}
