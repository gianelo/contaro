import { headers } from "next/headers";
import { GroupedList, GroupedListItem } from "@/ui/grouped-list";
import { t } from "@/i18n";
import { numberLocalesFor } from "@/app/reader";
import { SpaceScreen } from "./screen";
import { currentSpace } from "./space";
import { monthInView, readableMonth } from "./movimientos/month";

/**
 * The Space's Budget: where picking a Space lands, and where #10 onwards will
 * put the month's plan.
 */
export default async function SpacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const space = await currentSpace(id);
  // The Space's money, written the way whoever opened this reads numbers
  // (ADR-0014). Two Members of one Space read one amount two ways; it is the
  // same amount, and it is in the Space's currency for both of them.
  const locales = numberLocalesFor(await headers());
  // What the month has actually cost. Nothing spent is still a figure, and it
  // is what #10's plan will be measured against.
  const { spent } = await readableMonth(space, monthInView(), locales);

  return (
    <SpaceScreen space={space} tab="budget">
      <GroupedList label={t("space.month")}>
        <GroupedListItem trailing={spent}>
          {t("space.month.spent")}
        </GroupedListItem>
      </GroupedList>
    </SpaceScreen>
  );
}
