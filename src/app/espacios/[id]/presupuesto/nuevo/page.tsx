import { headers } from "next/headers";
import { ButtonLink } from "@/ui/button";
import { t } from "@/i18n";
import { numberLocalesFor, todayFor } from "@/app/reader";
import { SpaceScreen } from "../../screen";
import { currentSpace } from "../../space";
import { categoryChips, monthInView } from "../../movimientos/month";
import { BudgetItemForm } from "../form";
import { planBudgetItemAction } from "../actions";
import styles from "./page.module.css";

/**
 * Planning one item of either kind: the month's plan comes into existence here
 * (#10), and since #80 this is the only place it does.
 *
 * There is no Budget to create first, so this screen is the whole of it: the
 * first item somebody plans is the month's plan.
 *
 * There used to be a second screen under `nuevo/fijo`, and a second button on
 * the Budget screen pointing at it. The form asks the day question now, and
 * whether it is answered is what makes an item Fixed — so nobody has to know
 * what "fijo" means to write down a number.
 *
 * Membership is proved here the way every route under `/espacios/[id]` proves
 * it, and proved again by the action, because the form names the Space and a
 * form field is a claim.
 */
export default async function NewBudgetItemPage({
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
    // The amount is written the way whoever is typing it reads numbers, so
    // that what they watch themselves type is what they will read back
    // afterwards (ADR-0014). The currency stays the Space's.
    Promise.resolve(numberLocalesFor(asked)),
  ]);

  // The month the plan was opened on, and the Reader's own when none was
  // asked for: which month "this month" is, is their question (ADR-0018).
  const month = monthInView(mes, todayFor(asked));

  return (
    <SpaceScreen space={space} tab="budget">
      <h2 className={styles.title}>{t("budget.item.new.title")}</h2>

      <BudgetItemForm
        spaceId={space.id}
        month={month}
        categories={categories}
        currency={space.currency}
        locales={locales}
        initial={{
          amount: 0,
          // Empty, and never a Category's name filled in for somebody: a row
          // called "Supermercado" is the identical row #79 was about, and one
          // guessed into the field is one nobody notices they kept.
          name: "",
          // Nothing chosen: the Category is the one answer nobody can guess
          // for a person, so the picker starts empty and `required` has teeth.
          categoryId: "",
        }}
        // Only here. Correcting an item does not ask it: the kind is settled
        // the moment the item is written down, and the domain has nowhere to
        // write a changed one back to.
        asksWhetherItFallsDue
        action={planBudgetItemAction}
        submit={t("budget.item.save")}
        working={t("budget.item.save.working")}
      />

      <div className={styles.back}>
        <ButtonLink href={`/espacios/${space.id}?mes=${month}`} variant="plain">
          {t("action.cancel")}
        </ButtonLink>
      </div>
    </SpaceScreen>
  );
}
