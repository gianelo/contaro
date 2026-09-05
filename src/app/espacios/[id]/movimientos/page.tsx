import { headers } from "next/headers";
import Link from "next/link";
import { t } from "@/i18n";
import { GroupedList, GroupedListItem } from "@/ui/grouped-list";
import { cx } from "@/ui/cx";
import { hitTarget } from "@/ui/hit-target";
import { readerOf } from "@/app/reader";
import { SpaceScreen } from "../screen";
import { currentSpace } from "../space";
import { monthInView, readableMonth } from "./month";
import { MovementRow } from "./row";
import { MonthTotals } from "./totals";
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
  // Whoever opened this: every figure below is written with their separators
  // (ADR-0014) and every day named against theirs (ADR-0018). The currency
  // stays the Space's for both of them.
  const reader = readerOf(await headers());
  const inView = await readableMonth(
    space,
    monthInView(mes, reader.today),
    reader,
  );

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

      <MonthTotals earned={inView.earned} spent={inView.spent} />

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
              {day.movements.map((movement) => (
                <MovementRow
                  key={movement.id}
                  movement={movement}
                  href={`/espacios/${space.id}/movimientos/${movement.id}`}
                />
              ))}
            </GroupedList>
          ))
        )}
      </section>
    </SpaceScreen>
  );
}
