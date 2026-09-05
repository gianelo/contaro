import { t } from "@/i18n";
import { cx } from "@/ui/cx";
import styles from "./totals.module.css";

export type MonthTotalsProps = {
  /** What came in and what went out, in the Space's money, already written. */
  earned: string;
  spent: string;
};

/**
 * The two figures the month is about, side by side at the top of its list.
 *
 * Two cards and not two rows of a list (#39). As rows they read as a list of
 * two things a thumb might tap, which is what a grouped list means everywhere
 * else on this screen — and neither of them goes anywhere. As cards they read
 * as what they are: the month's two numbers, above the rows that add up to
 * them.
 *
 * They are a labelled pair and never two bare figures. "$5.320.000" and
 * "$3.994.900" on one card says nothing about which is which, and the one
 * thing a person opens this screen for is which.
 */
export function MonthTotals({ earned, spent }: MonthTotalsProps) {
  return (
    <section className={styles.totals} aria-label={t("space.month")}>
      <div className={styles.card}>
        <span className={styles.label}>{t("space.month.income")}</span>
        <span className={cx(styles.figure, styles.income)}>{earned}</span>
      </div>
      <div className={styles.card}>
        <span className={styles.label}>{t("space.month.expenses")}</span>
        <span className={styles.figure}>{spent}</span>
      </div>
    </section>
  );
}
