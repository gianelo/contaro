// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.join(import.meta.dirname, "..", "..");
const read = (file: string) => readFileSync(path.join(root, file), "utf8");

const css = read("src/ui/tab-bar.module.css");
const canvas = read("design/Presupuesto.dc.html");

/**
 * The bar and everything under it, found by the line above it rather than by
 * position, so a redesign that moves it up the file still finds it.
 *
 * Everything below is read out of this slice and not out of the whole
 * artboard: the same greys and gaps are drawn elsewhere on the screen, and a
 * pattern that matched one of those would pin the bar to a number that is not
 * the bar's.
 */
const at = canvas.indexOf("border-top: 1px solid #DCDCE0");
const block = at === -1 ? "" : canvas.slice(at);

/** The bar's own inline style. */
const bar = /^([^"]*)"/.exec(block)?.[1];

/** The raised button: the only 999px circle on the artboard's accent. */
const button = /style="([^"]*border-radius: 999px[^"]*background: #0E7C66[^"]*)"/.exec(
  block,
)?.[1];

/** An asleep tab's label, which is the one the canvas leaves unweighted. */
const asleep = /style="(font-size: [^"]*color: #8E8E93;)"/.exec(block)?.[1];

/**
 * Four numbers the tab bar reads off the canvas and keeps as literals, because
 * a value used in exactly one stylesheet is a value and not a token (ADR-0027).
 *
 * That makes them the numbers most easily left behind by a redesign: nothing
 * else in the app would break. So they are pinned against the artboard here,
 * the same way `width.source.test.ts` pins the column against `canvas.json`.
 */
describe("the numbers the tab bar reads off the canvas", () => {
  it("finds the bar, its button and an asleep label on the artboard", () => {
    // If these stop matching, every assertion below would pass vacuously
    // against `undefined`, which is the one way this file could lie.
    expect(bar, "the canvas no longer draws the bar's top line").toBeDefined();
    expect(button, "the canvas no longer draws the raised button").toBeDefined();
    expect(asleep, "the canvas no longer draws an asleep label").toBeDefined();
  });

  it("stands the bar off the screen by what the canvas puts above it", () => {
    expect(bar).toContain("padding: 9px 0 24px 0");
    expect(css).toContain("padding-top: 9px");
  });

  it("floors the bar at the canvas's 24px, or the phone's home indicator", () => {
    // The artboard has no env(), so its 24px is a drawing of the safe area
    // rather than a number to copy: on a phone that reports one, the phone
    // wins. A deliberate departure, and the only one (ADR-0027).
    expect(bar).toContain("0 24px 0");
    expect(css).toContain(
      "max(var(--space-10), env(safe-area-inset-bottom, 0px))",
    );
  });

  it("sets an icon off its word by what the canvas leaves between them", () => {
    expect(block).toContain("gap: 3px");
    expect(css).toContain("gap: 3px");
  });

  it("writes the labels at the size the canvas writes them", () => {
    expect(asleep).toContain("font-size: 10px");
    expect(css).toContain("font-size: 10px");
  });

  it("leaves an asleep label unweighted, so awake is the whole difference", () => {
    // The canvas declares a weight on the awake label and none on the asleep
    // one. A medium asleep label would halve the contrast the bar is drawn to
    // have.
    expect(asleep).not.toContain("font-weight");
    expect(css).toContain("font-weight: var(--weight-regular)");
    expect(css).toContain("font-weight: var(--weight-semibold)");
  });

  it("raises the button off the bar by what the canvas raises it", () => {
    expect(button).toContain("width: 50px");
    expect(button).toContain("height: 50px");
    expect(button).toContain("margin-top: -18px");

    expect(css).toContain("width: 50px");
    expect(css).toContain("height: 50px");
    expect(css).toContain("margin-top: -18px");
  });
});
