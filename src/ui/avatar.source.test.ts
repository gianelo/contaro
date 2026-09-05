// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const stylesheet = readFileSync(
  path.join(import.meta.dirname, "avatar.module.css"),
  "utf8",
);

/**
 * The sizes are read out of the stylesheet rather than off a rendered avatar,
 * because a rendered one cannot prove them: jsdom resolves no custom
 * properties, and the CSS module proxy hands back a class name for any key
 * asked of it -- including one no rule declares. `avatar.test.tsx` proves the
 * prop reaches the class; this proves the class is a size.
 */
const size = (name: string) =>
  stylesheet.match(new RegExp(`\\.${name}\\s*\\{[^}]*?width:\\s*(\\d+)px`));

describe("the sizes a person is drawn at", () => {
  it.each([
    ["lg", "44"],
    ["sm", "28"],
    ["xs", "21"],
  ])("draws %s at the %spx the canvas draws it", (name, pixels) => {
    expect(size(name)?.[1]).toBe(pixels);
  });

  // Three sizes and three different circles. Two names holding one number is a
  // size that has quietly stopped existing, and the row on the month's list
  // would draw its avatar at the size a Space card stacks.
  it("keeps the three of them apart", () => {
    const drawn = ["lg", "sm", "xs"].map((name) => size(name)?.[1]);

    expect(new Set(drawn).size).toBe(3);
  });
});
