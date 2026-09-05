// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const stylesheet = readFileSync(
  path.join(import.meta.dirname, "summary.module.css"),
  "utf8",
);

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
