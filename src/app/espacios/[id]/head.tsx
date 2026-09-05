import type { ReactNode } from "react";
import type { Space } from "@/domain/space/space";
import { currencyLabel } from "@/i18n/currency";
import { t } from "@/i18n";
import styles from "./head.module.css";

export type SpaceHeadProps = {
  space: Space;
  /**
   * What the screen calls itself, where it has a name of its own.
   *
   * Optional, and the difference it makes is which of two facts is the
   * heading. Without it the Space is the title, which is what every screen
   * inside a Space did before #40. With it the screen names itself -- the
   * Budget screen says "Presupuesto" -- and the Space drops to the line
   * underneath, beside its currency.
   *
   * The Space never disappears either way, and a title turned out to be a poor
   * place to keep that promise: it is the first thing to be replaced the moment
   * a screen has something of its own to say, which is exactly what happened
   * here. So the promise moved onto a line with no other job.
   */
  title?: string;
  /**
   * What shares the title's row: the month pill, on the two screens the canvas
   * draws one on.
   *
   * A slot on the row rather than something a screen draws under the head for
   * itself, because that row is the head's own layout -- the title takes the
   * width that is left, and a screen placing a control beside it from outside
   * would be a second opinion about where the row ends.
   */
  beside?: ReactNode;
};

/**
 * The head of a screen inside a Space: what the screen is, and which Space it
 * is showing.
 *
 * Its own component and not four lines inside `SpaceScreen` because it is the
 * one part of the shell a screen gets to change, and because `SpaceScreen`
 * renders the account slot -- an async server component, which puts the whole
 * shell out of reach of a test that only wants to read a heading.
 */
export function SpaceHead({ space, title, beside }: SpaceHeadProps) {
  const currency = currencyLabel(space.currency);

  return (
    <header className={styles.head}>
      <div className={styles.headline}>
        <h1 className={styles.title}>{title ?? space.name}</h1>
        {beside}
      </div>
      {/*
        The Space is written into this line only where the title is not the
        Space: on a screen whose heading is already "Casa", a line reading
        "Casa · Peso argentino (ARS)" says the same word twice.
      */}
      <p className={styles.beneath}>
        {title === undefined
          ? currency
          : t("space.beneath", { space: space.name, currency })}
      </p>
    </header>
  );
}
