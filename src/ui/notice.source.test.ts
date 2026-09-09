// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (file: string) => readFileSync(file, "utf8");

const noticeDir = path.resolve(import.meta.dirname);
const css = read(path.join(noticeDir, "notice.module.css"));

/**
 * `Notice` is a `<p>`, and a `<p>` carries the browser's own `margin: 1em 0`
 * unless a stylesheet says otherwise. Every screen that draws one lays it out
 * with a container's own `gap`, so that margin was never spacing anybody
 * chose -- it was 28px stacked on top of the gap, and it was the fourth
 * paragraph ADR-0037's finding never reached. This is a source read rather
 * than a rendered one because jsdom applies no stylesheet: the number this
 * guards is measured in a browser (ADR-0058), and what this pins is that the
 * rule stays written down.
 */
describe("Notice's own spacing", () => {
  it("carries no margin of its own", () => {
    const rule = css.slice(css.indexOf(".notice"), css.indexOf(".info"));

    expect(rule).toMatch(/margin:\s*0\s*;/);
  });
});
