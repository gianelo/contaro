import { Meter } from "@/ui/meter";
import { t } from "@/i18n";
import type { ReadableMonthSummary, ReadablePace } from "./budget";
import { Pace } from "./pace";
import styles from "./summary.module.css";

/** What the canvas draws the meter across a card at, against 7 in a row. */
const ACROSS_A_CARD = 10;

export type MonthSummaryProps = {
  /**
   * The month's two figures and the comparison between them, as one shape.
   *
   * Taken whole rather than spread into four props, which is the point of
   * `ReadableMonthSummary` existing: four props are four things a caller can
   * source separately, and the meter would then be drawable beside figures
   * from another month.
   */
  summary: ReadableMonthSummary;
  /** How the spending is going against the calendar (#14), or nothing. */
  pace: ReadablePace | null;
};

/**
 * What the month cost and what it was planned to cost, in one card (#40).
 *
 * The two figures have been on this screen since #10, deliberately in separate
 * lists so that neither read as a comparison before #11 decided what "over"
 * means. #11 decided it, and this is where they come back together: the card
 * is the comparison, and the meter under them is #11's last criterion — the
 * only part of it that never shipped, because the card it named arrives here.
 *
 * The plan is written quieter than the spending, and that is the ranking
 * rather than decoration. "Gastado" is the figure a person opened the screen
 * for; "Presupuestado" is what it is being read against.
 *
 * A card and not two rows of a grouped list, for the reason the month's list
 * stopped being one (#39): as rows they read as a list of things a thumb might
 * tap, and neither of them goes anywhere.
 */
export function MonthSummary({
  summary: { spent, planned, filled, over },
  pace,
}: MonthSummaryProps) {
  return (
    <section className={styles.card} aria-label={t("space.month")}>
      <div className={styles.figures}>
        <div className={styles.spending}>
          <span className={styles.label}>{t("space.month.spent")}</span>
          <span className={styles.spent}>{spent}</span>
        </div>
        <div className={styles.plan}>
          <span className={styles.label}>{t("budget.budgeted")}</span>
          <span className={styles.planned}>{planned}</span>
        </div>
      </div>

      {/*
        Nothing to draw on a month nobody has planned: a share of no plan is a
        share of nothing, and an empty length would say the month has spent
        none of a plan that does not exist. The plan's own empty state says the
        true thing, in words, further down the screen.
      */}
      {filled === null ? null : (
        <div className={styles.meter}>
          <Meter filled={filled} over={over} height={ACROSS_A_CARD} />
        </div>
      )}

      {/*
        The pace under the meter, which is where the canvas draws it and what
        it is about: "Gastado", how much of the plan that is, and then whether
        it is early or late. It draws nothing at all on a month nobody is
        standing in.
      */}
      {pace === null ? null : (
        <div className={styles.pace}>
          <Pace pace={pace} />
        </div>
      )}
    </section>
  );
}
