import { t } from "@/i18n";
import { Avatar } from "@/ui/avatar";
import { CategoryCircle } from "@/ui/category-circle";
import { cx } from "@/ui/cx";
import { GroupedListItem } from "@/ui/grouped-list";
import type { ReadableMovement } from "./month";
import styles from "./row.module.css";

export type MovementRowProps = {
  movement: ReadableMovement;
  /** Where the row goes: the Movement's own screen, for correcting it. */
  href: string;
};

/**
 * One Movement on the month's list: what it was, whose it was, and how much.
 *
 * Three things across the row and nothing else. The day is not here — it is
 * the heading above the group now, and repeating it on every row is repeating
 * the one thing already said. Neither is "Plata de Ana": whose money it was is
 * the circle before the amount, which says the same thing in no width at all
 * and gives the second line back to the heading (#39).
 */
export function MovementRow({ movement, href }: MovementRowProps) {
  const beneath = whereItSits(movement);

  return (
    <GroupedListItem
      href={href}
      leading={<CategoryCircle mark={movement.mark} />}
      trailing={
        <span className={styles.figure}>
          {/*
            Absent and not a placeholder circle in a Space of one, exactly as
            the second line was absent: every Movement there is the reader's,
            and a circle that says so on every row is one a thumb stops seeing.
          */}
          {movement.whose ? (
            <Avatar
              name={movement.whose.name}
              colour={movement.whose.colour}
              size="xs"
            />
          ) : null}
          <span
            className={cx(
              styles.amount,
              movement.direction === "income" && styles.income,
            )}
          >
            {amountOf(movement)}
          </span>
        </span>
      }
    >
      <span className={styles.category}>
        {movement.name ?? movement.category}
      </span>
      {/*
        Absent rather than empty: a row with nothing to say on its second line
        says nothing, and a blank span still takes a line's worth of height.
      */}
      {beneath ? <span className={styles.beneath}>{beneath}</span> : null}
    </GroupedListItem>
  );
}

/**
 * The quieter line under what the row is called: where this Movement sits in
 * the month.
 *
 * Two shapes, because the line above it has two. A Movement nobody named is
 * read by its Category, so the heading over that Category is the only thing
 * left to say — which is what every row said before names existed. A Movement
 * that was named is read by the name, which frees the second line to carry the
 * whole filing: "Comida · Supermercado", heading first because that is the
 * order the catalogue reads in and the order `design/Movimientos.dc.html`
 * draws (#66).
 *
 * A Category that is a heading itself has nothing above it, so a named
 * Movement filed on one comes back as the Category alone rather than a middot
 * with nothing on its left.
 */
function whereItSits(movement: ReadableMovement): string | null {
  if (movement.name === null) return movement.heading;

  return movement.heading === null
    ? movement.category
    : `${movement.heading} · ${movement.category}`;
}

/**
 * The figure at the end of a row, marked when the money came in.
 *
 * The "+" and not the colour alone. ADR-0016 refused the colour outright and
 * #39 reopened it, but only the second half of that refusal moved: a sign is
 * read out by a screen reader, survives a black-and-white printout, and is
 * visible to somebody who cannot tell the two greens apart. The canvas colours
 * income as well as signing it, which is the same rule CONTEXT.md already
 * applies to a Category that is over its plan — "said in colour, in words and
 * in an icon at once, never in colour alone".
 */
export function amountOf(movement: ReadableMovement): string {
  return movement.direction === "income"
    ? t("movements.amount.income", { amount: movement.amount })
    : movement.amount;
}
