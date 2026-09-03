"use client";

import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import styles from "./field.module.css";
import { cx } from "./cx";
import { hitTarget } from "./hit-target";

type Common = {
  label: string;
  /** Shown under the control and read out with it. */
  hint?: string;
};

/**
 * The ids that tie a label and a hint to the control between them. One place,
 * because a hint that is only visible is a hint half the people on the screen
 * never get, and that is exactly the wiring easiest to get right in one field
 * and forget in the next.
 */
function useFieldIds(hint: string | undefined) {
  const id = useId();
  const hintId = `${id}-hint`;
  return { id, hintId, describedBy: hint ? hintId : undefined };
}

/** The frame every field wears: its label above, its hint below. */
function Labelled({
  label,
  hint,
  id,
  hintId,
  children,
}: Common & { id: string; hintId: string; children: ReactNode }) {
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      {children}
      {hint ? (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export type TextFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "className" | "id"
> &
  Common;

/**
 * A labelled text input. The label is a real <label>, tied to the control by a
 * generated id, so every field is reachable by its name in a test and by a
 * screen reader for the same reason.
 */
export function TextField({ label, hint, ...rest }: TextFieldProps) {
  const { id, hintId, describedBy } = useFieldIds(hint);

  return (
    <Labelled label={label} hint={hint} id={id} hintId={hintId}>
      <input
        {...rest}
        id={id}
        aria-describedby={describedBy}
        className={cx(hitTarget, styles.control)}
      />
    </Labelled>
  );
}

export type Choice = { value: string; label: string };

export type SelectFieldProps = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "className" | "id" | "children"
> &
  Common & {
    choices: readonly Choice[];
    /**
     * Shown first and selected until a person picks something, for a question
     * whose answer must be theirs. It carries no value, which is what gives
     * `required` teeth on a <select>: a picker that starts on a real choice
     * answers for whoever does not look.
     */
    placeholder?: string;
  };

/**
 * A labelled picker over a closed set. A native <select> on purpose: on a phone
 * it opens the platform's own wheel, which is the fastest picker a person owns
 * and the one they already know how to use.
 */
export function SelectField({
  label,
  hint,
  choices,
  placeholder,
  ...rest
}: SelectFieldProps) {
  const { id, hintId, describedBy } = useFieldIds(hint);

  return (
    <Labelled label={label} hint={hint} id={id} hintId={hintId}>
      <select
        {...rest}
        id={id}
        aria-describedby={describedBy}
        className={cx(hitTarget, styles.control, styles.select)}
      >
        {/* First, so a browser with nothing else to go on starts here. */}
        {placeholder === undefined ? null : (
          <option value="">{placeholder}</option>
        )}
        {choices.map((choice) => (
          <option key={choice.value} value={choice.value}>
            {choice.label}
          </option>
        ))}
      </select>
    </Labelled>
  );
}
