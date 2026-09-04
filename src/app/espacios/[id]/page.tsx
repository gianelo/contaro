import { headers } from "next/headers";
import Link from "next/link";
import { ButtonLink } from "@/ui/button";
import { GroupedList, GroupedListItem } from "@/ui/grouped-list";
import { cx } from "@/ui/cx";
import { hitTarget } from "@/ui/hit-target";
import { t } from "@/i18n";
import { readerOf } from "@/app/reader";
import { SpaceScreen } from "./screen";
import { currentSpace, viewingMember } from "./space";
import { monthInView, readableMonth, spaceMembers } from "./movimientos/month";
import { readableBudget } from "./presupuesto/budget";
import { FixedItems } from "./presupuesto/fixed";
import { Pace } from "./presupuesto/pace";
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
  // What the month has actually cost, and what it was planned to. Deliberately
  // not side by side: this ticket builds the plan and #11 measures spending
  // against it, and two figures in one group is that comparison made by eye
  // before anybody decided what "over" means. The plan's total sits with the
  // plan, as the total of the rows above it.
  const [{ spent }, plan, members, memberId] = await Promise.all([
    readableMonth(space, month, reader),
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
  const nothingPlanned = plan.items.length === 0 && plan.fixed.length === 0;

  return (
    <SpaceScreen space={space} tab="budget">
      {/*
        Forwards as well as back, unlike the month's list. A Movement is money
        that has already moved, so its list stops at the month being lived in;
        a plan is what a Space expects to spend, and the month after this one
        is exactly the month somebody plans on the 28th (`monthsToPlan`).
      */}
      <nav className={styles.months} aria-label={t("space.month.choose")}>
        <Link
          href={at(plan.around.previous)}
          className={cx(hitTarget, styles.step)}
          aria-label={t("space.month.previous")}
        >
          ‹
        </Link>
        <h2 className={styles.month}>{plan.label}</h2>
        <Link
          href={at(plan.around.next)}
          className={cx(hitTarget, styles.step)}
          aria-label={t("space.month.next")}
        >
          ›
        </Link>
      </nav>

      <GroupedList label={t("space.month")}>
        <GroupedListItem trailing={spent}>
          {t("space.month.spent")}
        </GroupedListItem>
        {/*
          How that spending is going against the calendar (#14), in the same
          group and directly under the figure it is about — which is where the
          canvas draws it. One line of words and never a second meter, and it
          draws nothing at all on a month nobody is standing in.
        */}
        <Pace pace={plan.pace} />
      </GroupedList>

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
        The Variable items: one row per item, in the order they were planned.
        Several items on one Category stay several rows, because they are how a
        person thinks in weeks — sixty thousand of groceries a week rather than
        two hundred and forty a month — and collapsing them here would take
        away the four rows they meant to be able to edit.
      */}
      <GroupedList label={t("budget.title")}>
        {nothingPlanned ? (
          <GroupedListItem>{t("budget.empty")}</GroupedListItem>
        ) : (
          plan.items.map((item) => (
            <GroupedListItem
              key={item.id}
              href={`/espacios/${space.id}/presupuesto/${item.id}`}
              trailing={item.amount}
            >
              <span className={styles.category}>{item.category}</span>
              {/*
                The heading on a second line, the way the month's list writes
                one. Absent rather than empty: a Category that is itself a
                heading has nothing to say here, and a blank line still takes
                the height of one.
              */}
              {item.heading ? (
                <span className={styles.beneath}>{item.heading}</span>
              ) : null}
            </GroupedListItem>
          ))
        )}
        {/*
          What the whole month's plan adds up to — the Fijos above as well as
          the rows beside it, because both are what the month expects to cost
          (#13). It stopped being "the total of exactly the rows above it" the
          moment the other kind existed, and saying so is better than a figure
          nobody can add up by eye: what it totals is the plan, and the plan is
          both sections. #40 moves it into the summary card the canvas draws.

          Only where something is planned: a plan of nothing adds up to
          nothing, which the empty state has already said in words.
        */}
        {nothingPlanned ? null : (
          <GroupedListItem trailing={plan.expected}>
            {t("budget.planned")}
          </GroupedListItem>
        )}
      </GroupedList>

      {/*
        What each Category expected and what it really cost (#11). One line
        per Category and never one per item: the four weekly rows above are
        how a month is planned in weeks, and they are one thing to be over or
        under. This is the only place that can see a Member who is under on
        every single shop and over for the month.
      */}
      <Variables comparisons={plan.variables} />

      <div className={styles.plan}>
        <ButtonLink href={`/espacios/${space.id}/presupuesto/nuevo?mes=${month}`}>
          {t("budget.item.new")}
        </ButtonLink>
        {/*
          Its own way in, and not a choice inside the other one. The two kinds
          are answered with different questions -- a Fixed item is asked for a
          name and a day -- and a form that grew or shrank after a toggle is a
          form whose shape a thumb cannot predict.
        */}
        <ButtonLink
          variant="plain"
          href={`/espacios/${space.id}/presupuesto/nuevo/fijo?mes=${month}`}
        >
          {t("budget.fixed.new")}
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
