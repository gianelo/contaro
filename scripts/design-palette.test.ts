// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  classifyColoursIn,
  hardcodedColoursIn,
  helmetPaletteIn,
  paletteBlockFor,
  paletteFrom,
  schemeFor,
  withPalette,
} from "./design-palette.js";

const tokensCss = readFileSync(
  path.join(import.meta.dirname, "..", "src", "ui", "tokens.css"),
  "utf8",
);

describe("paletteFrom", () => {
  it("reads a --color- declaration out of :root, verbatim", () => {
    const declarations = paletteFrom(tokensCss);
    expect(declarations).toContain("--color-background: light-dark(#f2f2f7, #000000);");
  });

  it("reads a declaration whose value is rgb(), not just light-dark() of a hex", () => {
    // --color-scrim (#37, the bottom-sheet scrim) is the one token this repo
    // writes as rgb() rather than a hex pair — the palette must carry it
    // exactly as tokens.css spells it, not just the hex-shaped ones.
    const declarations = paletteFrom(tokensCss);
    expect(declarations).toContain(
      "--color-scrim: light-dark(rgb(0 0 0 / 55%), rgb(0 0 0 / 65%));",
    );
  });

  it("keeps source order", () => {
    const declarations = paletteFrom(tokensCss);
    const at = (name: string) => declarations.findIndex((d) => d.startsWith(`--${name}:`));
    expect(at("color-background")).toBeGreaterThanOrEqual(0);
    expect(at("color-background")).toBeLessThan(at("color-fill"));
    expect(at("color-fill")).toBeLessThan(at("color-accent"));
  });

  it("carries colour and shadow custom properties, never type, spacing or radius ones", () => {
    // Shadows joined colours here for #138: `RGB_RE` treats `rgb()`/`rgba()`
    // as a colour wherever it appears, including inside a shadow value, and a
    // `--canvas-*` declaration is reserved for staging a colour a static
    // artboard cannot composite — which a shadow never is. Excluding shadows
    // would leave a value like Main.dc.html's selected-segment shadow with no
    // bucket to land in outside "hardcoded".
    const declarations = paletteFrom(tokensCss);
    expect(declarations.length).toBeGreaterThan(0);
    expect(declarations.every((d) => d.startsWith("--color-") || d.startsWith("--shadow-"))).toBe(
      true,
    );
    expect(declarations.some((d) => d.startsWith("--shadow-"))).toBe(true);
    expect(declarations.some((d) => d.startsWith("--text-"))).toBe(false);
    expect(declarations.some((d) => d.startsWith("--space-"))).toBe(false);
  });

  it("throws rather than silently finding no palette in a file with no :root block", () => {
    expect(() => paletteFrom("body { color: red; }")).toThrow(/:root/);
  });

  it("throws rather than silently finding no --color- declarations inside :root", () => {
    expect(() => paletteFrom(":root {\n  --text-sm: 13px;\n}\n")).toThrow(/--color-/);
  });
});

describe("schemeFor", () => {
  it("is dark for the one dark artboard the canvas draws", () => {
    expect(schemeFor("CargarGastoOscuro.dc.html")).toBe("dark");
  });

  it("is light for every other artboard", () => {
    expect(schemeFor("Main.dc.html")).toBe("light");
    expect(schemeFor("SheetCerrar.dc.html")).toBe("light");
    expect(schemeFor("Presupuesto.dc.html")).toBe("light");
  });
});

describe("paletteBlockFor", () => {
  it("opens with a comment naming tokens.css as its source", () => {
    const block = paletteBlockFor(tokensCss, "light");
    expect(block.split("\n")[0]).toMatch(/^\/\*.*tokens\.css.*\*\/$/);
  });

  it("declares color-scheme ahead of the palette it picks a half from", () => {
    const block = paletteBlockFor(tokensCss, "dark");
    expect(block).toContain("color-scheme: dark;");
    expect(block.indexOf("color-scheme: dark;")).toBeLessThan(
      block.indexOf("--color-background"),
    );
  });

  it("carries every declaration paletteFrom reads, unmodified", () => {
    const declarations = paletteFrom(tokensCss);
    const block = paletteBlockFor(tokensCss, "light");
    for (const declaration of declarations) expect(block).toContain(declaration);
  });

  it("wraps the palette in one :root rule", () => {
    const block = paletteBlockFor(tokensCss, "light");
    expect(block).toMatch(/:root\s*\{[\s\S]*--color-background[\s\S]*\n\}/);
  });

  it("takes the dark half of a shadow from the palette that actually declares it", () => {
    // `tokens.css` says it out loud: "Shadows are not colours, so light-dark()
    // cannot hold them." Their dark values live in `[data-theme="dark"]` and in
    // a `prefers-color-scheme` query, neither of which the `:root` copy reaches
    // -- and `color-scheme: dark` does not trigger a media query, it only tells
    // `light-dark()` which half to resolve. So a block that copied `:root`
    // alone would hand the dark artboard the LIGHT shadow under a dark
    // `color-scheme`: a raised segment drawn with a shadow the running app
    // draws none of, certified correct by the very check meant to catch it
    // (#138).
    const dark = paletteBlockFor(tokensCss, "dark");
    const light = paletteBlockFor(tokensCss, "light");

    expect(dark).toContain("--shadow-raised: none;");
    expect(light).toContain("--shadow-raised: 0 1px 3px rgb(0 0 0 / 12%);");
    expect(dark).toContain("--shadow-sheet: 0 -8px 30px rgb(0 0 0 / 60%);");
  });

  it("leaves a colour alone in both halves, because light-dark() already holds it", () => {
    // The mirror of the test above, and the reason the override is applied by
    // name rather than to everything the dark rule happens to mention: a
    // colour's two halves are already inside one `light-dark()` value, so
    // rewriting one here would be this script resolving a palette the browser
    // is supposed to resolve.
    expect(paletteBlockFor(tokensCss, "dark")).toContain(
      "--color-background: light-dark(#f2f2f7, #000000);",
    );
  });

  it("closes with a matching end marker, so the block has a findable end", () => {
    const block = paletteBlockFor(tokensCss, "light");
    expect(block.trimEnd().split("\n").at(-1)).toMatch(/^\/\*.*\*\/$/);
  });
});

describe("helmetPaletteIn", () => {
  const bareHelmet = ["<helmet>", "  <style>", "    body { margin: 0; }", "  </style>", "</helmet>"].join(
    "\n",
  );

  it("finds nothing on an artboard that was never given a palette block", () => {
    expect(helmetPaletteIn(bareHelmet)).toBeNull();
  });

  it("finds exactly the block withPalette put there", () => {
    const block = paletteBlockFor(tokensCss, "light");
    expect(helmetPaletteIn(withPalette(bareHelmet, block))).toBe(block);
  });
});

describe("withPalette", () => {
  const artboard = [
    "<helmet>",
    "  <style>",
    "    body { margin: 0; -webkit-font-smoothing: antialiased; }",
    "    a { color: #0E7C66; }",
    "  </style>",
    "</helmet>",
  ].join("\n");
  const block = paletteBlockFor(tokensCss, "light");

  it("inserts the block into the helmet's style, ahead of the artboard's own rules", () => {
    const next = withPalette(artboard, block);
    expect(next.indexOf(block)).toBeGreaterThan(-1);
    expect(next.indexOf(block)).toBeLessThan(next.indexOf("body { margin: 0;"));
    // Nothing the artboard already drew is touched by this call — that hex
    // is design-bundle.js's problem (hardcodedColoursIn's), not withPalette's.
    expect(next).toContain("a { color: #0E7C66; }");
  });

  it("is idempotent: applying the same block twice changes nothing the second time", () => {
    const once = withPalette(artboard, block);
    const twice = withPalette(once, block);
    expect(twice).toBe(once);
  });

  it("replaces a stale block rather than piling a second one on top of it", () => {
    // The scheme flips (or tokens.css changes) between two runs of
    // `pnpm build:design` — the old block must go, not just get a neighbour.
    const stale = paletteBlockFor(tokensCss, "dark");
    const withStale = withPalette(artboard, stale);
    const refreshed = withPalette(withStale, block);

    expect(refreshed).toBe(withPalette(artboard, block));
    expect(refreshed.match(/BEGIN generated palette/g)).toHaveLength(1);
  });

  it("refuses an artboard with no <helmet><style> to carry the palette", () => {
    expect(() => withPalette("<div>no helmet here</div>", block)).toThrow(/helmet/);
  });
});

describe("hardcodedColoursIn", () => {
  it("finds a bare hex with the line it sits on", () => {
    const artboard = ["<div>", "line two", '<span style="color: #0E7C66;"></span>', "</div>"].join(
      "\n",
    );
    expect(hardcodedColoursIn(artboard)).toEqual([{ line: 3, colour: "#0E7C66" }]);
  });

  it("finds every hex on a line, in the order they appear", () => {
    const artboard = '<span style="color: #0E7C66; border-color: #D8D8DC;"></span>';
    expect(hardcodedColoursIn(artboard)).toEqual([
      { line: 1, colour: "#0E7C66" },
      { line: 1, colour: "#D8D8DC" },
    ]);
  });

  it("does not mistake a 3-digit issue reference for a colour", () => {
    // #105 and #123 read as colours to a careless regex; they are prose. Only
    // a 6-digit hex is a colour here — see the comment on HEX_RE below.
    const artboard = "<p>Fixed in #105 and #123, see #37 and #62 too.</p>";
    expect(hardcodedColoursIn(artboard)).toEqual([]);
  });

  it("finds an rgb()/rgba() colour function, not only hex ones", () => {
    const artboard = '<span style="box-shadow: 0 1px 3px rgba(0,0,0,0.12);"></span>';
    expect(hardcodedColoursIn(artboard)).toEqual([{ line: 1, colour: "rgba(0,0,0,0.12)" }]);
  });

  it("excludes every hex inside the generated palette block", () => {
    const block = paletteBlockFor(tokensCss, "light");
    const artboard = [
      "<helmet>",
      "<style>",
      block,
      "</style>",
      "</helmet>",
      '<div style="color: #123456;"></div>',
    ].join("\n");

    expect(hardcodedColoursIn(artboard)).toEqual([
      { line: artboard.split("\n").length, colour: "#123456" },
    ]);
  });

  it("excludes a hex inside a --canvas- custom property declaration", () => {
    const artboard = [
      // The scrim over a bottom sheet cannot be composited on a static
      // artboard, so it is flattened and named apart from a product colour.
      '<div style="--canvas-scrim-flat: #6E6E73;"></div>',
      '<div style="color: #6E6E73;"></div>',
    ].join("\n");

    expect(hardcodedColoursIn(artboard)).toEqual([{ line: 2, colour: "#6E6E73" }]);
  });

  it("finds nothing on an artboard with no colour left to find", () => {
    expect(hardcodedColoursIn("<div>Hola</div>")).toEqual([]);
  });
});

describe("classifyColoursIn", () => {
  // check-design-bundle.js's classification report (#138, acceptance
  // criterion 1: "the count is reported, including the ones that were
  // already correct") is built on this: every colour occurrence an artboard
  // carries, sorted into the three buckets a person needs to see rather than
  // one flat "hardcoded" list — hardcodedColoursIn is exactly this
  // function's `hardcoded` bucket, so the two can never quietly disagree.
  it("sorts a generated hex, a canvas hex and a hardcoded hex into three buckets", () => {
    const block = paletteBlockFor(tokensCss, "light");
    const artboard = [
      "<helmet>",
      "<style>",
      block,
      "</style>",
      "</helmet>",
      '<div style="--canvas-scrim-flat: #6E6E73;"></div>',
      '<div style="color: #0E7C66;"></div>',
    ].join("\n");

    const classified = classifyColoursIn(artboard);
    const artboardLines = artboard.split("\n");
    const lineOf = (needle: string) => artboardLines.findIndex((l) => l.includes(needle)) + 1;

    const coloursInBlock =
      [...block.matchAll(/#[0-9A-Fa-f]{6}/g)].length +
      [...block.matchAll(/rgba?\([^)]*\)/g)].length;
    expect(classified.generated.length).toBe(coloursInBlock);
    expect(classified.canvas).toEqual([{ line: lineOf("--canvas-scrim-flat"), colour: "#6E6E73" }]);
    expect(classified.hardcoded).toEqual([{ line: lineOf("color: #0E7C66"), colour: "#0E7C66" }]);
  });

  it("agrees with hardcodedColoursIn on the hardcoded bucket, by construction", () => {
    const artboard = '<div style="color: #0E7C66; border-color: #D8D8DC;"></div>';
    expect(classifyColoursIn(artboard).hardcoded).toEqual(hardcodedColoursIn(artboard));
  });

  it("finds nothing in any bucket on a colourless artboard", () => {
    expect(classifyColoursIn("<div>Hola</div>")).toEqual({
      generated: [],
      canvas: [],
      hardcoded: [],
    });
  });
});
