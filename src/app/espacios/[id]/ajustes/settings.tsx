import { GroupedList, GroupedListItem } from "@/ui/grouped-list";
import { t } from "@/i18n";

/**
 * What Ajustes offers, which today is one thing: the Categories catalogue.
 *
 * The catalogue used to spend a quarter of the tab bar. The tabs are the four
 * places a thumb goes every day and this is not one of them -- a person writes
 * their Categories once and then rarely -- so it lives here instead, one tap
 * further away and no further.
 *
 * A list of one is deliberate rather than embarrassing: this screen is where
 * whatever comes next that is not money will go, and a list is what it grows
 * into without being rebuilt.
 */
export function Settings({ spaceId }: { spaceId: string }) {
  return (
    // Labelled and not hidden: the screen's own heading is the Space's name,
    // so without this a person arrives at "Casa" and a bare row saying
    // "Categorías" with nothing saying what they are looking at.
    <GroupedList label={t("nav.settings")}>
      <GroupedListItem href={`/espacios/${spaceId}/categorias`}>
        {t("nav.categories")}
      </GroupedListItem>
    </GroupedList>
  );
}
