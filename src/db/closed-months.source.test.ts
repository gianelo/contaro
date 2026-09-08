// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const dbDir = path.resolve(import.meta.dirname);

const read = (name: string) => readFileSync(path.join(dbDir, name), "utf8");

/** Every module in `src/db`, so nothing is checked by a hardcoded list. */
const stores = readdirSync(dbDir)
  .filter((name) => name.endsWith(".ts") && !name.includes(".test."))
  .sort();

/**
 * The stores that write into a month. Both of them, named here rather than
 * discovered, so a third one is a line somebody had to add deliberately.
 */
const STORES = ["budget-items.ts", "movements.ts"] as const;

/**
 * Every write function in those stores, and what each one is called.
 *
 * Read as text and not by importing them, for the reason `link.source.test.ts`
 * gives: the question is not what these functions compute -- the integration
 * tests answer that -- but *whether each one asks*, which is a question about
 * the source.
 */
/**
 * The exported functions in those stores that do not write into a month, so
 * every export is classified rather than only the ones whose names were
 * guessed at.
 *
 * A verb list was the first shape of this and it was the same bug it exists to
 * catch: an eleventh write called `settle`, `mark` or `restore` matched no
 * pattern and was silently exempt. Written this way round, a new export in
 * either store fails this file until somebody says which of the two it is.
 */
const READS: Record<(typeof STORES)[number], readonly string[]> = {
  "budget-items.ts": [
    "findBudgetItemInSpace",
    "budgetItemsInMonth",
    "latestPlannedMonthBefore",
    "budgetItemsInMonthForSpaces",
  ],
  "movements.ts": [
    "carriedOverFrom",
    "findMovementInSpace",
    "movementsInMonth",
    "movementsInMonthForSpaces",
  ],
};

const WRITES: Record<(typeof STORES)[number], readonly string[]> = {
  "budget-items.ts": [
    "planBudgetItemInSpace",
    "planFixedItemInSpace",
    "payFixedItemInSpace",
    "amendBudgetItemInSpace",
    "amendFixedItemInSpace",
    "removeBudgetItemFromSpace",
    "copyPlanIntoMonth",
  ],
  "movements.ts": [
    "recordMovementInSpace",
    "amendMovementInSpace",
    "strikeMovementInSpace",
    "approveCarryOverInSpace",
  ],
};

/** A function's body, from its signature to the next one's. */
function bodyOf(source: string, name: string): string {
  const at = source.indexOf(`export async function ${name}(`);
  expect(at, `${name} is not an exported write in this store`).toBeGreaterThan(
    -1,
  );

  const next = source.indexOf("\nexport ", at + 1);
  return next === -1 ? source.slice(at) : source.slice(at, next);
}

const writesIn = (store: string) =>
  [...read(store).matchAll(/^export async function (\w+)\(/gm)].map(
    (found) => found[1] as string,
  );

/*
 * ADR-0002 promised that a closed month never changes, and `amendItem` and the
 * plan's correction screen both promised the refusal would live in one place
 * above the domain. `refuseAClosedMonth` is that place. This is what keeps it
 * one place as the stores grow: the rule has one implementation, and the count
 * of things that ask it is checked rather than trusted.
 *
 * The failure this exists to catch is not a wrong answer. It is the tenth
 * write, added a year from now, that quietly never asks -- and a closed month
 * that accepts one kind of edit is a closed month, said out loud in the
 * product, that is not true.
 */
describe("every write into a month asks whether the month is closed", () => {
  for (const store of STORES) {
    for (const name of WRITES[store]) {
      it(`${name} asks before it writes`, () => {
        // The call and not the name: these functions explain themselves in
        // prose, and a comment mentioning the rule is exactly the thing that
        // would be left behind by somebody deleting the line that runs it.
        expect(bodyOf(read(store), name)).toContain("await refuseAClosedMonth(");
      });
    }
  }
});

describe("the list of writes this file holds to that rule", () => {
  /*
   * The list above is written by hand, so it can go stale in the one direction
   * that matters: a new write nobody added to it would be a write nobody
   * checked. This is what makes forgetting the list as loud as forgetting the
   * question.
   */
  it("classifies every exported function in the stores, as a write or a read", () => {
    for (const store of STORES) {
      const unclassified = writesIn(store).filter(
        (name) =>
          !WRITES[store].includes(name) && !READS[store].includes(name),
      );

      expect(
        unclassified,
        `${store} exports something this file has not decided about: if it writes into a month it must ask the close, and if it only reads it belongs in READS`,
      ).toEqual([]);
    }
  });

  it("names only writes the stores really export", () => {
    for (const store of STORES) {
      const exported = writesIn(store);
      expect(WRITES[store].filter((name) => !exported.includes(name))).toEqual(
        [],
      );
    }
  });
});

/*
 * The other half of "one place": nothing answers this question on its own.
 * A second `select ... from closed_months` somewhere else is the second
 * half-answer the promise in `amendItem` was written to refuse.
 */
describe("the rule has one implementation", () => {
  it("is the only module that reads the closed months table", () => {
    const readers = stores.filter(
      (store) =>
        store !== "closed-months.ts" &&
        store !== "schema.ts" &&
        read(store).includes("closedMonths"),
    );

    expect(readers).toEqual([]);
  });
});
