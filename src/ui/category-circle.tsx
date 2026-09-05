import { Icon } from "./icon";
import type { CategoryMark } from "./category-mark";
import styles from "./category-circle.module.css";
import { cx } from "./cx";

/** The size the canvas draws the icon inside the circle, at the common weight. */
const GLYPH = 15;

export type CategoryCircleProps = {
  /**
   * What to draw and in which tint. It arrives decided: `categoryMark` in
   * `@/i18n/category` answers it for a Category, and `incomeMark` beside it
   * answers it for money coming in, which is not a Category at all.
   */
  mark: CategoryMark;
};

/**
 * The tinted circle at the start of a row on the month's list.
 *
 * It is drawn for every row and never left out, including the rows whose mark
 * is a letter. The circle is what keeps every row's text starting in the same
 * place down the list, so a row without one is not a row missing a picture --
 * it is a row that has stepped out of the column its neighbours are in.
 *
 * Hidden from a screen reader whichever half it is drawing. The Category's
 * name is the very next thing on the row: an icon labelled "carrito" beside
 * the word "Comida" is the row read out twice, and a letter announced beside
 * the word it is the first letter of is worse than that.
 */
export function CategoryCircle({ mark }: CategoryCircleProps) {
  return (
    <span className={cx(styles.circle, styles[mark.tint])} aria-hidden="true">
      {mark.kind === "icon" ? (
        <Icon name={mark.name} size={GLYPH} />
      ) : (
        mark.letter
      )}
    </span>
  );
}
