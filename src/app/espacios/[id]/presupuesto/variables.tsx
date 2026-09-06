import Link from "next/link";
import { GroupedList } from "@/ui/grouped-list";
import { Icon } from "@/ui/icon";
import { Meter } from "@/ui/meter";
import { cx } from "@/ui/cx";
import { hitTarget } from "@/ui/hit-target";
import { t } from "@/i18n";
import type { ReadableComparison } from "./budget";
import styles from "./variables.module.css";

/**
 * The chevron that says a row opens, at the two sizes the canvas draws it: 16
 * on a Category's row, 15 on a row of the tray it opens.
 *
 * The one pixel is the canvas's and not a distinction anybody is meant to see,
 * so it is two constants rather than one — a single number would be this file
 * deciding the artboards had made a mistake, and they may well not have.
 */
const ROW_CHEVRON = 16;
const TRAY_CHEVRON = 15;
/**
 * Heavier than the common weight, because the canvas draws it heavier: both
 * chevrons are `stroke-width="2.5"` on the #63 artboards.
 *
 * Stated as what the canvas does and not as a rule, because there is no rule
 * to cite. ADR-0026 records 2.5 against a 13px `chevron-down` and its argument
 * is optical — smaller means heavier — which would not reach a chevron at 15
 * or 16. The canvas draws the same weight at all three sizes, which is why
 * that ADR keeps saying the screen states the weight rather than deriving it.
 */
const CHEVRON_WEIGHT = 2.5;

/**
 * What the month planned for each Category, what it really cost, and — under
 * each row — the items that figure is made of (#63).
 *
 * One line per Category and never one per item: four weekly items of sixty
 * thousand are how a person plans a month in weeks, and they are one thing to
 * be over or under (`comparedToPlan`). The items are still every one of them
 * here and still every one of them correctable; they are one tap deeper,
 * under the figure they add up to.
 *
 * That tray is what this section grew for. The screen used to draw the items
 * again in a list of their own headed "El plan del mes", which meant every
 * Category with a plan on it appeared twice under two headings and neither
 * appearance said what the other was for. The question "what is this
 * $1.600.000 made of" has one answer and it belongs under the $1.600.000.
 *
 * A Category that has passed what it expected is told three ways at once —
 * the figure and the meter turn, the triangle is drawn, and the amount is
 * written out. Somebody who cannot see the red still reads "Te pasaste
 * $100.000", which is the whole reason the sentence is there.
 */
export function Variables({
  spaceId,
  comparisons,
}: {
  /** Whose plan this is: what each row of a tray links into. */
  spaceId: string;
  comparisons: readonly ReadableComparison[];
}) {
  // A month nobody has planned has nothing to compare. The screen above says
  // so in words, and a heading over no rows says it twice.
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
          /*
            The row is written out here rather than reached for through
            `GroupedListItem`, which every other list on this screen uses. That
            component draws one row: a line, and at most a control beside it.
            This is a row *and* what opens under it, and the two are one
            element -- the disclosure is the `<li>`, and the tray has to reach
            both edges of the card the way the canvas draws it, which nothing
            inside a row's padding can. The list itself is still `GroupedList`,
            so the heading, the card and the group a screen reader can skip to
            are the same ones the Fijos section has.
          */
          <li key={comparison.categoryId} className={styles.item}>
            {/*
              Native `<details>` and not React state. It opens before any
              JavaScript has loaded, for the reason a row that goes somewhere
              is a link; the keyboard and the accessibility tree already know
              what a disclosure is and say so without being told; and this
              section stays a server component, which is what keeps the
              month's figures off the wire as props.

              No `open` on any of them: the two figures are what the screen is
              read for, and the items behind them are what somebody reaches
              for once one of those figures surprises them.
            */}
            <details>
              {/*
                The comparison is the summary: tapping the row is what opens
                it, so what a thumb aims at and what it gets are the same
                shape. `hitTarget` for the reason every other control composes
                it -- the row is taller than 44px with a meter in it, and it
                is a control whatever it happens to contain.
              */}
              <summary
                className={cx(hitTarget, styles.summary, over !== null && styles.past)}
              >
                {/*
                  Spans told to be boxes, and every one of them deliberate: a
                  `<summary>` takes phrasing content and nothing else, so the
                  divs and the `<p>` this row was built from are markup no
                  validator accepts. Every browser draws them and the
                  accessibility tree is unbothered, which is exactly why this
                  is worth writing down -- nothing would ever have told us.
                  The stylesheet gives each of them the `display` its old tag
                  came with, so the drawing is unchanged.
                */}
                <span className={styles.body}>
                  <span className={styles.line}>
                    <span className={styles.category}>{comparison.category}</span>
                    <span className={styles.figure}>
                      {comparison.spent}{" "}
                      <span className={styles.expectation}>
                        / {comparison.expected}
                      </span>
                    </span>
                  </span>

                  <span className={styles.meter}>
                    <Meter filled={comparison.filled} over={over !== null} />
                  </span>

                  {over === null ? null : (
                    <span className={styles.alert}>
                      {/*
                        No label on the icon: the words beside it are the
                        message, and a screen reader that heard "alert
                        triangle" first would hear the same fact twice.
                      */}
                      <Icon name="alert-triangle" size={13} weight={2.2} />
                      {t("budget.over", { amount: over })}
                    </span>
                  )}
                </span>

                {/*
                  And no label on this one either, for a different reason: a
                  `<summary>` already announces itself as expanded or
                  collapsed, so a chevron that also said "abrir" would be the
                  state read out twice and once in the wrong words. It is the
                  drawing of something the platform has already said.
                */}
                <span className={styles.chevron}>
                  <Icon
                    name="chevron-right"
                    size={ROW_CHEVRON}
                    weight={CHEVRON_WEIGHT}
                  />
                </span>
              </summary>

              {/*
                What the figure above is made of. Headed, and headed for the
                Category rather than for the month: "El plan del mes" over
                these rows is the sentence that made the screen read as two
                plans, and this is one Category's share of one.

                A line of words and not a labelled group. The list is inside a
                disclosure a screen reader has already announced by the
                Category's own name, so naming the list a second time would be
                the Category read out twice — the reasoning `Meter` and `Icon`
                make for staying quiet, applied a level up. Making it a named
                group would also cost this section its `useId`, and with it
                the "use client" it does not have.
              */}
              <div className={styles.tray}>
                <p className={styles.trayLabel}>{t("budget.variables.plan")}</p>

                <ul className={styles.plan}>
                  {comparison.plan.map((item) => (
                    <li key={item.id}>
                      {/*
                        Every row goes where the row it stands for goes: that
                        item's own correction screen, which is one URL for
                        either kind since #48. A link and not a button, so it
                        opens in a new tab and works with no JavaScript --
                        which is also what the disclosure around it does.
                      */}
                      <Link
                        href={`/espacios/${spaceId}/presupuesto/${item.id}`}
                        className={cx(hitTarget, styles.planRow)}
                      >
                        {/*
                          The name and the amount in one wrapping box, with the
                          chevron outside it -- the shape the comparison above
                          has, and for the same reason (ADR-0036). An amount
                          has no break opportunity in it, and the card this
                          list sits in is `overflow: hidden`, so a row that
                          negotiated nothing would not spill where anybody
                          could see it. It would be cut.
                        */}
                        <span className={styles.planText}>
                          <span className={styles.planName}>{item.name}</span>
                          <span className={styles.planAmount}>
                            {item.amount}
                          </span>
                        </span>

                        <span className={styles.planChevron}>
                          <Icon
                            name="chevron-right"
                            size={TRAY_CHEVRON}
                            weight={CHEVRON_WEIGHT}
                          />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </details>
          </li>
        );
      })}
    </GroupedList>
  );
}
