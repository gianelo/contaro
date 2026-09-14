// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  bundleWith,
  disagreements,
  documentIn,
  orderedSources,
  payloadFor,
  rebuilt,
  sourcesIn,
} from "./design-bundle.js";
import { hardcodedColoursIn, helmetPaletteIn, paletteBlockFor, schemeFor } from "./design-palette.js";

const design = path.join(import.meta.dirname, "..", "design");
const tokensCss = readFileSync(
  path.join(import.meta.dirname, "..", "src", "ui", "tokens.css"),
  "utf8",
);

/** A bundle the size of a fixture: a shell with one payload line inside it. */
function bundleAround(payload: string): string {
  return [
    "<!DOCTYPE html>",
    "<body>",
    '<script type="application/json" id="appifact-doc">',
    payload,
    "</script>",
    '<script src="editor.js"></script>',
    "</body>",
    "",
  ].join("\n");
}

describe("payloadFor", () => {
  it("escapes every < so an artboard's own closing tag cannot end the block", () => {
    const payload = payloadFor({
      title: "t",
      content: { files: { "a.dc.html": "<div></div></script>" } },
      comments: [],
    });
    expect(payload).not.toContain("<");
    expect(payload).toContain("\\u003c/script>");
  });

  it("reads back as the document it was given", () => {
    const doc = {
      title: "contaro",
      content: { files: { "a.dc.html": "<p>hola</p>" } },
      comments: [],
    };
    expect(JSON.parse(payloadFor(doc))).toEqual(doc);
  });
});

describe("documentIn", () => {
  it("finds the document a bundle embeds", () => {
    const doc = {
      title: "contaro",
      content: { files: { "a.dc.html": "<p>hola</p>" } },
      comments: [],
    };
    expect(documentIn(bundleAround(payloadFor(doc)))).toEqual(doc);
  });

  it("refuses a bundle with no payload block rather than treating it as empty", () => {
    expect(() => documentIn("<!DOCTYPE html>\n<body></body>\n")).toThrow(
      /appifact-doc/,
    );
  });

  it("reads an artboard that spells the escape out, rather than unescaping it twice", () => {
    // An artboard carrying inline script can hold the six characters \u003c
    // literally. JSON writes that as an escaped backslash and reads it back on
    // its own; a second, textual unescape over the payload turns it into \<,
    // which is not an escape JSON has, and the whole bundle stops parsing.
    const doc = {
      title: "contaro",
      content: { files: { "a.dc.html": 'const lt = "\\u003c";' } },
      comments: [],
    };
    expect(documentIn(bundleAround(payloadFor(doc)))).toEqual(doc);
  });

  it("refuses a payload block that does not parse", () => {
    expect(() => documentIn(bundleAround("{not json"))).toThrow(/does not parse/);
  });

  it("refuses a payload that is not a document", () => {
    expect(() => documentIn(bundleAround("[]"))).toThrow(/content\.files/);
  });
});

describe("bundleWith", () => {
  it("leaves every byte outside the payload line alone", () => {
    const before = bundleAround(payloadFor({ title: "t", content: { files: {} }, comments: [] }));
    const after = bundleWith(before, {
      title: "t",
      content: { files: { "a.dc.html": "<p>hola</p>" } },
      comments: [],
    });

    const [beforeLines, afterLines] = [before.split("\n"), after.split("\n")];
    expect(afterLines.length).toBe(beforeLines.length);
    expect(afterLines.filter((line, i) => line !== beforeLines[i])).toHaveLength(1);
    expect(documentIn(after).content.files["a.dc.html"]).toBe("<p>hola</p>");
  });
});

describe("orderedSources", () => {
  const manifest = JSON.stringify({
    artboards: [{ file: "b.dc.html" }, { file: "a.dc.html" }],
  });

  it("orders the artboards the way the manifest lists them, manifest last", () => {
    const files = orderedSources(manifest, { "a.dc.html": "<a>", "b.dc.html": "<b>" });
    expect(Object.keys(files)).toEqual(["b.dc.html", "a.dc.html", "canvas.json"]);
    expect(files["canvas.json"]).toBe(manifest);
  });

  it("names an artboard the manifest lists and the folder does not have", () => {
    expect(() => orderedSources(manifest, { "a.dc.html": "<a>" })).toThrow(
      /canvas\.json lists b\.dc\.html/,
    );
  });

  it("names an artboard the folder has and the manifest does not list", () => {
    expect(() =>
      orderedSources(manifest, { "a.dc.html": "<a>", "b.dc.html": "<b>", "c.dc.html": "<c>" }),
    ).toThrow(/c\.dc\.html/);
  });

  it("says the unlisted ones as a sentence when there is more than one of them", () => {
    // The plural and the singular are two sentences, not one with a number
    // spliced into it: a reader who has to parse "lists none of them on no
    // artboard" is being asked to do the check's job for it.
    expect(() => orderedSources('{"artboards":[]}', { "a.dc.html": "<a>", "b.dc.html": "<b>" }))
      .toThrow("The design folder holds a.dc.html, b.dc.html, and canvas.json lists none of them — add entries or delete the files.");
  });

  it("names canvas.json when canvas.json is what does not parse", () => {
    // documentIn already wraps its parse this way. The manifest is the same
    // class of input and a bare SyntaxError does not say which file to open.
    expect(() => orderedSources("{not json", {})).toThrow(/canvas\.json does not parse as JSON/);
  });

  it("refuses a manifest with no artboards to order the bundle by", () => {
    expect(() => orderedSources('{"boards":[]}', {})).toThrow(/no artboards/);
  });

  it("refuses an artboard that names no file, rather than naming an empty one", () => {
    expect(() => orderedSources('{"artboards":[{"x":0}]}', {})).toThrow(/artboard 1 names no file/);
  });
});

describe("rebuilt", () => {
  const doc = {
    title: "contaro",
    content: { files: { "old.dc.html": "<old>" } },
    comments: [{ id: "one" }],
  };

  it("puts the sources in and takes whatever the bundle had out", () => {
    expect(rebuilt(doc, { "a.dc.html": "<a>" }).content.files).toEqual({ "a.dc.html": "<a>" });
  });

  it("keeps the title and the comments, which have no source on disk", () => {
    const next = rebuilt(doc, { "a.dc.html": "<a>" });
    expect(next.title).toBe("contaro");
    expect(next.comments).toEqual([{ id: "one" }]);
  });
});

describe("disagreements", () => {
  const sources = { "a.dc.html": "<a>", "canvas.json": "{}" };

  it("says nothing when the bundle carries what the folder holds", () => {
    expect(disagreements(sources, { ...sources })).toEqual([]);
  });

  it("names a source the bundle has never heard of", () => {
    expect(disagreements(sources, { "canvas.json": "{}" })).toEqual([
      "a.dc.html: the bundle does not have it",
    ]);
  });

  it("names an artboard the bundle kept after the folder dropped it", () => {
    expect(
      disagreements(sources, { ...sources, "Presupuesto63Plegado.dc.html": "<p>" }),
    ).toEqual(["Presupuesto63Plegado.dc.html: the design folder no longer has it"]);
  });

  it("names an artboard whose drawing has moved on", () => {
    expect(disagreements(sources, { ...sources, "a.dc.html": "<a>old" })).toEqual([
      "a.dc.html: the bundle draws it the way it was, not the way it is",
    ]);
  });

  it("ignores the order the two happen to be written in", () => {
    expect(
      disagreements(
        { "a.dc.html": "<a>", "b.dc.html": "<b>" },
        { "b.dc.html": "<b>", "a.dc.html": "<a>" },
      ),
    ).toEqual([]);
  });
});

describe("the design folder in this repo", () => {
  it("holds the nineteen artboards its manifest lists, and the manifest", () => {
    const files = Object.keys(sourcesIn(design));
    expect(files).toHaveLength(20);
    expect(files.at(-1)).toBe("canvas.json");
  });
});

describe("the header (#65), drawn on the screens that carry it and nowhere else", () => {
  /**
   * The header row is marked `data-role="app-header"` and its hamburger is
   * marked `aria-label="Abrir menú del Espacio"` — what each element *is*,
   * not the geometry it happens to be drawn with today. A redraw (rounded
   * caps turning square, the path getting simplified, an added
   * `aria-hidden`) does not touch either marker, so it cannot silently break
   * header-presence coverage for a reason that has nothing to do with
   * whether the header, or the hamburger, is still there.
   *
   * The two are no longer the same property: `Espacios.dc.html` carries the
   * hamburger — it opens the same `SheetMenuEspacio.dc.html` every shell
   * screen opens — without the identity-plus-bell row around it, so it is
   * named in `withSpaceMenuTrigger` but not in `withHeader`.
   */
  const headerRow = 'data-role="app-header"';
  const spaceMenuTrigger = 'aria-label="Abrir menú del Espacio"';

  const withHeader = [
    "Presupuesto.dc.html",
    "Movimientos.dc.html",
    "Presupuesto63Desplegado.dc.html",
  ];

  const withoutHeader = [
    "Main.dc.html",
    "CargarGastoOscuro.dc.html",
    "CrearEspacio.dc.html",
    "Espacios.dc.html",
    "AgregarUnFormulario.dc.html",
    "MasHoja.dc.html",
    "MasIntacto.dc.html",
    "ArrastreDeficit.dc.html",
    "CorregirElGastoPrevisto.dc.html",
    "CorregirElGastoFijo.dc.html",
    "CorregirElGastoFijoPagado.dc.html",
    "SheetPagar.dc.html",
    "SheetCopiar.dc.html",
    "SheetArrastre.dc.html",
    "SheetCerrar.dc.html",
    "SheetMenuEspacio.dc.html",
  ];

  // Everything withHeader carries, plus Espacios.dc.html: the one screen
  // that carries the hamburger without the row around it.
  const withSpaceMenuTrigger = [...withHeader, "Espacios.dc.html"];

  const withoutSpaceMenuTrigger = withoutHeader.filter((file) => file !== "Espacios.dc.html");

  it.each(withHeader)("draws the header row on %s", (file) => {
    const source = readFileSync(path.join(design, file), "utf8");
    expect(source).toContain(headerRow);
  });

  it.each(withoutHeader)("draws no header row on %s", (file) => {
    const source = readFileSync(path.join(design, file), "utf8");
    expect(source).not.toContain(headerRow);
  });

  it("accounts for every artboard the manifest lists, for the header row", () => {
    const manifestFiles = Object.keys(sourcesIn(design)).filter((f) => f !== "canvas.json");
    expect([...withHeader, ...withoutHeader].sort()).toEqual([...manifestFiles].sort());
  });

  it.each(withSpaceMenuTrigger)("draws the Space-menu hamburger on %s", (file) => {
    const source = readFileSync(path.join(design, file), "utf8");
    expect(source).toContain(spaceMenuTrigger);
  });

  it.each(withoutSpaceMenuTrigger)("draws no Space-menu hamburger on %s", (file) => {
    const source = readFileSync(path.join(design, file), "utf8");
    expect(source).not.toContain(spaceMenuTrigger);
  });

  it("accounts for every artboard the manifest lists, for the Space-menu hamburger", () => {
    const manifestFiles = Object.keys(sourcesIn(design)).filter((f) => f !== "canvas.json");
    expect([...withSpaceMenuTrigger, ...withoutSpaceMenuTrigger].sort()).toEqual(
      [...manifestFiles].sort(),
    );
  });

  it("opens the Space menu sheet with Ajustes, the multi-month balance and Cerrar sesión", () => {
    const sheet = readFileSync(path.join(design, "SheetMenuEspacio.dc.html"), "utf8");
    expect(sheet).toContain("Ajustes");
    expect(sheet).toContain("Balance de varios meses");
    expect(sheet).toContain("Cerrar sesión");
  });
});

describe("the exported bundle in this repo", () => {
  const bundle = readFileSync(path.join(design, "contaro-app.html"), "utf8");

  it("round-trips byte for byte, which is what makes rewriting it safe", () => {
    expect(bundleWith(bundle, documentIn(bundle))).toBe(bundle);
  });
});

/**
 * An artboard names a token, not a colour (#138, ADR-0057). This is the
 * fidelity check for that rule, in the `*.source.test.ts` idiom this file
 * already established for header/hamburger presence (ADR-0059): read every
 * artboard as text, and pin what `src/ui/tokens.css` says it should draw.
 *
 * This class of drift has been found by hand six times before this was filed
 * against the root (#37, #62, #64, #67, #68, #95). Each was fixed on its own,
 * and each time the artboards drifted again the moment nobody was looking at
 * that particular one — because nothing here read colour, only structure.
 * These tests are why the eighth instance gets caught by CI instead of by a
 * person redrawing a neighbouring screen and copying the stale hex forward
 * (see the brief's own account of how #105 found this bug).
 */
describe("an artboard names a token, not a colour (#138)", () => {
  const artboardFiles = Object.keys(sourcesIn(design)).filter((file) => file !== "canvas.json");

  const readArtboard = (file: string) => readFileSync(path.join(design, file), "utf8");

  it.each(artboardFiles)("%s carries the palette block generated from tokens.css today", (file) => {
    const expected = paletteBlockFor(tokensCss, schemeFor(file));
    expect(helmetPaletteIn(readArtboard(file))).toBe(expected);
  });

  it.each(artboardFiles)("%s hardcodes no colour outside a --canvas-* declaration", (file) => {
    expect(hardcodedColoursIn(readArtboard(file))).toEqual([]);
  });

  describe("the twelve correct #F2F2F7 page grounds (the acceptance criterion #138 names explicitly)", () => {
    // Measured directly off design/ (see the brief and this issue's own
    // measurement): the root <div> of exactly these twelve artboards is drawn
    // at #F2F2F7, and it is drawn there *correctly* — it is the page itself,
    // which --color-background names and which still holds this value in
    // tokens.css. A pass that "fixed" colour by repointing every #F2F2F7 at
    // --color-fill (the token #102 actually moved) would make these twelve
    // wrong while looking, to a diff, like the same kind of edit as the 36
    // keypad keys that are genuinely wrong. This is the test that tells the
    // two apart: it fails the moment a future pass touches one of these.
    //
    // Ten when #138 wrote this list, twelve since #143: Main.dc.html and
    // AgregarUnFormulario.dc.html were the two full screens drawn on
    // --color-surface, which #138 deliberately left alone as a redraw rather
    // than a rename. They are page grounds now, and belong here for the same
    // reason the other ten do (ADR-0064).
    const correctPageGrounds = [
      "AgregarUnFormulario.dc.html",
      "ArrastreDeficit.dc.html",
      "CorregirElGastoFijo.dc.html",
      "CorregirElGastoFijoPagado.dc.html",
      "CorregirElGastoPrevisto.dc.html",
      "CrearEspacio.dc.html",
      "Espacios.dc.html",
      "Main.dc.html",
      "MasIntacto.dc.html",
      "Movimientos.dc.html",
      "Presupuesto.dc.html",
      "Presupuesto63Desplegado.dc.html",
    ];

    it("is still #F2F2F7 in tokens.css's light palette — the value this whole test pins", () => {
      // If this ever fails, the ten tests below are pinning the wrong hex,
      // not confirming the right one: --color-background itself moved, and
      // that is a decision for tokens.css and ADR-0057's family, not for the
      // artboards to react to on their own.
      const declaration = tokensCss.match(/--color-background:\s*light-dark\(\s*([^,]+),/);
      expect(declaration?.[1]?.trim()).toBe("#f2f2f7");
    });

    it.each(correctPageGrounds)(
      "%s's page ground names --color-background, and only --color-background",
      (file) => {
        const source = readArtboard(file);
        const ground = source.match(/width: 390px; height: \d+px; background: ([^;]+);/);
        expect(ground?.[1]).toBe("var(--color-background)");
      },
    );

    it("accounts for every #F2F2F7 page ground the manifest lists, no more and no fewer", () => {
      // Guards the list above itself: an artboard drawn on #F2F2F7 that this
      // list forgot would pass every test in this file by never being asked
      // about, which is exactly the silent-pass failure mode #138 exists to
      // close off.
      //
      // Naming --color-background is not the same claim as resolving to
      // #F2F2F7: the token's dark half is #000000, and CargarGastoOscuro.dc.html
      // draws its page ground with that same token — correctly, per #138's own
      // classification table — without ever being one of the ten pages this
      // hex actually reaches. Counting it here on token-name alone would be
      // exactly the kind of false positive this test exists to rule out, so a
      // `var(--color-background)` match only counts in the light scheme it
      // resolves to this hex in.
      const stillOnF2F2F7 = artboardFiles.filter((file) => {
        const ground = readArtboard(file).match(/width: 390px; height: \d+px; background: ([^;]+);/);
        if (ground?.[1] === "#F2F2F7") return true;
        return ground?.[1] === "var(--color-background)" && schemeFor(file) === "light";
      });
      expect(stillOnF2F2F7.sort()).toEqual([...correctPageGrounds].sort());
    });
  });

  describe("canvas staging: the six sheets flattening --color-scrim over the page", () => {
    // #6E6E73 is not a product colour: it is the six bottom-sheet artboards'
    // flattened approximation of --color-scrim composited over the page,
    // which a static artboard cannot actually composite. It is named apart
    // rather than banned, in a --canvas-* custom property, so it stays
    // countable and self-documenting instead of either an unexplained hex or
    // a rule so blunt it cannot tell staging from drift.
    const sheetsOverScrim = [
      "SheetCerrar.dc.html",
      "SheetPagar.dc.html",
      "SheetMenuEspacio.dc.html",
      "SheetCopiar.dc.html",
      "SheetArrastre.dc.html",
      "MasHoja.dc.html",
    ];

    it.each(sheetsOverScrim)("%s declares two --canvas-* hexes, each with a comment saying why", (file) => {
      // Two, because the illusion has two halves and both are staging: the
      // page's flattened ground, and the ink of the heading showing through
      // it. The second was drawn `var(--color-surface)` at first, which passed
      // every check in this file -- it is a `var()`, and the token resolves to
      // the right white -- while naming a *ground* token for *ink*. That is
      // the rule satisfied and the meaning lost, and no automated colour check
      // can see it, which is why the count is pinned here rather than left to
      // `hardcodedColoursIn`.
      const source = readArtboard(file);
      const declarations = [...source.matchAll(/--canvas-[\w-]+\s*:\s*(#[0-9A-Fa-f]{6})\s*;/g)];

      expect(declarations).toHaveLength(2);

      // Each one earns its place in prose, immediately above itself.
      for (const declaration of declarations) {
        const start = declaration.index ?? 0;
        const nearby = source.slice(Math.max(0, start - 700), start);
        expect(nearby.toLowerCase()).toContain("scrim");
      }
    });

    it.each(sheetsOverScrim)("%s does not name a ground token for the ink showing through", (file) => {
      // The specific regression the hunk above generalises. `--color-surface`
      // is what a sheet is drawn *on*; the heading behind the scrim is not a
      // surface, and the two agreeing on #ffffff in light is a coincidence of
      // value rather than of meaning -- the same argument tokens.css already
      // makes for the Member and Category colours.
      const heading = /font-size: 30px[^"]*color: ([^;]+);/.exec(readArtboard(file));

      expect(heading?.[1]).toBe("var(--canvas-page-ink-behind-scrim)");
    });

    it("is the whole set — no other artboard declares a --canvas-* property", () => {
      const others = artboardFiles.filter((file) => !sheetsOverScrim.includes(file));
      for (const file of others) {
        expect(readArtboard(file)).not.toMatch(/--canvas-/);
      }
    });
  });
});
