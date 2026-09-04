import { headers } from "next/headers";
import Link from "next/link";
import { ButtonLink } from "@/ui/button";
import { GroupedList, GroupedListItem } from "@/ui/grouped-list";
import { cx } from "@/ui/cx";
import { hitTarget } from "@/ui/hit-target";
import { t } from "@/i18n";
import { readerOf } from "@/app/reader";
import { SpaceScreen } from "./screen";
import { currentSpace } from "./space";
import { monthInView, readableMonth, spaceMembers } from "./movimientos/month";
import { readableBudget } from "./presupuesto/budget";
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
  const [{ spent }, plan, members] = await Promise.all([
    readableMonth(space, month, reader),
    readableBudget(space, month, reader),
    spaceMembers(space.id),
  ]);

  const at = (asked: string) => `/espacios/${space.id}?mes=${asked}`;

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
      </GroupedList>

      {/*
        The plan itself: one row per item, in the order they were planned.
        Several items on one Category stay several rows, because they are how a
        person thinks in weeks — sixty thousand of groceries a week rather than
        two hundred and forty a month — and collapsing them here would take
        away the four rows they meant to be able to edit.
      */}
      <GroupedList label={t("budget.title")}>
        {plan.items.length === 0 ? (
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
          The total of exactly the rows above it, and only where there are
          rows: a plan of nothing adds up to nothing, which the empty state
          has already said in words.
        */}
        {plan.items.length > 0 ? (
          <GroupedListItem trailing={plan.expected}>
            {t("budget.planned")}
          </GroupedListItem>
        ) : null}
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
