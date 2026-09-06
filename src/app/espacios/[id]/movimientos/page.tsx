import { headers } from "next/headers";
import { t } from "@/i18n";
import { GroupedList, GroupedListItem } from "@/ui/grouped-list";
import { readerOf } from "@/app/reader";
import { MonthPill } from "../month-pill";
import { SpaceScreen } from "../screen";
import { currentSpace } from "../space";
import { monthInView, readableMonth } from "./month";
import { MovementRow } from "./row";
import { MonthTotals } from "./totals";

/**
 * One Space's Movements for a month (#7, #8).
 *
 * The month is read a day at a time, because a day is what a person remembers
 * about money — "el jueves fui al súper" — and a flat list of thirty rows is a
 * list nobody can place themselves in. Above it are the two figures the month
 * is actually about, and above those the head: the screen's own name, and the
 * pill that says which month this is and changes it (#61).
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
    <SpaceScreen
      space={space}
      tab="movements"
      /*
        The screen names itself and the Space becomes the quiet line under it
        (#61). It is the tab's own word, so what a thumb pressed and what it
        landed on are the same word rather than two names for one place.
      */
      title={t("nav.movements")}
      /*
        The same pill the plan wears, offering the same months out of the same
        function (`monthChoices`). It replaces the `‹ Septiembre ›` walker,
        which was one tap and one page load per month stepped over -- and the
        walker's forward bound went with it: it existed because every step
        forward cost a screen landing on a month guaranteed empty, and a
        picker charges nothing for a row nobody taps (ADR-0039).
      */
      beside={
        <MonthPill
          label={inView.label}
          choices={inView.choices.map((choice) => ({
            ...choice,
            href: at(choice.month),
          }))}
        />
      }
    >
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
