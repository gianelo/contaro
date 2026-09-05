// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const stylesheet = readFileSync(
  path.join(import.meta.dirname, "row.module.css"),
  "utf8",
);

/**
 * The scales, quietest first. Read as an order rather than as pixels, because
 * what this file has to hold is a comparison between two rules and not a
 * number: the day the canvas redraws the row at other sizes, the Category must
 * still not be louder than the figure.
 */
const TYPE = ["2xs", "xs", "sm", "base", "md", "lg", "xl", "2xl", "3xl"];
const WEIGHT = ["regular", "medium", "semibold", "bold"];

const rule = (name: string) =>
  stylesheet.match(new RegExp(`\\.${name}\\s*\\{([^}]*)\\}`))?.[1] ?? "";

const loudness = (name: string) => ({
  size: TYPE.indexOf(rule(name).match(/--text-([\w-]+)\)/)?.[1] ?? ""),
  weight: WEIGHT.indexOf(rule(name).match(/--weight-([\w-]+)\)/)?.[1] ?? ""),
});

describe("what is loudest on a row", () => {
  /*
   * The figure, and not the Category above it. The row used to draw the amount
   * at 14px in the secondary grey, under a Category at 15px in medium -- which
   * is backwards for the one thing a person opened the month's list to read
   * (#39). Held here because it is a fact about two rules together, and
   * neither rule can state it alone.
   */
  it("is the amount, never the Category above it", () => {
    const amount = loudness("amount");
    const category = loudness("category");

    expect(amount.size).toBeGreaterThanOrEqual(category.size);
    expect(amount.weight).toBeGreaterThan(category.weight);
  });

  it("is written in the ordinary ink and not in the quiet grey", () => {
    // The greying is what made it quiet in the first place, and a size that
    // grew while the colour stayed secondary would be half a fix.
    expect(rule("amount")).toContain("var(--color-text)");
  });

  it("reads both scales it claims to, so this test cannot pass vacuously", () => {
    expect(loudness("category").size).toBeGreaterThan(-1);
    expect(loudness("category").weight).toBeGreaterThan(-1);
    expect(loudness("amount").size).toBeGreaterThan(-1);
    expect(loudness("amount").weight).toBeGreaterThan(-1);
  });
});
