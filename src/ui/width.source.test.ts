// @vitest-environment node
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.join(import.meta.dirname, "..", "..");

const read = (file: string) => readFileSync(path.join(root, file), "utf8");

const tokens = read("src/ui/tokens.css");
const canvas: { artboards: { file: string; w: number }[] } = JSON.parse(
  read("design/canvas.json"),
);

/**
 * Every CSS Module in the app, by its path under `src/`. Read as text for the
 * same reason tokens.css is (see tokens.source.test.ts): jsdom resolves no
 * custom properties, and the question here is not what a rule computes to but
 * *where it is written* -- which is exactly what #36 asks about.
 */
const modules = readdirSync(path.join(root, "src"), { recursive: true })
  .map(String)
  .filter((file) => file.endsWith(".module.css"))
  .map((file) => file.split(path.sep).join("/"))
  .sort()
  .map((name) => ({ name, css: read(`src/${name}`) }));

const declaring = (property: RegExp) =>
  modules.filter(({ css }) => property.test(css)).map(({ name }) => name);

describe("how wide the app is", () => {
  it("takes the column from the width the canvas draws every screen at", () => {
    // Not a number somebody typed into a stylesheet: the canvas is the source,
    // and it draws all ten artboards at one width. If a redesign ever moves
    // that width, this fails rather than leaving the app at the old one.
    const drawn = [...new Set(canvas.artboards.map(({ w }) => w))];

    expect(
      drawn,
      "the canvas no longer draws every artboard at one width",
    ).toHaveLength(1);
    expect(
      tokens,
      `the canvas draws at ${drawn[0]}px and --column does not`,
    ).toContain(`--column: ${drawn[0]}px;`);
  });

  it("takes the gutter from the spacing scale rather than a loose 16px", () => {
    // The canvas puts 16px down both sides of every list, and 16px already has
    // a name here. A second one would be the same value with two places to
    // change it.
    expect(tokens).toMatch(/--gutter:\s*var\(--space-8\);/);
  });

  it("says the gutter where the shell reaches, and where it cannot", () => {
    // The whole bug: twelve screens each answering "how wide is this?" for
    // themselves. The shell owns the answer for everything it wraps, and
    // sign-in -- the one product screen rendered outside it -- reads the same
    // token rather than a literal of its own.
    expect(declaring(/var\(--gutter\)/)).toEqual([
      "app/ingresar/page.module.css",
      "ui/app-shell.module.css",
    ]);
  });

  it("says the ceiling in one place, and once more for what escapes it", () => {
    // A bottom sheet is `position: fixed`, so the shell's ceiling never
    // reaches it. Left alone it would be a monitor-wide sheet sliding up under
    // a phone-wide column.
    expect(declaring(/var\(--column\)/)).toEqual([
      "ui/app-shell.module.css",
      "ui/bottom-sheet.module.css",
    ]);
  });

  it("centres the sheet as well as capping it", () => {
    // A ceiling without `margin-inline: auto` is a sheet pinned to the left of
    // the monitor, which is worse than a wide one. The shell's own pair is
    // measured in a browser by e2e/width.spec.ts; the sheet's is not, because
    // opening one costs a whole budget flow, so it is read here instead.
    const sheet = read("src/ui/bottom-sheet.module.css");
    const rule = sheet.slice(sheet.indexOf(".sheet"));

    expect(rule).toMatch(/max-width:\s*var\(--column\)\s*;/);
    expect(rule).toMatch(/margin-inline:\s*auto\s*;/);
  });

  it("lets no screen invent a ceiling of its own", () => {
    // `max-width` anywhere else is a second answer to a question that now has
    // one. (`max-height` is a different question and is left alone.)
    const inventing = modules
      .filter(({ css }) => /max-width/.test(css))
      .filter(({ css }) => !css.includes("var(--column)"))
      .map(({ name }) => name);

    expect(inventing).toEqual([]);
  });

  it("finds the stylesheets it claims to check", () => {
    // Without this, the test above passes green over an empty list the day the
    // glob stops matching.
    expect(modules.length).toBeGreaterThan(20);
  });
});
