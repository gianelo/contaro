// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const srcDir = path.resolve(import.meta.dirname, "..");

const read = (file: string) => readFileSync(file, "utf8");

const stylesheets = readdirSync(srcDir, { recursive: true })
  .map(String)
  .filter((entry) => entry.endsWith(".css"))
  .map((entry) => entry.split(path.sep).join("/"))
  .sort();

const cssOf = (name: string) => read(path.join(srcDir, name));

/**
 * Where a link's decoration is decided. Read as text for the reason
 * tokens.source.test.ts gives: the question is not what a rule computes to --
 * e2e/link-decoration.spec.ts measures that in a browser -- but *where it is
 * written*, which is the whole of #58.
 */
describe("what a link is decorated with", () => {
  it("is decided in globals.css, on the element itself", () => {
    const css = cssOf("app/globals.css");
    const rule = css.slice(css.indexOf("\na {"));

    expect(rule).toMatch(/text-decoration:\s*none\s*;/);
  });

  it("is not said again by any stylesheet that already inherits it", () => {
    // The bug itself: five declarations of `none` across four modules, and
    // every screen that did not think to write one underlined. A rule kept in
    // six places is already broken in the seventh.
    //
    // Every `text-decoration: none` under `src/` and not only the ones that
    // land on an anchor: which selector a declaration sits under is a question
    // for a parser, and this file reads text. It costs nothing today, because
    // the app draws no other element that arrives decorated -- no `<del>`,
    // `<ins>`, `<u>`, `<s>` or `<abbr>` exists in it. The day one does, it
    // joins this list deliberately, the way `width.source.test.ts` pins the
    // two stylesheets allowed to say `max-width` and for the same reason: an
    // exception somebody had to write down is an exception somebody read.
    const repeating = stylesheets.filter(
      (name) =>
        name !== "app/globals.css" &&
        /text-decoration:\s*none/.test(cssOf(name)),
    );

    expect(repeating).toEqual([]);
  });

  it("finds the stylesheets it claims to check", () => {
    expect(stylesheets.length).toBeGreaterThan(20);
    expect(stylesheets).toContain("app/globals.css");
  });
});
