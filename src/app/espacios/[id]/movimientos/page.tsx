import { headers } from "next/headers";
import Link from "next/link";
import { t } from "@/i18n";
import { ButtonLink } from "@/ui/button";
import { GroupedList, GroupedListItem } from "@/ui/grouped-list";
import { cx } from "@/ui/cx";
import { hitTarget } from "@/ui/hit-target";
import { numberLocalesFor } from "@/app/reader";
import { SpaceScreen } from "../screen";
import { currentSpace } from "../space";
import { monthInView, readableMonth, type ReadableMovement } from "./month";
import styles from "./page.module.css";

/**
 * One Space's Movements for a month (#7, #8).
 *
 * The month is read a day at a time, because a day is what a person remembers
 * about money — "el jueves fui al súper" — and a flat list of thirty rows is a
 * list nobody can place themselves in. Above it are the two figures the month
 * is actually about, and the control that changes which month this is.
 */
export default async function SpaceMovementsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mes?: string }>;
}) {
  const [{ id }, { mes }] = await Promise.all([params, searchParams]);
  const space = await currentSpace(id);
  // Every figure below is in the Space's currency and written with the
  // separators of whoever opened this (ADR-0014).
  const locales = numberLocalesFor(await headers());
  const inView = await readableMonth(space, monthInView(mes), locales);

  const at = (asked: string) => `/espacios/${space.id}/movimientos?mes=${asked}`;

  return (
    <SpaceScreen space={space} tab="movements">
      <nav className={styles.months} aria-label={t("space.month.choose")}>
        <Link
          href={at(inView.around.previous)}
          className={cx(hitTarget, styles.step)}
          aria-label={t("space.month.previous")}
        >
          ‹
        </Link>
        <h2 className={styles.month}>{inView.label}</h2>
        {/*
          A month later than this one is guaranteed empty -- a Movement is
          money that has already moved -- so there is nothing to go to. The
          space is held rather than collapsed, so the month's name does not
          slide sideways on the last month of the list.
        */}
        {inView.around.next ? (
          <Link
            href={at(inView.around.next)}
            className={cx(hitTarget, styles.step)}
            aria-label={t("space.month.next")}
          >
            ›
          </Link>
        ) : (
          <span className={cx(hitTarget, styles.step)} aria-hidden="true" />
        )}
      </nav>

      {/*
        Both figures and never their difference. "What came in" and "what went
        out" are two questions, and a single net number shows a month where a
        salary arrived and the rent was paid as though nothing had happened.
      */}
      <GroupedList label={t("space.month")}>
        <GroupedListItem trailing={inView.earned}>
          {t("space.month.income")}
        </GroupedListItem>
        <GroupedListItem trailing={inView.spent}>
          {t("space.month.expenses")}
        </GroupedListItem>
      </GroupedList>

      {/*
        One region holding the days, so "the month's Movements" is still one
        thing a screen reader can be sent to and a test can point at, while
        each day inside it is its own group with its own heading.
      */}
      <section aria-label={t("nav.movements")}>
        {inView.days.length === 0 ? (
          <GroupedList label={t("nav.movements")} labelHidden>
            <GroupedListItem>{t("space.movements.empty")}</GroupedListItem>
          </GroupedList>
        ) : (
          inView.days.map((day) => (
            <GroupedList key={day.day} label={day.label}>
              {day.movements.map((movement) => {
                const second = beneath(movement);

                return (
                  <GroupedListItem
                    key={movement.id}
                    href={`/espacios/${space.id}/movimientos/${movement.id}`}
                    trailing={amountOf(movement)}
                  >
                    <span className={styles.category}>{movement.category}</span>
                    {/*
                      Absent rather than empty: an expense on a heading in a
                      personal Space has nothing to say here, and a blank span
                      still takes a line's worth of height under the name.
                    */}
                    {second ? (
                      <span className={styles.beneath}>{second}</span>
                    ) : null}
                  </GroupedListItem>
                );
              })}
            </GroupedList>
          ))
        )}
      </section>

      <div className={styles.add}>
        <ButtonLink href={`/espacios/${space.id}/movimientos/nuevo`}>
          {t("movements.new")}
        </ButtonLink>
      </div>
    </SpaceScreen>
  );
}

/**
 * The second line of a row: whose money it was, and what it sits under.
 *
 * The day is not here any more — it is the heading above the row now, and
 * repeating it on every row of a group is repeating the one thing already
 * said. In a personal Space `attribution` is empty and an expense keeps only
 * its heading, which is a row that says exactly as much as it has to.
 */
function beneath(movement: ReadableMovement): string {
  return [movement.attribution, movement.heading].filter(Boolean).join(" · ");
}

/**
 * The figure at the end of a row, marked when the money came in.
 *
 * A written "+" and not a colour. The one accent colour this product has
 * already means "this can be tapped" — every row here is a link — and a
 * difference carried by colour alone is one somebody cannot see. The sign is
 * read out by a screen reader and survives a black-and-white printout.
 */
function amountOf(movement: ReadableMovement): string {
  return movement.direction === "income"
    ? t("movements.amount.income", { amount: movement.amount })
    : movement.amount;
}
