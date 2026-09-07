import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { AppShell } from "@/ui/app-shell";
import { t } from "@/i18n";
import { readerOf } from "@/app/reader";
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
import { MovementCorrectionHead } from "./head";
import { StrikeMovement } from "./strike";

/**
 * Correcting or striking out one Movement (#7, story 27 in #1).
 *
 * The same form the entry screen uses, opened on what the Movement already
 * says. Any Member of the Space may do either: the money is one pot, and
 * `recordedBy` is a record of who typed a figure in rather than a claim to own
 * it — so the recorder is shown and never offered as something to change.
 *
 * It carries no tab bar, no account row and no Space heading, which is why it
 * renders `AppShell` directly rather than going through `SpaceScreen` like
 * every other screen inside a Space. ADR-0028 made that trade for the entry
 * screen and kept it off this one; ADR-0046 read the argument again and found
 * that what it protects is not the act of standing at a till but the
 * typed-but-unsaved state — and this screen holds exactly that, in the same
 * form, under the same thumb. It was also the only way it fits a phone: the
 * bar's 78px are structural, and without them nothing else adds up (#73).
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
    <AppShell>
      {/*
        Who typed it in is said in the head, under the title, where the entry
        screen says which Space is being spent from. It is the half of story 22
        a screen owes: "never editable" is enforced by there being no field for
        it, and this is what makes it a record somebody can actually read.
      */}
      <MovementCorrectionHead
        back={`/espacios/${space.id}/movimientos`}
        recordedBy={recorder?.name ?? null}
      />

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
    </AppShell>
  );
}
