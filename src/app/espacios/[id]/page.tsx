import { headers } from "next/headers";
import { ButtonLink } from "@/ui/button";
import { GroupedList, GroupedListItem } from "@/ui/grouped-list";
import { t } from "@/i18n";
import { readerOf } from "@/app/reader";
import { MonthPill } from "./month-pill";
import { SpaceScreen } from "./screen";
import { currentSpace, viewingMember } from "./space";
import { monthInView, spaceMembers } from "./movimientos/month";
import { readableBudget } from "./presupuesto/budget";
import { FixedItems } from "./presupuesto/fixed";
import { MonthSummary } from "./presupuesto/summary";
import { Variables } from "./presupuesto/variables";
import styles from "./page.module.css";

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
  const space = await currentSpace(id);
  // The Space's money, written the way whoever opened this reads numbers
  // (ADR-0014). Two Members of one Space read one amount two ways; it is the
  // same amount, and it is in the Space's currency for both of them.
  // Which month "this month" is, is the Reader's question as much as how the
  // figure is written (ADR-0018): at nine at night on the 30th the server is
  // already in the next one, and this would be the cost of a month nobody has
  // started spending in.
  const reader = readerOf(await headers());
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

  const at = (asked: string) => `/espacios/${space.id}?mes=${asked}`;

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
        The two figures the month is about, and the meter between them: what it
        cost, what it was planned to cost, and how far through the plan that
        is. The pace rides inside the card, directly under the figures it is
        about, which is where the canvas draws it.
      */}
      <MonthSummary summary={plan.summary} pace={plan.pace} />

      {/*
        A month nobody has planned says what to do rather than that there is
        nothing: there is no Budget to create first, and the first item is the
        whole of it.

        Here, above both sections, and not inside either -- it is about the
        plan and not about one kind of item, and both sections draw nothing at
        all when it shows. It used to live inside the list of Variable items,
        which was the only list that always rendered; with that list gone
        (#63) it belongs to the screen, which is the one thing here that can
        see both halves of a Budget.

        `labelHidden` for the case `grouped-list.tsx` documents it for: the
        screen's own title already says this is the Presupuesto, and printing
        the word again over a single sentence is the heading saying nothing.
        Hidden and not absent, so the group is still one a screen reader can
        name and skip to.
      */}
      {nothingPlanned ? (
        <GroupedList label={t("nav.budget")} labelHidden>
          <GroupedListItem>{t("budget.empty")}</GroupedListItem>
        </GroupedList>
      ) : null}

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
        One way in, for both kinds (#80). There were two buttons here, reading
        almost the same, and choosing between them meant knowing what "fijo"
        meant -- the product asking somebody to name a type before it would let
        them write down a number.

        The recorded reason for the second one was that the two kinds were
        answered with different questions, and that a form which grew or shrank
        after a toggle is a form whose shape a thumb cannot predict. The first
        half stopped being true at #79, which gave every item a name and left
        the due day as the whole difference. The second half is answered on the
        form itself: the day question is on the screen from the start, so the
        only thing that grows is the picker directly under the chip that opened
        it.
      */}
      <div className={styles.plan}>
        <ButtonLink href={`/espacios/${space.id}/presupuesto/nuevo?mes=${month}`}>
          {t("budget.item.new")}
        </ButtonLink>
      </div>

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
