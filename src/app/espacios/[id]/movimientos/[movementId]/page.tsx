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
import { MovementRecord } from "./record";
import { closedMonthsToRefuse } from "../../closed";

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

  // The Movement's own month, and never the Reader's: what decides whether it
  // can still be touched is the month the money moved in.
  const month = monthOf(movement.occurredOn);

  const [categories, members, closedMonths] = await Promise.all([
    categoryChips(space.id),
    spaceMembers(space.id),
    /*
     * A correction can move the day, so the form needs the whole window the
     * entry screen has -- around the Movement's own month, which is where its
     * date field opens.
     *
     * And whether *this* month is closed is read back off that same window
     * rather than asked for a second time, exactly as both month readers do
     * (#119). The window starts at or before this month by construction, so
     * the answer is already in hand and a second query would be one round trip
     * spent agreeing with the first.
     */
    closedMonthsToRefuse(space.id, month),
  ]);

  const closed = closedMonths.includes(month);

  const recorder = members.find((member) => member.id === movement.recordedBy);

  /*
   * A Movement in a closed month is shown and not offered (#119). Both of this
   * screen's controls write into that month -- the form corrects it, and the
   * strike unrecords it -- so both come off and what is left is the record and
   * the way back, which is the same shape a paid item's screen has.
   *
   * The head above stays exactly as it is. Who typed a figure in is what this
   * screen is *for* once neither control is here, and it was never editable in
   * the first place: "never editable" has always been enforced by there being
   * no field for it, which is the one promise the close changes nothing about.
   */
  if (closed) {
    return (
      <AppShell>
        <MovementCorrectionHead
          back={`/espacios/${space.id}/movimientos`}
          recordedBy={recorder?.name ?? null}
        />

        <MovementRecord
          movement={movement}
          refusal={{
            title: t("movements.closed.title"),
            body: t("movements.closed.body"),
          }}
        />
      </AppShell>
    );
  }

  /*
   * The one Movement in the product nobody typed (#120). A carry-over is not
   * corrected: its amount is what a closed month came to, its day is the first
   * of the month it landed in, it carries no Category, and whose money it is,
   * is nobody's -- which is the exact field a correction form would post back.
   *
   * So the form comes off and the strike stays, which is where this parts
   * company with the closed month above and follows the paid item instead
   * (ADR-0034): this refusal has an undo, and a sentence with no exit beside a
   * refusal that *does* have one would be a dead end with good manners. Striking
   * it out offers the month it came from again (ADR-0031).
   */
  if (movement.carriedFrom !== null) {
    return (
      <AppShell>
        <MovementCorrectionHead
          back={`/espacios/${space.id}/movimientos`}
          recordedBy={recorder?.name ?? null}
        />

        <MovementRecord
          movement={movement}
          refusal={{
            title: t("movements.carriedOver.title"),
            body: t("movements.carriedOver.body"),
          }}
        />

        <StrikeMovement
          spaceId={space.id}
          movementId={movement.id}
          month={month}
        />
      </AppShell>
    );
  }

  /*
   * Every Movement that reaches this line came from a Member, which is what
   * `movements_comes_from_a_member_or_from_a_month` guarantees and what the
   * branch above has just taken out of the way. Said out loud rather than
   * defaulted to an empty string: an attribution field opened on nobody is the
   * one field on this form that would silently change an answer.
   */
  if (movement.attributedTo === null) {
    throw new Error(
      `Movement ${movement.id} is attributed to nobody and is not a carry-over.`,
    );
  }

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
        closedMonths={closedMonths}
        month={month}
        initial={{
          // Back into the minor units the keypad counts in, from the Money the
          // screen reads. The formatted amount is for eyes; this is the figure.
          amount: movement.minorUnits,
          direction: movement.direction,
          categoryId: movement.categoryId,
          occurredOn: movement.occurredOn,
          attributedTo: movement.attributedTo,
          // The name it already has, so a correction opens on it rather than
          // asking again — and so leaving the field alone keeps it.
          name: movement.name,
        }}
        action={amendMovementAction}
        submit={t("movements.edit.submit")}
        working={t("movements.working")}
      />

      <StrikeMovement
        spaceId={space.id}
        movementId={movement.id}
        month={month}
      />
    </AppShell>
  );
}
