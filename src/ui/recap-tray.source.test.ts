// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.join(import.meta.dirname, "..", "..");
const read = (file: string) => readFileSync(path.join(root, file), "utf8");

/**
 * The recap tray of a confirmation sheet: the block that states what is about
 * to happen, as pairs, above the button that does it.
 *
 * It is written out three times rather than shared, and `way-in.module.css`
 * argues for that at length -- a shared component would have to hold both the
 * three-rows-always shape and the two-rows-sometimes one, which is more
 * surface than thirty lines of CSS costs. This file is what makes the
 * repetition safe rather than merely explained: three copies of one drawing
 * only stay one drawing if something reads all three.
 *
 * The thing it guards is the tray's own drawing -- its ground, its padding,
 * its corner, the air between its rows. Not `margin`, which is where the tray
 * sits in its sheet and is genuinely different in each: `fixed.module.css`
 * follows a heading and the other two follow a paragraph.
 *
 * That same `way-in.module.css` note ends "the day a third sheet wants a tray
 * is the day it becomes the ui's". #119 brought the third sheet. Extracting it
 * is a change of its own and not this one; until then, this file is the seam.
 */
const trays = [
  ["the payment recap", "src/app/espacios/[id]/presupuesto/fixed.module.css"],
  ["the copy offer", "src/app/espacios/[id]/presupuesto/way-in.module.css"],
  ["the close notice", "src/app/espacios/[id]/close-notice.module.css"],
] as const;

/**
 * The body of the `.recap` rule, which is the only rule of that name in each.
 *
 * Comments are stripped, because `[^}]*` takes the whole body and a commented
 * declaration on its own line reads exactly like a live one. Without this a
 * tray whose ground had been commented out would still pass -- the one way
 * this file could say a rule is drawn when nothing draws it.
 */
const recap = (css: string) =>
  /\n\.recap \{\n([^}]*)\}/.exec(css)?.[1]?.replace(/\/\*[\s\S]*?\*\//g, "");

const declared = (body: string, property: string) =>
  new RegExp(`^\\s*${property}:\\s*(.+);$`, "m").exec(body)?.[1];

describe("the recap tray the three confirmation sheets draw", () => {
  it.each(trays)("finds the tray in %s", (_name, file) => {
    // Without this every assertion below would pass vacuously against
    // `undefined`, which is the one way this file could lie.
    expect(recap(read(file)), `${file} no longer draws a .recap`).toBeDefined();
  });

  it.each(trays)("gives %s a ground the sheet under it does not have", (_name, file) => {
    // #123. A ground token is named for what is *under* it: this one is a
    // step off a raised surface, --color-fill is a step off the page, and
    // ADR-0057 is why they had to stop being one token.
    const body = recap(read(file)) ?? "";

    expect(declared(body, "background")).toBe("var(--color-fill-on-surface)");
  });

  it.each(["gap", "padding", "border-radius"])(
    "draws the same %s in all three",
    (property) => {
      // Three sheets drawing one tray three ways is the thing the repetition
      // was accepted in order to avoid. If they are going to be copies, they
      // have to stay copies.
      const values = trays.map(([, file]) =>
        declared(recap(read(file)) ?? "", property),
      );

      expect(values[0]).toBeDefined();
      expect(new Set(values).size).toBe(1);
    },
  );
});
