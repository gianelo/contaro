// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const srcDir = path.resolve(import.meta.dirname, "..");
const uiDir = path.join(srcDir, "ui");

const read = (file: string) => readFileSync(file, "utf8");

const stylesheets = readdirSync(srcDir, { recursive: true })
  .map(String)
  .filter((entry) => entry.endsWith(".css"))
  .map((entry) => path.join(srcDir, entry));

/**
 * The component tests can only prove a component wears the .hitTarget class;
 * they cannot prove the class is worth wearing. These read the two files that
 * actually decide the touch size, so deleting either rule fails the suite.
 * Real geometry is then measured in a browser by e2e/hit-targets.spec.ts.
 */
describe("the 44px touch target", () => {
  it("is 44px in the tokens", () => {
    expect(read(path.join(uiDir, "tokens.css"))).toMatch(
      /--hit-target:\s*44px\s*;/,
    );
  });

  it("is applied as both a minimum height and a minimum width", () => {
    const css = read(path.join(uiDir, "hit-target.module.css"));
    const rule = css.slice(css.indexOf(".hitTarget"));

    expect(rule).toMatch(/min-height:\s*var\(--hit-target\)\s*;/);
    expect(rule).toMatch(/min-width:\s*var\(--hit-target\)\s*;/);
  });

  it("is applied in exactly one stylesheet, so it has one place to be wrong", () => {
    const users = stylesheets.filter(
      (file) =>
        read(file).includes("var(--hit-target)") &&
        path.basename(file) !== "tokens.css",
    );

    expect(users.map((file) => path.relative(srcDir, file))).toEqual([
      path.join("ui", "hit-target.module.css"),
    ]);
  });

  it("finds the stylesheets it claims to check", () => {
    expect(stylesheets.length).toBeGreaterThan(5);
  });
});
