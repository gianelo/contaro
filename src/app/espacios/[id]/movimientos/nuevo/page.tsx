import { headers } from "next/headers";
import { ButtonLink } from "@/ui/button";
import { t } from "@/i18n";
import { numberLocalesFor } from "@/app/reader";
import { SpaceScreen } from "../../screen";
import { currentSpace, viewingMember } from "../../space";
import { MovementForm } from "../form";
import { categoryChips, spaceMembers, todayOnTheServer } from "../month";
import { recordMovementAction } from "../actions";
import styles from "./page.module.css";

/**
 * Recording an expense: the screen the whole product rests on (#7).
 *
 * Membership is proved here the way every route under `/espacios/[id]` proves
 * it, and proved again by the action, because the form names the Space and a
 * form field is a claim.
 */
export default async function NewMovementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const space = await currentSpace(id);

  const [categories, members, recordedBy, locales] = await Promise.all([
    categoryChips(space.id),
    spaceMembers(space.id),
    viewingMember(),
    // The amount is written the way whoever is typing it reads numbers, so
    // that what they watch themselves type is what they will read back
    // afterwards (ADR-0014). The currency stays the Space's.
    Promise.resolve(numberLocalesFor(await headers())),
  ]);

  const today = todayOnTheServer();

  return (
    <SpaceScreen space={space} tab="movements">
      <h2 className={styles.title}>{t("movements.new.title")}</h2>

      <MovementForm
        spaceId={space.id}
        categories={categories}
        members={members.map((member) => ({
          value: member.id,
          label: member.name,
        }))}
        currency={space.currency}
        locales={locales}
        serverDay={today}
        initial={{
          amount: 0,
          // Nothing chosen: the Category is the one answer nobody can guess
          // for a person, so the picker starts empty and `required` has teeth.
          categoryId: "",
          occurredOn: today,
          // The Member recording it, which is nearly always whose money it
          // was (story 20 in #1). It is only what the screen shows and offers:
          // `recordMovement` fills it in from the session either way, so a
          // form that carries nothing still lands on the right person.
          attributedTo: recordedBy,
        }}
        action={recordMovementAction}
        submit={t("movements.submit")}
        working={t("movements.working")}
      />

      <div className={styles.back}>
        <ButtonLink href={`/espacios/${space.id}/movimientos`} variant="plain">
          {t("action.cancel")}
        </ButtonLink>
      </div>
    </SpaceScreen>
  );
}
