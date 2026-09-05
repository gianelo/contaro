import { GroupedList, GroupedListItem } from "@/ui/grouped-list";
import { t } from "@/i18n";
import { Appearance } from "./appearance";
import styles from "./settings.module.css";

/**
 * What Ajustes offers: the Categories catalogue, and how the app is lit.
 *
 * The catalogue used to spend a quarter of the tab bar. The tabs are the four
 * places a thumb goes every day and this is not one of them -- a person writes
 * their Categories once and then rarely -- so it lives here instead, one tap
 * further away and no further.
 *
 * The second group is the growth this screen said it was waiting for, and it
 * arrives asking a question the first one does not: the catalogue belongs to
 * the Space in the URL and the theme belongs to the device (#41). They sit on
 * one screen anyway, because this is the only settings screen the tab bar
 * reaches and inventing a second one would put the word "Ajustes" in the app
 * twice, at two scopes, for a person to tell apart. The Space's own things go
 * first; the device's go under them.
 */
export function Settings({ spaceId }: { spaceId: string }) {
  return (
    <>
      <div className={styles.group}>
        {/*
         * Labelled and not hidden: the screen's own heading is the Space's
         * name, so without this a person arrives at "Casa" and a bare row
         * saying "Categorías" with nothing saying what they are looking at.
         */}
        <GroupedList label={t("nav.settings")}>
          <GroupedListItem href={`/espacios/${spaceId}/categorias`}>
            {t("nav.categories")}
          </GroupedListItem>
        </GroupedList>
      </div>

      <div className={styles.group}>
        <Appearance />
      </div>
    </>
  );
}
