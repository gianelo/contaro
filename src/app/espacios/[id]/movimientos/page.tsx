import { headers } from "next/headers";
import { ButtonLink } from "@/ui/button";
import { GroupedList, GroupedListItem } from "@/ui/grouped-list";
import { t } from "@/i18n";
import { numberLocalesFor } from "@/app/reader";
import { SpaceScreen } from "../screen";
import { currentSpace } from "../space";
import { monthInView, readableMonth } from "./month";
import styles from "./page.module.css";

/**
 * One Space's Movements for the month (#7).
 *
 * What #7 owes and no more: an expense, once recorded, is on this screen, and
 * can be opened to be corrected or struck out. #8 brings the grouping by day,
 * the income and expense totals, and the control that changes the month —
 * which is why the month is read here rather than assumed.
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
  const { movements } = await readableMonth(space, monthInView(mes), locales);

  return (
    <SpaceScreen space={space} tab="movements">
      <GroupedList label={t("nav.movements")}>
        {movements.length === 0 ? (
          <GroupedListItem>{t("space.movements.empty")}</GroupedListItem>
        ) : (
          movements.map((movement) => (
            <GroupedListItem
              key={movement.id}
              href={`/espacios/${space.id}/movimientos/${movement.id}`}
              trailing={movement.amount}
            >
              <span className={styles.category}>{movement.category}</span>
              <span className={styles.day}>
                {movement.heading
                  ? `${movement.heading} · ${movement.day}`
                  : movement.day}
              </span>
            </GroupedListItem>
          ))
        )}
      </GroupedList>

      <div className={styles.add}>
        <ButtonLink href={`/espacios/${space.id}/movimientos/nuevo`}>
          {t("movements.new")}
        </ButtonLink>
      </div>
    </SpaceScreen>
  );
}
