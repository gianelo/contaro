import { GroupedList, GroupedListItem } from "@/ui/grouped-list";
import { Icon } from "@/ui/icon";
import { t } from "@/i18n";
import styles from "./way-in.module.css";

/**
 * The plus, at the size the canvas draws it on a row of words
 * (`design/MasIntacto.dc.html`) and at the weight the way to another Space
 * already asks for (`espacios/page.tsx`) — the same drawing beside the same
 * kind of sentence. The artboard draws the stroke a tenth heavier and is not
 * followed there: the canvas's weights are drawings and not a scale, which is
 * why the screen states a weight rather than deriving one (ADR-0026,
 * `variables.tsx`), and matching the plus the app already draws beside words
 * says more than a tenth of a stroke does.
 */
const PLUS = 18;
const PLUS_WEIGHT = 2.2;

export type WayIntoThePlanProps = {
  spaceId: string;
  /** The month being planned, so the form opens on it and not on today's. */
  month: string;
  /** Whether the month holds no item of either kind (`CONTEXT.md`). */
  nothingPlanned: boolean;
};

/**
 * The one way into a month's plan (#80), above both of the plan's sections
 * (#81).
 *
 * A row and not the filled button this used to be. The screen is grouped lists
 * from top to bottom since #63, and a filled button pressed against the
 * summary card would be louder than the two figures somebody opened the screen
 * to read (ADR-0043 for the vocabulary, ADR-0045 for this).
 *
 * The empty state rides in the same card rather than in a group of its own
 * above it. Both are hidden groups named "Presupuesto", and two of those in a
 * row is one name a screen reader reads twice with nothing to tell them apart.
 * Together they are the sentence and the answer to it: a month with nothing
 * planned still says so, and still shows the way to plan.
 */
export function WayIntoThePlan({
  spaceId,
  month,
  nothingPlanned,
}: WayIntoThePlanProps) {
  return (
    <div className={styles.card}>
      <GroupedList label={t("nav.budget")} labelHidden>
        {nothingPlanned ? (
          <GroupedListItem>{t("budget.empty")}</GroupedListItem>
        ) : null}

        {/*
          A link and never a button, for the reason `GroupedListItem` gives for
          every row that goes somewhere: it opens in a new tab, and it works
          before any JavaScript has loaded. Nothing happens here that a URL
          cannot say — the destination carries the month it was opened from.
        */}
        <GroupedListItem
          href={`/espacios/${spaceId}/presupuesto/nuevo?mes=${month}`}
          /*
            No label on the icon: the words beside it are the message, and a
            screen reader that heard "plus" first would hear the same fact
            twice. Wrapped only to be given a colour — the drawing carries none
            of its own on purpose (`Icon`), and this is the one row on the
            screen that is not written in the ordinary ink. The wrapper is a
            flex box, so it shrink-wraps the drawing and offers no second
            opinion about how wide the start of a row is, which is what
            `GroupedListItem` renders `leading` bare to avoid.
          */
          leading={
            <span className={styles.mark}>
              <Icon name="plus" size={PLUS} weight={PLUS_WEIGHT} />
            </span>
          }
        >
          <span className={styles.word}>{t("budget.plan.new")}</span>
        </GroupedListItem>
      </GroupedList>
    </div>
  );
}
