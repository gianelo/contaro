// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.join(import.meta.dirname, "..", "..");
const read = (file: string) => readFileSync(path.join(root, file), "utf8");

const keypad = read("src/ui/keypad.module.css");
const segmented = read("src/ui/segmented-field.module.css");
const light = read("design/Main.dc.html");
const dark = read("design/CargarGastoOscuro.dc.html");

/** The one inline style on the artboard that draws a key. */
const key = /class="k"[^>]*style="([^"]*)"/.exec(light)?.[1];

/** The track the two halves sit in: the only 9px corner on the artboard. */
const track = /style="([^"]*border-radius: 9px[^"]*)"/.exec(light)?.[1];

/**
 * The numbers the entry screen reads off `design/Main.dc.html` and keeps as
 * literals, because a value used in exactly one stylesheet is a value and not
 * a token (ADR-0027, ADR-0028).
 *
 * Being literals is what makes them easy for a redesign to leave behind:
 * nothing else in the app would break. So they are read back out of the
 * artboard and the stylesheet together, the way `tab-bar.source.test.ts` and
 * `width.source.test.ts` already do.
 */
describe("the numbers the entry screen reads off the canvas", () => {
  it("finds the key and the track on the artboard", () => {
    // Without this every assertion below would pass vacuously against
    // `undefined`, which is the one way this file could lie.
    expect(key, "the canvas no longer draws a keypad key").toBeDefined();
    expect(track, "the canvas no longer draws the segmented track").toBeDefined();
  });

  describe("the keypad", () => {
    it("gives a key the height and the corner the canvas gives it", () => {
      expect(key).toContain("height: 50px");
      expect(key).toContain("border-radius: 10px");

      expect(keypad).toContain("height: 50px");
      expect(keypad).toContain("border-radius: 10px");
    });

    it("sets the numbers on the keys at the canvas's size", () => {
      expect(key).toContain("font-size: 25px");
      expect(keypad).toContain("font-size: 25px");
    });

    it("keeps the symbol lighter than any weight token", () => {
      // 300, which is below --weight-regular and used in this one place.
      expect(light).toContain("font-size: 30px; font-weight: 300");
      expect(keypad).toContain("font-weight: 300");
    });

    it("sets the currency under the figure rather than a gap away", () => {
      // The artboard leaves 2px under the figure and 14px under the currency:
      // the two are one block, and the keypad's own gap goes below them.
      expect(light).toContain("padding: 6px 16px 2px 16px");
      expect(keypad).toContain("gap: 2px");
    });
  });

  describe("the segmented control", () => {
    it("sits its halves in the groove the canvas draws", () => {
      expect(track).toContain("border-radius: 9px");
      expect(track).toContain("padding: 2px");

      expect(segmented).toContain("border-radius: var(--radius-sm)");
      expect(segmented).toContain("padding: var(--space-1)");
    });

    it("rounds the chosen half inside the corner it sits in", () => {
      expect(light).toContain("border-radius: 7px");
      expect(segmented).toContain("border-radius: 7px");
    });

    it("lifts the chosen half off a track it would otherwise vanish into", () => {
      // The dark artboard draws the thumb #3A3A3C on a #1C1C1E track, and the
      // light one draws it white. Reading both is the point: the token this
      // replaced resolved to the track's own colour in dark.
      expect(dark).toContain("'#3A3A3C' : 'transparent'");
      expect(light).toContain("'#FFFFFF' : 'transparent'");
      expect(segmented).toContain("var(--color-segment-thumb)");
    });
  });

  describe("a button that cannot be pressed", () => {
    it("is filled and inked the way both artboards fill it", () => {
      // Two palettes and not one: the light pair happens to match
      // --color-disabled and the dark pair does not, which is why the two
      // grounds are named apart in tokens.css.
      expect(light).toContain("'#C6C6C8'");
      expect(dark).toContain("'#2C2C2E'");
      expect(dark).toContain("'#6C6C70'");

      expect(read("src/ui/button.module.css")).toContain(
        "var(--color-disabled-surface)",
      );
    });
  });
});
