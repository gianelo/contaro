import styles from "./visually-hidden.module.css";

/**
 * Off the screen, still read out. Applied in exactly one CSS class so the rule
 * has one place to be wrong; every component that hides a label composes it.
 *
 * No fallback on purpose, for the reason `hitTarget` has none: if the CSS
 * module stops resolving, the label reappears in the layout and the screens
 * that budget for it fail loudly, rather than silently losing its accessible
 * name to a string that styles nothing.
 */
export const visuallyHidden: string = styles.visuallyHidden;
