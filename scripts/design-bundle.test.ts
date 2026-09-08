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

const design = path.join(import.meta.dirname, "..", "design");

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
  it("holds the eighteen artboards its manifest lists, and the manifest", () => {
    const files = Object.keys(sourcesIn(design));
    expect(files).toHaveLength(19);
    expect(files.at(-1)).toBe("canvas.json");
  });
});

describe("the exported bundle in this repo", () => {
  const bundle = readFileSync(path.join(design, "contaro-app.html"), "utf8");

  it("round-trips byte for byte, which is what makes rewriting it safe", () => {
    expect(bundleWith(bundle, documentIn(bundle))).toBe(bundle);
  });
});
