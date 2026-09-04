import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/ui/button";
import { t } from "@/i18n";
import { readerOf } from "@/app/reader";
import { SpaceScreen } from "../../screen";
import { currentSpace } from "../../space";
import { monthOf } from "@/domain/calendar/month";
import { MovementForm } from "../form";
import {
  categoryChips,
  readableMovement,
  spaceMembers,
  todayOnTheServer,
} from "../month";
import { amendMovementAction } from "../actions";
import { Notice } from "@/ui/notice";
import { StrikeMovement } from "./strike";
import styles from "./page.module.css";

/**
 * Correcting or striking out one Movement (#7, story 27 in #1).
 *
 * The same form the entry screen uses, opened on what the Movement already
 * says. Any Member of the Space may do either: the money is one pot, and
 * `recordedBy` is a record of who typed a figure in rather than a claim to own
 * it — so the recorder is shown and never offered as something to change.
 */
export default async function MovementPage({
  params,
}: {
  params: Promise<{ id: string; movementId: string }>;
}) {
  const { id, movementId } = await params;
  const space = await currentSpace(id);
  // The `serverDay` below is deliberately not the Reader's: it is what the
  // form falls back to before the browser has answered, and the bound on how
  // late a day may be stays on the server's clock (ADR-0018).
  const reader = readerOf(await headers());

  const movement = await readableMovement(space, movementId, reader);
  // Not found rather than forbidden, the way the Space itself refuses: one
  // struck out, one in somebody else's Space and one that never existed all
  // read the same from here.
  if (!movement) notFound();

  const [categories, members] = await Promise.all([
    categoryChips(space.id),
    spaceMembers(space.id),
  ]);

  const recorder = members.find((member) => member.id === movement.recordedBy);

  return (
    <SpaceScreen space={space} tab="movements">
      <h2 className={styles.title}>{t("movements.edit.title")}</h2>

      {/*
        Who typed it in, said out loud. It is the half of story 22 a screen
        owes: "never editable" is enforced by there being no field for it, and
        this is what makes it a record somebody can actually read. A Member of
        a shared Space correcting their partner's entry should be able to see
        whose entry it was.
      */}
      {recorder ? (
        <Notice>{t("movements.recordedBy", { member: recorder.name })}</Notice>
      ) : null}

      <MovementForm
        spaceId={space.id}
        movementId={movement.id}
        categories={categories}
        members={members.map((member) => ({
          value: member.id,
          label: member.name,
        }))}
        currency={space.currency}
        locales={reader.locales}
        serverDay={todayOnTheServer()}
        month={monthOf(movement.occurredOn)}
        initial={{
          // Back into the minor units the keypad counts in, from the Money the
          // screen reads. The formatted amount is for eyes; this is the figure.
          amount: movement.minorUnits,
          direction: movement.direction,
          categoryId: movement.categoryId,
          occurredOn: movement.occurredOn,
          attributedTo: movement.attributedTo,
        }}
        action={amendMovementAction}
        submit={t("movements.edit.submit")}
        working={t("movements.working")}
      />

      <StrikeMovement
        spaceId={space.id}
        movementId={movement.id}
        month={monthOf(movement.occurredOn)}
      />

      <div className={styles.back}>
        <ButtonLink href={`/espacios/${space.id}/movimientos`} variant="plain">
          {t("action.cancel")}
        </ButtonLink>
      </div>
    </SpaceScreen>
  );
}
