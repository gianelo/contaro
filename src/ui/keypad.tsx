"use client";

import type { CurrencyCode } from "@/domain/money/currency";
import { formatMoney, money } from "@/domain/money/money";
import { MAX_MOVEMENT_AMOUNT } from "@/domain/movement/movement";
import { t } from "@/i18n";
import styles from "./keypad.module.css";
import { cx } from "./cx";
import { hitTarget } from "./hit-target";

/**
 * The keys, in the order a thumb finds them: a phone's dialling pad, with the
 * three noughts where a decimal point would be on a calculator.
 *
 * There is no decimal key and there is no need for one. The amount is a whole
 * number of minor units and the numbers are pushed in from the right, the way
 * a till does it: 1, 2, 8, 4, 0, 0 is $1.284,00. In a currency that has no
 * minor units — the Colombian and Chilean pesos, the guaraní — the same six
 * presses are $128.400, which is what a person there would expect them to be.
 */
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "000", "0"] as const;

/** A key press: a number to push in, or taking the last one back off. */
export type KeyPress = (typeof KEYS)[number] | "erase";

/**
 * What the amount becomes when a key is pressed.
 *
 * Apart from the component that draws it, because it is the only part of a
 * keypad with anything to be wrong about, and because a rule driven directly
 * is a rule that costs a millisecond to prove.
 */
export function nextAmount(amount: number, key: KeyPress): number {
  if (key === "erase") return Math.floor(amount / 10);

  const pushed = Number(`${amount}${key}`);

  // Held here as well as in `recordMovement`, so a thumb resting on a key
  // stops at the ceiling rather than rolling the figure over silently. The
  // domain is still the one that decides; this only keeps the screen honest.
  return pushed > MAX_MOVEMENT_AMOUNT ? amount : pushed;
}

export type KeypadProps = {
  /** The amount so far, in minor units. */
  value: number;
  /** The Space's currency. Never the reader's: ADR-0001. */
  currency: CurrencyCode;
  /** How the reader reads numbers. Never the Space's: ADR-0014. */
  locales: readonly string[];
  onChange: (amount: number) => void;
};

/**
 * The amount, and the keys that build it.
 *
 * The figure above the keys is the same `formatMoney` the month's list uses,
 * so what a person watches themselves type is character for character what
 * they will read back afterwards. A keypad that showed a raw number would be
 * a keypad whose result is a small surprise.
 */
export function Keypad({ value, currency, locales, onChange }: KeypadProps) {
  return (
    <div className={styles.keypad}>
      <p
        // Announced as it changes, so the amount is followed by a person who
        // cannot see it — which on a keypad with no text field is the only way
        // to know what has been typed.
        role="status"
        aria-live="polite"
        className={cx(styles.amount, value === 0 && styles.empty)}
      >
        {formatMoney(money(value, currency), locales)}
      </p>

      <div className={styles.keys} role="group" aria-label={t("movements.keypad")}>
        {KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => onChange(nextAmount(value, key))}
            className={cx(hitTarget, styles.key)}
          >
            {key}
          </button>
        ))}

        <button
          type="button"
          aria-label={t("movements.keypad.erase")}
          onClick={() => onChange(nextAmount(value, "erase"))}
          className={cx(hitTarget, styles.key, styles.erase)}
        >
          <span aria-hidden="true">⌫</span>
        </button>
      </div>
    </div>
  );
}
