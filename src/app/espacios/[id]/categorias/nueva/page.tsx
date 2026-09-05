import { ButtonLink } from "@/ui/button";
import { t } from "@/i18n";
import { readableCatalogueFor } from "../catalogue";
import { SpaceScreen } from "../../screen";
import { currentSpace } from "../../space";
import { NewCategoryForm } from "./form";
import styles from "./page.module.css";

/**
 * Adding a Category happens inside a Space, so this screen keeps the Space's
 * shell and its tab bar — unlike creating a Space, which belongs to no Space
 * at all. Membership is proved here the way every route under `/espacios/[id]`
 * proves it, and proved again by the action, because the form names the Space
 * and a form field is a claim.
 */
export default async function NewCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const space = await currentSpace(id);
  const catalogue = await readableCatalogueFor(space.id);

  return (
    <SpaceScreen space={space} tab="settings">
      <h2 className={styles.title}>{t("categories.new.title")}</h2>

      <NewCategoryForm
        spaceId={space.id}
        headings={catalogue.map((entry) => ({
          id: entry.id,
          name: entry.name,
        }))}
      />

      <div className={styles.back}>
        <ButtonLink href={`/espacios/${space.id}/categorias`} variant="plain">
          {t("action.cancel")}
        </ButtonLink>
      </div>
    </SpaceScreen>
  );
}
