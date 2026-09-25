import styles from "./trailing-control.module.css";

/**
 * The clothes a real control wears in `EntryHead`'s trailing slot, applied in
 * exactly one CSS class so the rule has one place to be wrong. Every screen
 * that puts something there composes it, alongside `hitTarget`.
 *
 * No fallback on purpose, for the reason `hitTarget` has none: if the CSS
 * module stops resolving, the controls lose the class and the tests that
 * assert it fail, rather than passing against a string that styles nothing.
 */
export const trailingControl: string = styles.trailingControl;
