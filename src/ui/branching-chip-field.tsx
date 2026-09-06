"use client";

import { useState, type ReactNode } from "react";
import styles from "./branching-chip-field.module.css";
import { ChipField, type Chip } from "./chip-field";
import { cx } from "./cx";
import { hitTarget } from "./hit-target";

/**
 * A chip that may hold a second row of chips under it.
 *
 * One level down and no further, because the catalogue is two levels and no
 * more (ADR-0021). A third would need a different control, not a deeper type.
 */
export type ChipBranch = Chip & { children: readonly Chip[] };

export type BranchingChipFieldProps = {
  name: string;
  /** The question, over the headings and over whichever one is chosen. */
  legend: string;
  /** The question asked in place of `legend` once a heading is open. */
  more: string;
  /** What is written on the way back to the whole list. */
  change: string;
  branches: readonly ChipBranch[];
  /** What is chosen to begin with: a heading, or something under one. */
  defaultValue?: string;
  required?: boolean;
  /** Shown in place of the chips when there are none to offer. */
  empty?: ReactNode;
};

/**
 * A choice over a two-level set of chips, answered in one tap and refined in
 * a second.
 *
 * Tapping a heading chooses it: the field is filled and the form is valid,
 * which is what keeps a Category one tap from the amount (story 19 in #1) and
 * what makes a heading an honest answer rather than a way through. The domain
 * already agrees — money filed on a heading counts against the heading's plan
 * (ADR-0021) — so a heading that could only be passed through would be the
 * screen disagreeing with the ledger.
 *
 * Choosing one does not add a group; it changes what the one group offers.
 * The row that held the headings now holds the chosen heading and what it
 * holds, under the question `more` asks, and required of nobody beyond the
 * heading that is already chosen. That is "the interface suggests a
 * subcategory when one exists, without forcing it" drawn rather than
 * asserted: the suggestion is what the row turns into, and not forcing it is
 * the heading staying chosen if nothing further is touched. The two-step
 * reading ADR-0022 protects survives in the legend, which is the thing that
 * changes to say a heading has been answered and something finer is on offer.
 *
 * One row and not two because this screen has room for one: the picker gets a
 * legend line and a 44px row of chips, about 67px, and two stacked groups ask
 * for 146 — which is the keys pushed off the bottom of an iPhone 13 (#60).
 *
 * The cost, stated where it is paid: a subcategory takes two taps rather than
 * one, and while a heading is open the other headings are not on the row —
 * the way back, which rides the row ahead of the chips, is what brings them
 * out again. That trade was chosen against a flat list that weights the
 * heading and against a row per branch, on a canvas of this screen (#45).
 *
 * Every step writes one field under one name, because the answer is one
 * Category. `ChipField` does the drawing, so the radio group, the 44px target,
 * the off-screen input and the focus ring are the same rules here as there.
 */
export function BranchingChipField({
  name,
  legend,
  more,
  change,
  branches,
  defaultValue,
  required = false,
  empty,
}: BranchingChipFieldProps) {
  // An empty string is "nothing chosen" and not a value: it is what the entry
  // screens pass for a Movement that has no Category yet.
  const saved =
    defaultValue === undefined || defaultValue === "" ? null : defaultValue;

  const [chosen, setChosen] = useState<string | null>(saved);

  // Which branch is on the screen is read off the answer rather than tracked
  // beside it. They can never disagree that way, and there is no state to keep
  // in step: choosing a heading opens it, choosing something under it stays
  // where it is, and letting go of the answer closes the branch with it.
  const openBranch = branchHolding(branches, chosen);

  // A heading with nothing under it has nothing to offer, so it never takes
  // the other headings off the screen: it is chosen, and that is the end of
  // the question.
  if (openBranch === null || openBranch.children.length === 0) {
    return (
      <ChipField
        name={name}
        legend={legend}
        chips={branches}
        value={chosen ?? ""}
        onChange={setChosen}
        required={required}
        empty={empty}
      />
    );
  }

  // The chosen heading and what it holds, on one row and under one legend.
  // Merging them changes nothing about what is being answered: the two groups
  // this used to draw already shared a `name`, so the browser and the screen
  // reader had one radio group all along and only the drawing was in halves.
  // The heading leads because it is the answer that is already given, and what
  // it holds follows because that is the offer being made.
  return (
    <ChipField
      name={name}
      legend={more}
      chips={[openBranch, ...openBranch.children]}
      value={chosen ?? ""}
      onChange={setChosen}
      required={required}
      before={
        /* Composes the one class that owns the 44px, rather than restating
           the rule here: see src/ui/hit-target.ts. */
        <button
          type="button"
          onClick={() => setChosen(null)}
          className={cx(hitTarget, styles.change)}
        >
          {change}
        </button>
      }
    />
  );
}

/** The branch a value sits in: its own, if the value is a heading. */
function branchHolding(
  branches: readonly ChipBranch[],
  value: string | null,
): ChipBranch | null {
  if (value === null) return null;

  return (
    branches.find(
      (branch) =>
        branch.value === value ||
        branch.children.some((child) => child.value === value),
    ) ?? null
  );
}
