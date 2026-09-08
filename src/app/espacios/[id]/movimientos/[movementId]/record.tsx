import { t } from "@/i18n";
import { CategoryCircle } from "@/ui/category-circle";
import { cx } from "@/ui/cx";
import { Refusal } from "@/ui/refusal";
import type { ReadableMovement } from "../month";
import { amountOf } from "../row";
import styles from "./record.module.css";

export type MovementRecordProps = {
  movement: ReadableMovement;
};

/**
 * What a Movement's screen is once its month has been closed (#119): the
 * record, and why there is nothing to do to it.
 *
 * The correction form and the strike are the whole of this screen otherwise,
 * and both write into the month. So they come off, and something has to be
 * here in their place — a screen that showed a heading and then nothing would
 * read as a Movement that had gone missing rather than one that cannot change.
 * "Shown and not offered" is two halves and this is the first of them.
 *
 * It draws what the row that led here drew, in the order that screen reads it:
 * what it was, when, and how much. Not a form with its fields turned off — the
 * product has never greyed a control out, and a field somebody can put a
 * cursor in is a field that looks like it will accept something.
 *
 * The card under it is the one a paid item wears (`Refusal`), with nothing
 * passed to the slot that holds a way out. That refusal has an undo and is
 * owed the link to it; this one is the single act in contaro with none
 * (ADR-0002), and a control offering to try would be the unlock that has never
 * existed.
 */
export function MovementRecord({ movement }: MovementRecordProps) {
  return (
    <div className={styles.record}>
      <div className={styles.what}>
        <CategoryCircle mark={movement.mark} />
        <div className={styles.said}>
          <p className={styles.name}>{movement.name ?? movement.category}</p>
          {/*
            The Category and the day under it, the way the month's list writes
            its second line -- and the Category is here even when it is already
            the title above, because on this screen it is the answer to "what
            was this filed under" rather than a fallback for a missing name.
          */}
          <p className={styles.beneath}>
            {t("movements.closed.beneath", {
              category: movement.category,
              day: movement.day,
            })}
          </p>
        </div>
        <p
          className={cx(
            styles.amount,
            movement.direction === "income" && styles.income,
          )}
        >
          {/*
            The same written "+" the row on the month's list wears, out of the
            same function: income is signed and not only coloured (ADR-0016),
            and a second copy of that rule here is a second place for it to be
            forgotten.
          */}
          {amountOf(movement)}
        </p>
      </div>

      <Refusal
        title={t("movements.closed.title")}
        body={t("movements.closed.body")}
      />
    </div>
  );
}
