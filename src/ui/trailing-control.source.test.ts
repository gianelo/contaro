// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const srcDir = path.resolve(import.meta.dirname, "..");
const read = (file: string) => readFileSync(path.join(srcDir, file), "utf8");

const shared = read(path.join("ui", "trailing-control.module.css"));

/**
 * The two screens that put a real control in `EntryHead`'s trailing slot. Both
 * arrived at the same nine declarations on their own before #142 pulled them
 * into one class, which is exactly the drift these assertions are here to stop
 * happening a third time.
 */
const screens = {
  "taking an item off the plan": path.join(
    "app",
    "espacios",
    "[id]",
    "presupuesto",
    "[itemId]",
    "head.module.css",
  ),
  "creating a Space": path.join(
    "app",
    "espacios",
    "nuevo",
    "form.module.css",
  ),
};

/**
 * A component test can prove a button wears `.trailingControl`; it cannot
 * prove the class is worth wearing, or that a screen has not quietly written
 * its own copy beside it. This reads the stylesheets themselves, the way
 * `hit-target.source.test.ts` reads the two that decide the touch size.
 */
describe("the clothes a control wears in the head's trailing slot", () => {
  it("gives up every ground a browser would give a button, in one place", () => {
    const rule = shared.slice(shared.indexOf(".trailingControl"));

    expect(rule).toMatch(/border:\s*none\s*;/);
    expect(rule).toMatch(/background:\s*transparent\s*;/);
    expect(rule).toMatch(/appearance:\s*none\s*;/);
  });

  it("says what a refused one looks like there rather than on each screen", () => {
    const refused = shared.slice(shared.indexOf(".trailingControl:disabled"));

    // The same grey a disabled plain Button goes: nothing here is filled, so
    // fading it would read as loading rather than as refused for a moment.
    expect(refused).toMatch(/color:\s*var\(--color-disabled\)\s*;/);
  });

  it("names no touch size of its own, because hitTarget is that rule's one place", () => {
    expect(shared).not.toContain("--hit-target");
  });

  it.each(Object.entries(screens))(
    "leaves %s only what its own control means",
    (_screen, stylesheet) => {
      const css = read(stylesheet);

      expect(css).not.toMatch(/appearance:\s*none/);
      expect(css).not.toMatch(/background:\s*transparent/);
      // Including the refused state: a screen that greys its own control is a
      // screen that has started keeping a second copy of this rule.
      expect(css).not.toContain(":disabled");
    },
  );
});
