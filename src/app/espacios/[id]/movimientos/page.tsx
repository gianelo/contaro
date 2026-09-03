import { GroupedList, GroupedListItem } from "@/ui/grouped-list";
import { t } from "@/i18n";
import { SpaceScreen } from "../screen";
import { currentSpace } from "../space";

/**
 * One Space's Movements. Empty until #7 brings them; it is a route of its own
 * already because a Movement only means anything inside a Space, and the URL
 * is where a Space is named.
 */
export default async function SpaceMovementsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const space = await currentSpace(id);

  return (
    <SpaceScreen space={space} tab="movements">
      <GroupedList label={t("nav.movements")}>
        <GroupedListItem>{t("space.movements.empty")}</GroupedListItem>
      </GroupedList>
    </SpaceScreen>
  );
}
