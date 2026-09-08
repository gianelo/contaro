import { headers } from "next/headers";
import { GroupedList, GroupedListItem } from "@/ui/grouped-list";
import { t } from "@/i18n";
import { readerOf } from "@/app/reader";
import { CloseNotice } from "./close-notice";
import { MonthPill } from "./month-pill";
import { SpaceScreen } from "./screen";
import { openSpace, viewingMember } from "./space";
import { theCloseWaiting } from "./waiting";
import { monthInView, spaceMembers } from "./movimientos/month";
import { planToCopyForward, readableBudget } from "./presupuesto/budget";
import { FixedItems } from "./presupuesto/fixed";
import { MonthSummary } from "./presupuesto/summary";
import { Variables } from "./presupuesto/variables";
import { WayIntoThePlan } from "./presupuesto/way-in";

/**
 * The Space's Budget: where picking a Space lands, and where the month's plan
 * is read (#10).
 *
 * The plan is these rows and nothing above them: a Budget comes into existence
 * with its first item, so a month nobody has planned shows the way to plan one
 * rather than a Budget waiting to be created.
 */
export default async function SpacePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mes?: string }>;
}) {
  const [{ id }, { mes }] = await Promise.all([params, searchParams]);
  // The Space, and what this Member's membership row said the instant before
  // this request touched it: whether a month has ended since they last looked
  // is a question only readable from inside the act that overwrites the answer
  // (#118, `openSpace`).
  const { space, opening } = await openSpace(id);
  // The Space's money, written the way whoever opened this reads numbers
  // (ADR-0014). Two Members of one Space read one amount two ways; it is the
  // same amount, and it is in the Space's currency for both of them.
  // Which month "this month" is, is the Reader's question as much as how the
  // figure is written (ADR-0018): at nine at night on the 30th the server is
  // already in the next one, and this would be the cost of a month nobody has
  // started spending in.
  const asked = await headers();
  const reader = readerOf(asked);
  const month = monthInView(mes, reader.today);
  // What the month has actually cost and what it was planned to, side by side
  // at last: #10 kept them in separate lists so that neither read as a
  // comparison before #11 decided what "over" means, and #11 decided it. Both
  // come out of the one reader, so the meter drawn between them can never be a
  // picture of figures other than the two above it (#40).
  const [plan, members, memberId] = await Promise.all([
    readableBudget(space, month, reader),
    spaceMembers(space.id),
    // Who is reading, so the confirmation on a Fixed item can say who will be
    // recorded as having marked it paid before anything is created (#13).
    viewingMember(),
  ]);

  // Named from the Space's own rows rather than from the session, so the recap
  // says what the ledger will say: `recordedBy` is a Member of this Space, and
  // it is that Member's name a Movement is read under everywhere else.
  const reading = members.find((member) => member.id === memberId);

  // `currentSpace` has already refused a Member who is not in this Space, so
  // the Space and its own membership rows have to disagree for this to happen.
  // It throws rather than falling back, because the fallback a name has is an
  // empty one -- and a recap whose "Registrado por" is blank is the confirmation
  // failing silently at the one thing it exists to do.
  if (!reading) {
    throw new Error(
      `Member ${memberId} is in Space ${space.id} but is not one of its Members.`,
    );
  }

  const at = (chosen: string) => `/espacios/${space.id}?mes=${chosen}`;

  /*
   * The month that ended and has not been closed, if there is one (#118).
   *
   * Asked after the Members are in hand, because the invited Member's row names
   * the creator and the creator is a row of this Space rather than a session --
   * the same reason the paid-item recap is named from `members` above.
   *
   * Not tied to the month in view. A month ending is news, and which month
   * somebody happened to navigate to is not what decides whether they are told
   * (`waiting.ts`).
   */
  const waiting = await theCloseWaiting({
    space,
    memberId,
    // `currentSpace` has already refused a Member who is not in this Space, and
    // `createdBy` is a Member of it -- so a missing name here means the Space
    // and its own membership rows disagree, which is what the throw above is
    // about. The empty string is unreachable and is not a fallback anybody is
    // meant to read.
    creatorName:
      members.find((member) => member.id === space.createdBy)?.name ?? "",
    reader,
    headers: asked,
    opening,
  });

  // A Budget is its items, of either kind (CONTEXT.md). A month with the rent
  // on it and nothing else has been planned, so the empty state is about the
  // whole plan rather than about the Variable half of it.
  //
  // Read off the two sections the screen actually draws, now that the list of
  // Variable items is gone (#63). That is exact rather than nearly so: every
  // Variable item's Category is a measured one (ADR-0023), so a Category with
  // a Variable item on it always has a row in `variables` -- which makes an
  // empty `variables` the same fact as "no Variable item exists". With no
  // Fixed item beside it, the month holds no item of either kind.
  const nothingPlanned = plan.fixed.length === 0 && plan.variables.length === 0;

  // The plan there is to carry into this month, asked for only where it can be
  // offered (#121). A month that already has a plan has nothing to be offered,
  // and asking anyway would be a query paid for on every opening of this
  // screen for an answer no card would draw.
  const copy = nothingPlanned
    ? await planToCopyForward(space, month, reader)
    : null;

  return (
    <SpaceScreen
      space={space}
      tab="budget"
      /*
        The screen names itself and the Space becomes the line under it (#40).
        It is the tab's own word, so what a thumb pressed and what it landed on
        are the same word rather than two names for one place.
      */
      title={t("nav.budget")}
      /*
        Forwards as well as back, and the month's list reaches the same months
        out of the same function since #61 (`monthChoices`). It used to stop
        at the month being lived in, because a Movement is money that has
        already moved and a chevron there loaded a screen guaranteed empty --
        but that bound was paying for a step, and a picker charges nothing for
        a row nobody taps (ADR-0039). The plan needed the month ahead anyway:
        it is exactly the month somebody plans on the 28th.
      */
      beside={
        <MonthPill
          label={plan.label}
          choices={plan.choices.map((choice) => ({
            ...choice,
            href: at(choice.month),
          }))}
        />
      }
    >
      {/*
        The month that ended, said until it is closed -- and, exactly once, said
        by a sheet that opens on its own (#118). Above everything, because it is
        the only thing on this screen that is not about the month being read:
        under the summary it would be an announcement a person reaches after
        they have already started reading the figures it interrupts.
      */}
      {waiting ? <CloseNotice spaceId={space.id} waiting={waiting} /> : null}

      {/*
        The two figures the month is about, and the meter between them: what it
        cost, what it was planned to cost, and how far through the plan that
        is. The pace rides inside the card, directly under the figures it is
        about, which is where the canvas draws it.
      */}
      <MonthSummary summary={plan.summary} pace={plan.pace} />

      {/*
        One way in, for both kinds (#80), and here rather than at the foot of
        the screen (#81). There were two buttons under both lists, reading
        almost the same, and choosing between them meant knowing what "fijo"
        meant -- the product asking somebody to name a type before it would let
        them write down a number. The recorded reason for the second one was
        that a form which grew or shrank after a toggle is a form whose shape a
        thumb cannot predict; the day question on the form behind this row is
        on the screen from the moment it loads, which is that objection
        answered (ADR-0044).

        Above both lists because below them it was the one control on the
        screen whose distance from a thumb grew with every item planned -- and
        it is the control a person with a long plan needs most. A reachability
        that degrades as the feature succeeds is the same toll ADR-0027 took
        off the way into a Movement, which was a link at the foot of the
        month's list until the raised button replaced it. This is that argument
        arriving at the plan.

        Above both and not inside either, because a Budget is its items of
        either kind (CONTEXT.md, ADR-0019): a way in nested in the Variables
        card would read as "add a variable", which is the ambiguity #63 exists
        to remove.

        The whole-plan empty state travels with it, inside the same card and
        for reasons that belong to the card (`way-in.tsx`, ADR-0045).
      */}
      <WayIntoThePlan
        spaceId={space.id}
        month={month}
        nothingPlanned={nothingPlanned}
        copy={copy}
      />

      {/*
        What the month already owes on days it knows about, and what has been
        paid (#13). Above the Variables, because it is read first and for a
        different question: not "how much is left" but "have I paid it".
      */}
      <FixedItems
        spaceId={space.id}
        month={month}
        items={plan.fixed}
        spaceName={space.name}
        memberName={reading.name}
      />

      {/*
        What each Category expected, what it really cost, and — under each
        row — the items that figure is made of (#11, #63). One line per
        Category and never one per item: several items on one Category are how
        a month is planned in weeks, and they are one thing to be over or
        under. This is the only place that can see a Member who is under on
        every single shop and over for the month.

        It is also the only place the month's items are drawn now. There used
        to be a second list of them above this one, headed "El plan del mes",
        which drew every planned Category a second time under a second heading
        and left a person reading two plans for one month. The items are all
        still here and still correctable, one tap inside the figure they add
        up to.
      */}
      <Variables spaceId={space.id} comparisons={plan.variables} />

      {/*
        Who shares this Space, and the way to invite the person who does not
        yet (#9). Here and not in the tab bar: the tabs are the four places a
        thumb goes every day, and inviting somebody happens once. It is on the
        Space's own screen because that is where a fact about the Space
        belongs, and it names the Members so the answer is on the screen even
        for whoever never opens it.
      */}
      <GroupedList label={t("members.title")} labelHidden>
        <GroupedListItem
          href={`/espacios/${space.id}/miembros`}
          trailing={members.map((member) => member.name).join(" · ")}
        >
          {t("space.members")}
        </GroupedListItem>
      </GroupedList>
    </SpaceScreen>
  );
}
