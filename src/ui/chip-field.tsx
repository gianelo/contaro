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
  /** What is chosen to begin with, when nothing outside is tracking it. */
  defaultValue?: string;
  /**
   * What is chosen, when something outside is. Pass it with `onChange` to make
   * the field controlled — the way `SelectField` is — for a choice the rest of
   * the screen has to react to, such as the direction of a Movement deciding
   * whether there is a Category to ask about at all.
   */
  value?: string;
  onChange?: (value: string) => void;
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
  value,
  onChange,
  required = false,
  empty,
}: ChipFieldProps) {
  // Controlled or not, never half of each: React warns about a `checked` with
  // no `onChange`, and an input that switches between the two mid-life loses
  // what the person had chosen.
  const controlled = value !== undefined && onChange !== undefined;

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
                {...(controlled
                  ? {
                      checked: value === chip.value,
                      onChange: () => onChange(chip.value),
                    }
                  : { defaultChecked: defaultValue === chip.value })}
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
