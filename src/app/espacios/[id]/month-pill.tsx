"use client";

import { useState } from "react";
import { BottomSheet } from "@/ui/bottom-sheet";
import { GroupedList, GroupedListItem } from "@/ui/grouped-list";
import { Icon } from "@/ui/icon";
import { cx } from "@/ui/cx";
import { hitTarget } from "@/ui/hit-target";
import { t } from "@/i18n";
import styles from "./month-pill.module.css";

/** What the canvas draws the chevron on the pill at, and how heavily. */
const CHEVRON = 13;
const CHEVRON_WEIGHT = 2.5;

/** The tick beside the month being read, sized to the row it marks. */
const CHECK = 17;

/**
 * One month the pill offers, already named and already pointed somewhere.
 *
 * Deliberately not `ReadableMonthChoice` with an `href` bolted on, though the
 * fields line up today. That type is the Budget reader's, and this component
 * lives a directory above it because the canvas draws the same pill on the
 * month's list: importing the plan's reader here would make the ledger's head
 * depend on the Budget to render. The month is a `string` for the same reason
 * -- a branded `Month` is the calendar's word, and what this needs is a key.
 */
export type MonthChoice = {
  month: string;
  /** The month as a person reads it: "Septiembre", "Enero 2027". */
  label: string;
  /** Where picking it goes: the same screen, on that month. */
  href: string;
  /** Whether it is the month currently being read. */
  inView: boolean;
};

export type MonthPillProps = {
  /**
   * The month written on the pill. Passed rather than read out of the choice
   * marked `inView`, because it is the month the screen is *showing* -- the
   * one fact the head of the screen must be right about -- and reading it back
   * out of a list would make it depend on that list holding the right entry.
   */
  label: string;
  choices: readonly MonthChoice[];
};

/**
 * Which month is being read, and the way to read another one (#40).
 *
 * It replaces the `‹ Septiembre ›` walker, and the difference is the number of
 * taps: reaching March from September was six of them, each one loading a
 * screen nobody wanted to look at. Every month the pill offers is one tap, and
 * the shape says so before it is touched -- a pill with a chevron is a thing
 * that opens, where two chevrons either side of a word are two steps.
 *
 * The months are in a sheet rather than in a menu that hangs off the pill,
 * because that is what this app opens for a deliberate choice everywhere else
 * (`When`, and the payment confirmation). They are links and not buttons, for
 * the reason a row that goes somewhere is always a link here: a month is a
 * place, it has a URL, and somebody can open one in a new tab or send it.
 */
export function MonthPill({ label, choices }: MonthPillProps) {
  const [choosing, setChoosing] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setChoosing(true)}
        /*
          The month first and what the control does after it, the way `When`
          names its "Cambiar": the accessible name has to start with the word
          on the screen, so anybody driving this by voice says what they see.
        */
        aria-label={t("space.month.pill", { month: label })}
        className={cx(hitTarget, styles.pill)}
      >
        <span className={styles.month}>{label}</span>
        {/* No label: the month beside it is the whole message. */}
        <Icon name="chevron-down" size={CHEVRON} weight={CHEVRON_WEIGHT} />
      </button>

      <BottomSheet
        open={choosing}
        title={t("space.month.choose")}
        onClose={() => setChoosing(false)}
      >
        {/*
          The sheet's own title already says what the list is, so the group's
          heading would print the same words twice -- and dropping it entirely
          would leave a list nobody can name or skip to.
        */}
        <GroupedList label={t("space.month.choose")} labelHidden>
          {choices.map((choice) => (
            <GroupedListItem
              key={choice.month}
              href={choice.href}
              /*
                Picking a month is a client-side navigation, which leaves this
                component mounted: without this the sheet would still be open,
                and covering, on the month it just opened.
              */
              onClick={() => setChoosing(false)}
              /*
                The month being read is marked in words and not only in ink.
                A list of fourteen where the current one is a different grey is
                a list somebody has to count their way through, and the tick is
                a labelled image so it is read out rather than seen only.
              */
              trailing={
                choice.inView ? (
                  <Icon
                    name="check"
                    size={CHECK}
                    label={t("space.month.inView")}
                  />
                ) : undefined
              }
            >
              {choice.label}
            </GroupedListItem>
          ))}
        </GroupedList>
      </BottomSheet>
    </>
  );
}
