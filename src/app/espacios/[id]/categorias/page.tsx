import { ButtonLink } from "@/ui/button";
import { GroupedList, GroupedListItem } from "@/ui/grouped-list";
import { t } from "@/i18n";
import { readableCatalogueFor } from "./catalogue";
import { SpaceScreen } from "../screen";
import { currentSpace } from "../space";
import styles from "./page.module.css";

/**
 * One Space's catalogue: the Categories shipped with the product and the ones
 * its Members added, as one list rather than two (#6).
 *
 * A group per heading, so the whole catalogue is scrolled and read on a phone
 * without opening anything: a Category that holds subcategories is the heading
 * above them, and one that holds none is a row under "Sin subcategorías". The
 * rows are not links, because there is nothing yet to open — #7 gives a
 * Category somewhere to lead.
 */
export default async function SpaceCategoriesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const space = await currentSpace(id);
  const catalogue = await readableCatalogueFor(space.id);

  const withChildren = catalogue.filter((entry) => entry.children.length > 0);
  const alone = catalogue.filter((entry) => entry.children.length === 0);

  return (
    <SpaceScreen space={space} tab="categories">
      <p className={styles.subtitle}>{t("categories.subtitle")}</p>

      {withChildren.map((entry) => (
        <div key={entry.id} className={styles.group}>
          <GroupedList label={entry.name}>
            {entry.children.map((child) => (
              <GroupedListItem
                key={child.id}
                trailing={child.own ? t("categories.own") : undefined}
              >
                {child.name}
              </GroupedListItem>
            ))}
          </GroupedList>
        </div>
      ))}

      {alone.length > 0 ? (
        <div className={styles.group}>
          <GroupedList label={t("categories.alone")}>
            {alone.map((entry) => (
              <GroupedListItem
                key={entry.id}
                trailing={entry.own ? t("categories.own") : undefined}
              >
                {entry.name}
              </GroupedListItem>
            ))}
          </GroupedList>
        </div>
      ) : null}

      <div className={styles.add}>
        <ButtonLink href={`/espacios/${space.id}/categorias/nueva`}>
          {t("categories.add")}
        </ButtonLink>
      </div>
    </SpaceScreen>
  );
}
