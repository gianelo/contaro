"use client";

import type { Choice } from "./field";
import styles from "./segmented-field.module.css";
import { cx } from "./cx";
import { hitTarget } from "./hit-target";

export type SegmentedFieldProps = {
  name: string;
  /**
   * What the choice is, for somebody who cannot see the two halves side by
   * side. It names the group and is never printed: the canvas draws no heading
   * above the control, because two halves labelled "Gasto" and "Ingreso" say
   * what the question is to anybody looking at them.
   */
  legend: string;
  options: readonly Choice[];
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
};

/**
 * A choice with two answers, drawn as one track with the chosen half raised
 * out of it.
 *
 * The other shape this could take is `ChipField`, and that is what it was:
 * two pills, the chosen one filled with the accent. The difference is what the
 * shape says. Chips are a list a person picks from and can be any length —
 * twenty-four Categories are chips. A segmented control says "these are all of
 * them, and one is already true", which is what a direction is: a Movement is
 * money in or money out and never a third thing.
 *
 * Radios underneath for the same reasons `ChipField` uses them: the arrow keys
 * walk it, a screen reader counts it, the form submits it, and `required`
 * means what it says. The inputs are the size of their half and merely
 * invisible — never `display: none`, which would take them out of the tab
 * order along with the styling.
 */
export function SegmentedField({
  name,
  legend,
  options,
  value,
  onChange,
  required = false,
}: SegmentedFieldProps) {
  return (
    <div className={styles.track} role="radiogroup" aria-label={legend}>
      {options.map((option) => (
        <label
          key={option.value}
          className={cx(
            hitTarget,
            styles.half,
            value === option.value && styles.chosen,
          )}
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            required={required}
            className={styles.input}
          />
          <span>{option.label}</span>
        </label>
      ))}
    </div>
  );
}
