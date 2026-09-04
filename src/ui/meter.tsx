import { cx } from "./cx";
import styles from "./meter.module.css";

export type MeterProps = {
  /**
   * How much of the length has been used, as a fraction of it: 0.52 is 52%.
   * A fraction and not two amounts, because a meter is a shape and the money
   * belongs to the figure beside it — one that already says both halves.
   */
  filled: number;
  /** Whether the length being measured has been passed. */
  over?: boolean;
  /** How thick it is drawn, in pixels: 7 in a row, 10 across a card. */
  height?: number;
};

/**
 * A length, and how much of it has been used.
 *
 * It says nothing to a screen reader on purpose, and unlike `Icon` it offers
 * no way to change that. `Icon` needs one because an icon is sometimes the
 * only thing on a control saying what it does — a close button has no words
 * beside it. A meter is never that: it is a second drawing of a figure, and
 * a figure that has not been written out is a figure nobody can read anyway.
 * So the quiet is the component's rule rather than each caller's choice, and
 * a caller who wants it announced has a missing figure, not a missing prop.
 *
 * The one place this bites is a gallery, where meters stand with no figure
 * at all; that is why the gallery labels each of them itself.
 */
export function Meter({ filled, over = false, height = 7 }: MeterProps) {
  return (
    <div
      aria-hidden
      className={cx(styles.track, over && styles.over)}
      style={{ height }}
    >
      <div
        data-meter-fill
        className={styles.fill}
        style={{ width: `${lengthOf(filled)}%` }}
      />
    </div>
  );
}

/**
 * The fraction as a percentage, kept inside the meter it is drawn in.
 *
 * A month that spent double what it planned is not a bar twice the width of
 * the row: it is a full bar, and how far past is said in words beside it. The
 * clamp is here rather than at every call site for that reason — a meter that
 * could overflow its track is a meter one caller's arithmetic can break.
 */
function lengthOf(filled: number): number {
  if (!Number.isFinite(filled)) return 0;

  return Math.min(100, Math.max(0, filled * 100));
}
