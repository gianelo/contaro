import { headers } from "next/headers";
import { ButtonLink } from "@/ui/button";
import { t } from "@/i18n";
import { numberLocalesFor, todayFor } from "@/app/reader";
import { SpaceScreen } from "../../../screen";
import { currentSpace } from "../../../space";
import { categoryChips, monthInView } from "../../../movimientos/month";
import { FixedItemForm } from "../../fixed-form";
import styles from "../page.module.css";

/**
 * Planning one Fixed item (#13).
 *
 * Under `nuevo/` beside the Variable one rather than on a screen of its own,
 * because they are the same act — a month's plan is being written — asked with
 * two more questions. Membership is proved here the way every route under
 * `/espacios/[id]` proves it, and proved again by the action, because the form
 * names the Space and a form field is a claim.
 */
export default async function NewFixedItemPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mes?: string }>;
}) {
  const [{ id }, { mes }] = await Promise.all([params, searchParams]);
  const space = await currentSpace(id);
  const asked = await headers();

  const [categories, locales] = await Promise.all([
    categoryChips(space.id),
    Promise.resolve(numberLocalesFor(asked)),
  ]);

  const month = monthInView(mes, todayFor(asked));

  return (
    <SpaceScreen space={space} tab="budget">
      <h2 className={styles.title}>{t("budget.fixed.new.title")}</h2>

      <FixedItemForm
        spaceId={space.id}
        month={month}
        categories={categories}
        currency={space.currency}
        locales={locales}
      />

      <div className={styles.back}>
        <ButtonLink href={`/espacios/${space.id}?mes=${month}`} variant="plain">
          {t("action.cancel")}
        </ButtonLink>
      </div>
    </SpaceScreen>
  );
}
