// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The card's rules, with the prose between them taken out.
 *
 * The comments in that file name the declarations they are about -- including
 * the one this file bars from it -- so a test reading the raw bytes would find
 * a rule written down in a sentence explaining why it is not written down.
 */
const stylesheet = readFileSync(
  path.join(import.meta.dirname, "summary.module.css"),
  "utf8",
).replace(/\/\*[\s\S]*?\*\//g, "");

/**
 * The scales, quietest first. Read as an order rather than as pixels, for the
 * reason `row.source.test.ts` reads them that way: what this file holds is a
 * comparison between two rules and not a number, so the day the canvas redraws
 * the card at other sizes the plan must still not be louder than the spending.
 */
const TYPE = [
  "3xs",
  "2xs",
  "xs",
  "sm",
  "base",
  "md",
  "lg",
  "xl",
  "2xl",
  "figure",
  "3xl",
  "title",
  "amount",
];
const WEIGHT = ["regular", "medium", "semibold", "bold"];

const rule = (name: string) =>
  stylesheet.match(new RegExp(`\\.${name}\\s*\\{([^}]*)\\}`))?.[1] ?? "";

const loudness = (name: string) => ({
  size: TYPE.indexOf(rule(name).match(/--text-([\w-]+)\)/)?.[1] ?? ""),
  weight: WEIGHT.indexOf(rule(name).match(/--weight-([\w-]+)\)/)?.[1] ?? ""),
});

/** A size that follows the box it is in rather than naming a step of the scale. */
const FOLLOWS_THE_BOX = /clamp\(|min\(|max\(|\d(vw|vi|vh|cqi|cqw)/;

const tokens = readFileSync(
  path.join(import.meta.dirname, "../../../../ui/tokens.css"),
  "utf8",
);

/** What the scale step a rule names is actually worth, straight from `tokens.css`. */
const scaleStepFor = (name: string) => {
  const step = rule(name).match(/--text-([\w-]+)\)/)?.[1];

  return tokens.match(new RegExp(`--text-${step}:\\s*([^;]+);`))?.[1]?.trim() ?? "";
};

describe("what is loudest on the month's summary card", () => {
  /*
   * "The plan written quieter than the spending" is an acceptance criterion of
   * #40 and not a detail of the styling: "Gastado" is the figure a person
   * opened the screen for, and "Presupuestado" is what it is being read
   * against. Held here because it is a fact about two rules together, and
   * neither rule can state it alone.
   */
  it("is what the month cost, never the plan beside it", () => {
    const spent = loudness("spent");
    const planned = loudness("planned");

    expect(spent.size).toBeGreaterThan(planned.size);
    expect(spent.weight).toBeGreaterThan(planned.weight);
  });

  // Quieter in ink as well as in size. A figure that shrank while keeping the
  // ordinary ink would be half the ranking, the way the month's list found.
  it("writes the plan in the quiet grey and the spending in the ordinary ink", () => {
    expect(rule("planned")).toContain("var(--color-text-secondary)");
    expect(rule("spent")).not.toContain("var(--color-text-secondary)");
  });

  it("reads both scales it claims to, so this test cannot pass vacuously", () => {
    expect(loudness("spent").size).toBeGreaterThan(-1);
    expect(loudness("spent").weight).toBeGreaterThan(-1);
    expect(loudness("planned").size).toBeGreaterThan(-1);
    expect(loudness("planned").weight).toBeGreaterThan(-1);
  });
});

/*
 * #69's two halves, which are one decision: the figures are given a share of
 * the line rather than assumed to fit, and what they do when they still do not
 * fit is to take a line each. Held in the stylesheet because that is where the
 * whole of it lives -- there is no branch in `summary.tsx` to drive, and the
 * e2e that measures the boxes cannot say *why* they no longer overlap.
 */
describe("what the card does when a figure gets wide", () => {
  /*
   * The pair separates rather than squeezing. `min-width: 0` on the columns is
   * what let a figure paint out of its own box and across the one beside it,
   * and an amount has no break in it to relieve the pressure -- so the answer
   * is a second line and never a narrower column.
   */
  it("wraps the two figures onto their own lines rather than shrinking them", () => {
    expect(rule("figures")).toMatch(/flex-wrap:\s*wrap/);
    // Asked of the whole stylesheet rather than of the two columns by name:
    // `rule` reads one selector at a time and these two share a block, so a
    // pair of `.not` assertions against it would pass by finding nothing at
    // all. The declaration would let a figure out of its box from wherever on
    // this card it were written, so nowhere on this card is where it is barred.
    expect(stylesheet).not.toMatch(/min-width:\s*0/);
  });

  /*
   * And it does not buy the fit by going quiet. "Gastado" is the answer to the
   * question the screen exists to ask, and a size that follows the box -- a
   * `clamp`, a viewport or container unit, a `min()` -- would make every
   * ordinary month smaller to pay for the widest month a catalogue of ten
   * currencies can produce.
   */
  it("keeps the spending at one step of the scale, not a size that follows the box", () => {
    expect(rule("spent")).toMatch(/font-size:\s*var\(--text-[\w-]+\)\s*;/);
    expect(rule("spent")).not.toMatch(FOLLOWS_THE_BOX);

    // And the step it names is a fixed one. Asked of `tokens.css` too, because
    // the rule here is only half the answer: a `--text-figure` redefined as a
    // `clamp` would shrink this figure with nothing on this card changing, and
    // the assertion above would go on passing while the criterion broke.
    expect(scaleStepFor("spent")).toMatch(/^\d+(\.\d+)?px$/);
  });
});
