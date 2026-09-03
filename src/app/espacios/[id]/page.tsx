import { headers } from "next/headers";
import { formatMoney, zero } from "@/domain/money/money";
import { GroupedList, GroupedListItem } from "@/ui/grouped-list";
import { t } from "@/i18n";
import { numberLocalesFor } from "@/app/reader";
import { SpaceScreen } from "./screen";
import { currentSpace } from "./space";

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

  return (
    <SpaceScreen space={space} tab="budget">
      <GroupedList label={t("space.month")}>
        {/*
          Nothing has been recorded yet, in any Space, until #7 brings Movements.
          The figure is real all the same — nothing spent is nothing — and it is
          here now because what matters is that it is denominated in the Space's
          currency and never in the reader's.
        */}
        <GroupedListItem trailing={formatMoney(zero(space.currency), locales)}>
          {t("space.month.spent")}
        </GroupedListItem>
      </GroupedList>
    </SpaceScreen>
  );
}
