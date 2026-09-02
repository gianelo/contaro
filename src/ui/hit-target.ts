import styles from "./hit-target.module.css";

/**
 * The 44px minimum touch size, applied in exactly one CSS class so the rule has
 * one place to be wrong. Every interactive component composes it.
 *
 * No fallback on purpose: if the CSS module stops resolving, the components
 * lose the class and the tests that assert it fail, rather than passing against
 * a string that styles nothing.
 */
export const hitTarget: string = styles.hitTarget;
