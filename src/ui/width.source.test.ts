// @vitest-environment node
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { devices } from "@playwright/test";
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

/** The ceiling as tokens.css says it, in px. */
const measure = () => {
  const declared = /--measure:\s*(\d+)px;/.exec(tokens);

  if (!declared) throw new Error("tokens.css declares no --measure in px");

  return Number(declared[1]);
};

/**
 * Every width a phone held upright can hand the app, widest last.
 *
 * Landscape entries are dropped because this app is portrait and a phone on
 * its side is a different question. What is left is still not only phones --
 * Playwright marks tablets `isMobile` too -- which is the point of the band
 * the test below reads off it.
 */
const upright = [
  ...new Set(
    Object.entries(devices)
      .filter(([name, device]) => device.isMobile && !name.includes("landscape"))
      .map(([, device]) => device.viewport.width),
  ),
].sort((a, b) => a - b);

describe("how wide the app is", () => {
  it("stands in the band between the widest phone-shaped screen and the narrowest tablet", () => {
    // #75: the ceiling used to be 390px, the width of an iPhone 13, so it
    // bound on every phone shipped since. ADR-0041 has the argument; what is
    // pinned here is the property that makes the number safe rather than the
    // number itself, which is a reading measure and no handset's width.
    //
    // Phone-*shaped*, and the distinction is not pedantry: `upright` still
    // holds the Galaxy Z Fold 6 at 928px and the Fold 7 at 984px, both
    // `isMobile`, both wider than every iPad in the list. Unfolded they are a
    // phone by hardware and a tablet by screen -- and a ceiling answers
    // screens, so a centred column is right for them and they belong on the
    // far side of this band with the tablets rather than breaking it.
    //
    // Both edges are guarded, because a ceiling can be wrong in two
    // directions: too low and it caps a phone, which is #75; too high and it
    // stretches a tablet, which is #36 coming back. And the band itself is
    // guarded first -- a screen shipped into it means the gap this stands in
    // has closed and the measure has to be decided again with that device on
    // the table, rather than a test quietly passing the way the 390px suite
    // did for four device generations.
    const widestPhoneShaped = 484;
    const narrowestTablet = 600;

    expect(
      upright.filter((w) => w > widestPhoneShaped && w < narrowestTablet),
      "a screen now ships into the band the ceiling stands in",
    ).toEqual([]);

    expect(measure(), "the ceiling caps a phone").toBeGreaterThanOrEqual(
      widestPhoneShaped,
    );
    expect(measure(), "the ceiling stretches a tablet").toBeLessThan(
      narrowestTablet,
    );
  });

  it("still finds the canvas drawing every artboard at one width", () => {
    // Not the ceiling's source any more: ADR-0041 severed that, and this
    // asserts nothing about --measure. It is kept because the drift it catches
    // is real and independent of the width question -- `tab-bar.source.test.ts`
    // and ADR-0027 read numbers out of one artboard, and every such reading
    // assumes the ten are still one frame rather than several.
    const drawn = [...new Set(canvas.artboards.map(({ w }) => w))];

    expect(
      drawn,
      "the canvas no longer draws every artboard at one width",
    ).toHaveLength(1);
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
    // a capped one.
    expect(declaring(/var\(--measure\)/)).toEqual([
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

    expect(rule).toMatch(/max-width:\s*var\(--measure\)\s*;/);
    expect(rule).toMatch(/margin-inline:\s*auto\s*;/);
  });

  it("lets no screen invent a ceiling of its own", () => {
    // `max-width` anywhere else is a second answer to a question that now has
    // one. (`max-height` is a different question and is left alone.)
    const inventing = modules
      .filter(({ css }) => /max-width/.test(css))
      .filter(({ css }) => !css.includes("var(--measure)"))
      .map(({ name }) => name);

    expect(inventing).toEqual([]);
  });

  it("finds the stylesheets it claims to check", () => {
    // Without this, the test above passes green over an empty list the day the
    // glob stops matching.
    expect(modules.length).toBeGreaterThan(20);
  });
});
