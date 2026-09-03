"use client";

import type { ReactNode } from "react";
import styles from "./chip-field.module.css";
import { cx } from "./cx";
import { hitTarget } from "./hit-target";

export type Chip = {
  value: string;
  label: string;
  /**
   * Added to what is read out, and never shown. For a choice whose visible
   * name is not unique on its own — two Categories called "Panadería" under
   * two different headings — so that what is heard names one of them.
   *
   * It becomes an `aria-label` and not a second span of hidden text. Hidden
   * text is joined to the visible label by the browser's own name-from-content
   * rules, and those differ: Chromium puts a space between two boxes and reads
   * out "Supermercado , Comida". A name that depends on which engine is asking
   * is a name no test can state. The visible label stays the start of it, so
   * somebody driving this screen by voice still says what they can see.
   */
  qualifier?: string;
};

export type ChipFieldProps = {
  name: string;
  legend: string;
  chips: readonly Chip[];
  defaultValue?: string;
  required?: boolean;
  /** Shown in place of the chips when there are none to offer. */
  empty?: ReactNode;
};

/**
 * A choice over a short closed set, laid out as chips a thumb picks from.
 *
 * Radio inputs and not buttons, which is what makes it one choice rather than
 * a row of independent things: a keyboard walks it with the arrow keys, a
 * screen reader announces "3 of 24", the browser submits it with the form, and
 * `required` means what it says. The chips are the labels; the inputs
 * themselves are off the screen and never `display: none`, which would take
 * them out of the tab order along with the styling.
 *
 * A <select> would be the other answer, and it is the one `SelectField` gives.
 * This is here because a Category has to be **one tap** from the amount (story
 * 19 in #1), and a native picker is two — open the wheel, then choose.
 */
export function ChipField({
  name,
  legend,
  chips,
  defaultValue,
  required = false,
  empty,
}: ChipFieldProps) {
  return (
    <fieldset className={styles.field}>
      <legend className={styles.legend}>{legend}</legend>

      {chips.length === 0 ? (
        <p className={styles.empty}>{empty}</p>
      ) : (
        <div className={styles.chips}>
          {chips.map((chip) => (
            <label key={chip.value} className={cx(hitTarget, styles.chip)}>
              <input
                type="radio"
                name={name}
                value={chip.value}
                defaultChecked={defaultValue === chip.value}
                required={required}
                aria-label={
                  chip.qualifier ? `${chip.label}, ${chip.qualifier}` : undefined
                }
                className={styles.input}
              />
              <span className={styles.label}>{chip.label}</span>
            </label>
          ))}
        </div>
      )}
    </fieldset>
  );
}
