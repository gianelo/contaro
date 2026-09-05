import { headers } from "next/headers";
import { t } from "@/i18n";
import { AppShell } from "@/ui/app-shell";
import { numberLocalesFor } from "@/app/reader";
import { currentSpace, viewingMember } from "../../space";
import { MovementForm } from "../form";
import { categoryChips, spaceMembers, todayOnTheServer } from "../month";
import { recordMovementAction } from "../actions";
import { EntryHead } from "./head";

/**
 * Recording an expense: the screen the whole product rests on (#7).
 *
 * It carries no tab bar, which is why it renders `AppShell` directly instead
 * of going through `SpaceScreen` like every other screen inside a Space. A
 * person here is doing one thing, and a bar offering three other places is
 * three ways to lose what they have typed. It is the counterpart of ADR-0027:
 * the raised button in the middle of that bar is what leads here, and what it
 * leads to is a screen with nothing else on it.
 *
 * There is no account row either, for the same reason, and no Space heading:
 * the pill in the head says which Space this is, which is the only part of
 * that heading somebody about to spend needs.
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

  // Whoever else is in it, for the pill that says so. A Space of one has
  // nobody to name and says nothing.
  const other = members.find((member) => member.id !== recordedBy);

  return (
    <AppShell>
      <EntryHead
        back={`/espacios/${space.id}/movimientos`}
        sharedWith={other?.name ?? null}
      />

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
          // What nearly every Movement is. The toggle is right above the
          // keypad for the ones that are not.
          direction: "expense",
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
    </AppShell>
  );
}
