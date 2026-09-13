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
const form = read("src/app/espacios/[id]/movimientos/form.tsx");
const tokensCss = read("src/ui/tokens.css");

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
    /*
     * The one number on this screen the app no longer takes from the canvas,
     * and the divergence is the point of the assertion rather than a drift it
     * failed to catch (#66, ADR-0048).
     *
     * ADR-0037 budgeted this screen at 643px against the 664 a phone gives and
     * said the air between the blocks would be what gave, never the keys. Then
     * #66 put a seventh block on the form, and
     * 21px of air could not pay for it: the air went to 6px and the screen was
     * still over the fold on both entry and correction.
     *
     * So the keys pay the rest, down to 44px -- which is `--hit-target`, the
     * floor this repo applies to everything a finger lands on and measures in
     * a real browser. Below the canvas's number and not below the product's
     * own rule, which is the whole of what makes it payable.
     *
     * The canvas is still asserted at 50 rather than edited to 44: it drew a
     * screen with no name on it, and a canvas quietly rewritten to match the
     * code stops being able to tell anybody the code moved.
     */
    it("gives a key the corner the canvas gives it, and the height ADR-0048 bought", () => {
      expect(key).toContain("height: 50px");
      expect(key).toContain("border-radius: 10px");

      expect(keypad).toContain("height: 44px");
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
      // Both artboards name --color-segment-thumb directly since #138, the
      // same token segmented-field.module.css already draws with -- no
      // longer two independently pinned literals that happen to agree with
      // it, but one token the browser resolves per scheme: #3A3A3C on the
      // dark track, white on the light one, read here off tokens.css itself
      // rather than re-typed as hexes a future edit could drift from.
      const darkThumb = tokensCss.match(/--color-segment-thumb:\s*light-dark\([^,]+,\s*([^)]+)\)/)?.[1];
      const lightThumb = tokensCss.match(/--color-segment-thumb:\s*light-dark\(\s*([^,]+),/)?.[1];
      expect(dark).toContain("'var(--color-segment-thumb)' : 'transparent'");
      expect(light).toContain("'var(--color-segment-thumb)' : 'transparent'");
      expect(darkThumb).toBe("#3a3a3c");
      expect(lightThumb).toBe("#ffffff");
      expect(segmented).toContain("var(--color-segment-thumb)");
    });
  });

  describe("a button that cannot be pressed", () => {
    it("is filled and inked the way both artboards fill it", () => {
      // Both artboards name the token directly since #138, so the pair this
      // test is about -- ground and ink, agreeing in light and diverging in
      // dark, which is why they are named apart in tokens.css -- is read off
      // tokens.css's own resolved values rather than off two independently
      // pinned literals.
      expect(light).toContain("'var(--color-disabled-surface)'");
      expect(dark).toContain("'var(--color-disabled-surface)'");
      expect(dark).toContain("'var(--color-on-disabled)'");

      const disabledSurfaceDark = tokensCss.match(
        /--color-disabled-surface:\s*light-dark\([^,]+,\s*([^)]+)\)/,
      )?.[1];
      const onDisabledDark = tokensCss.match(/--color-on-disabled:\s*light-dark\([^,]+,\s*([^)]+)\)/)?.[1];
      expect(disabledSurfaceDark).toBe("#2c2c2e");
      expect(onDisabledDark).toBe("#6c6c70");

      // And the light halves, which the artboards used to pin and this file
      // would otherwise have stopped reading. The pair agreeing in light is
      // exactly as load-bearing as its diverging in dark: it is the agreement
      // that makes "these are one pair here and two there" a fact rather than
      // a story about the dark palette alone.
      const disabledSurfaceLight = tokensCss.match(
        /--color-disabled-surface:\s*light-dark\(\s*([^,]+),/,
      )?.[1];
      const onDisabledLight = tokensCss.match(/--color-on-disabled:\s*light-dark\(\s*([^,]+),/)?.[1];
      expect(disabledSurfaceLight?.trim()).toBe("#c6c6c8");
      expect(onDisabledLight?.trim()).toBe("#ffffff");

      expect(read("src/ui/button.module.css")).toContain(
        "var(--color-disabled-surface)",
      );
    });
  });

  describe("an amount nobody has typed", () => {
    it("is greyed the way both artboards grey it", () => {
      // Both artboards name --color-disabled and --color-text directly since
      // #138, which closes off half of what ADR-0028 (#41) found: there is no
      // second hardcoded literal left for a dark artboard to drift from.
      //
      // It does not close off the other half, so the halves are still read.
      // #41's finding was that the *pair* had diverged -- in light the untyped
      // amount happens to be the dead button's ground and in dark it is not,
      // which is the whole reason the two are named apart -- and one token
      // named in both artboards says nothing about whether either palette
      // still holds the value the canvas was measured at. Read off tokens.css
      // rather than re-typed, so this pins the canvas's numbers without
      // becoming a second place a hex has to be edited.
      expect(light).toContain("'var(--color-disabled)' : 'var(--color-text)'");
      expect(dark).toContain("'var(--color-disabled)' : 'var(--color-text)'");

      const halves = (name: string) =>
        tokensCss.match(new RegExp(`--${name}:\\s*light-dark\\(\\s*([^,]+),\\s*([^)]+)\\)`));

      const disabled = halves("color-disabled");
      const text = halves("color-text");
      expect(disabled?.[1]?.trim()).toBe("#c6c6c8");
      expect(disabled?.[2]?.trim()).toBe("#48484a");
      expect(text?.[1]?.trim()).toBe("#1c1c1e");
      expect(text?.[2]?.trim()).toBe("#ffffff");

      expect(keypad).toContain("var(--color-disabled)");
    });
  });
});

/**
 * The order the entry screen comes down in, read off the canvas and off the
 * form and compared (#52).
 *
 * Everything above pins a number. A number is what a stylesheet can be wrong
 * about, and #37 was wrong about none of them: it shipped ten green criteria
 * with the direction under the figure and the keys against it, because the
 * one thing nothing read back was the order the blocks come in.
 *
 * So each block is named by something only that block contains, in each of
 * the two files, and the sequence the artboard puts them in is compared with
 * the sequence the form puts them in. Landmarks and not whole blocks: what is
 * held here is the order, and the numbers are held above.
 */
const BLOCKS = [
  // The segmented control's groove: the only 9px corner on the artboard.
  { block: "the direction", onTheCanvas: "border-radius: 9px", inTheForm: "<SegmentedField" },
  { block: "the figure", onTheCanvas: "font-size: 52px", inTheForm: "<Readout" },
  // The day line's corner, which is 11px and nothing else on the screen is.
  { block: "the day line", onTheCanvas: "border-radius: 11px", inTheForm: "<When" },
  { block: "the Category", onTheCanvas: "CATEGORÍA", inTheForm: "<BranchingChipField" },
  { block: "the keys", onTheCanvas: 'class="k"', inTheForm: "<Keys" },
  { block: "Save", onTheCanvas: "Guardar", inTheForm: 'type="submit"' },
] as const;

type Block = (typeof BLOCKS)[number];

/** The blocks named in the order the given file happens to put them in. */
const sequenceIn = (source: string, landmarkOf: (block: Block) => string) =>
  [...BLOCKS]
    .sort((a, b) => source.indexOf(landmarkOf(a)) - source.indexOf(landmarkOf(b)))
    .map((block) => block.block);

describe("the order the blocks come down the entry screen", () => {
  it("finds every block in both files", () => {
    // Without this a renamed landmark would leave a -1 that sorts first, and
    // the comparison below would agree about a file it never read.
    for (const block of BLOCKS) {
      expect(light, `the canvas no longer draws ${block.block}`).toContain(
        block.onTheCanvas,
      );
      expect(form, `the form no longer draws ${block.block}`).toContain(
        block.inTheForm,
      );
    }
  });

  it("draws them in the sequence the canvas draws them", () => {
    expect(sequenceIn(form, (block) => block.inTheForm)).toEqual(
      sequenceIn(light, (block) => block.onTheCanvas),
    );
  });

  it("keeps the figure and the keys as two components", () => {
    // The reason this ticket is a ticket: with one `Keypad` there is nowhere
    // for the day line and the Category to go. A `<Keypad` back in this file
    // would be the split quietly undone.
    expect(form).not.toContain("<Keypad");
  });
});
