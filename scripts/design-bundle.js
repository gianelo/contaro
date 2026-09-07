/**
 * The exported canvas bundle is two things in one file: a canvas editor shell
 * that has no source in this repo, and one line of JSON that is nothing but
 * the files in `design/` serialized. This builds and reads that second half.
 *
 * @typedef {{ title: string, content: { files: Record<string, string> }, comments: unknown[] }} CanvasDocument
 */

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

/** The tag the editor writes its content payload into, and its closing tag. */
const OPENS = '<script type="application/json" id="appifact-doc">';
const CLOSES = "</script>";

/** The manifest, which is a source in its own right and rides along last. */
export const MANIFEST = "canvas.json";

/**
 * The files a design folder holds, in the order the bundle carries them: the
 * artboards as `canvas.json` lists them, and `canvas.json` itself last.
 *
 * @param {string} designDir
 * @returns {Record<string, string>}
 */
export function sourcesIn(designDir) {
  /** @type {Record<string, string>} */
  const artboards = {};
  for (const file of readdirSync(designDir).sort()) {
    if (!file.endsWith(".dc.html")) continue;
    artboards[file] = readFileSync(path.join(designDir, file), "utf8");
  }
  return orderedSources(readFileSync(path.join(designDir, MANIFEST), "utf8"), artboards);
}

/**
 * The same thing, decided rather than read: the manifest's text and the
 * artboards found beside it, put in order.
 *
 * The manifest and the folder are two lists of the same set, and a file in one
 * and not the other is a source-side mistake that the bundle would otherwise
 * inherit silently — an artboard nobody can see on the canvas, or a canvas
 * entry pointing at nothing. Both are named and neither is dropped.
 *
 * The manifest itself is read as suspiciously as the bundle is, and for the
 * same reason: it decides which artboards exist and in what order, so a
 * manifest that does not parse, carries no artboards, or lists an entry with
 * no filename stops this with the filename in the message. Reading a broken
 * one leniently would build an export from a shorter list than the folder
 * holds, which is the drift this exists to catch, arrived at from inside.
 *
 * @param {string} manifest the text of `canvas.json`
 * @param {Record<string, string>} onDisk every `.dc.html` beside it
 * @returns {Record<string, string>}
 */
export function orderedSources(manifest, onDisk) {
  /** @type {unknown} */
  let listed;
  try {
    listed = JSON.parse(manifest);
  } catch (error) {
    throw new Error(`${MANIFEST} does not parse as JSON: ${error}`);
  }

  const artboards = /** @type {{ artboards?: unknown }} */ (listed)?.artboards;
  if (!Array.isArray(artboards)) {
    throw new Error(`${MANIFEST} has no artboards, so there is no order to put the bundle in.`);
  }

  const order = artboards.map((entry, at) => {
    const file = /** @type {{ file?: unknown }} */ (entry)?.file;
    if (typeof file !== "string" || file === "") {
      throw new Error(`${MANIFEST} artboard ${at + 1} names no file.`);
    }
    return file;
  });

  const missing = order.filter((file) => !(file in onDisk));
  if (missing.length > 0) {
    throw new Error(
      missing.length === 1
        ? `${MANIFEST} lists ${missing[0]}, and the design folder does not have it.`
        : `${MANIFEST} lists ${missing.join(", ")}, and the design folder has none of them.`,
    );
  }

  const unlisted = Object.keys(onDisk).filter((file) => !order.includes(file));
  if (unlisted.length > 0) {
    throw new Error(
      unlisted.length === 1
        ? `The design folder holds ${unlisted[0]}, and ${MANIFEST} does not list it — ` +
            `add an entry or delete the file.`
        : `The design folder holds ${unlisted.join(", ")}, and ${MANIFEST} lists none of them — ` +
            `add entries or delete the files.`,
    );
  }

  /** @type {Record<string, string>} */
  const files = {};
  for (const file of order) files[file] = onDisk[file] ?? "";
  files[MANIFEST] = manifest;
  return files;
}

/**
 * The document the sources say the bundle should carry.
 *
 * The content half is replaced outright — it is the sources and nothing else.
 * `title` and `comments` are carried over from the bundle instead, because
 * they are editor state that has no file in `design/` to be rebuilt from, and
 * inventing them here would be this script having an opinion about a thing it
 * cannot see.
 *
 * @param {CanvasDocument} doc the document the bundle carries today
 * @param {Record<string, string>} sources
 * @returns {CanvasDocument}
 */
export function rebuilt(doc, sources) {
  return { ...doc, content: { ...doc.content, files: sources } };
}

/**
 * What the sources and the bundle disagree about, said the way a person would
 * have to say it to go and fix one of them.
 *
 * Three kinds, because they are three different mistakes: a source the export
 * never saw, an artboard the export kept after the folder dropped it, and one
 * whose drawing has moved on since. "They differ" would be true of all three
 * and useful for none — the drift this catches was two changes and a deleted
 * artboard deep, and naming which is which is the whole report.
 *
 * Order is not a disagreement. The manifest decides it, the manifest is one of
 * the files being compared, and a reordered canvas already shows up as
 * `canvas.json` having moved on.
 *
 * @param {Record<string, string>} sources the files in `design/`
 * @param {Record<string, string>} embedded the files the bundle carries
 * @returns {string[]} one entry per disagreement, empty when the two agree
 */
export function disagreements(sources, embedded) {
  /** @type {string[]} */
  const found = [];

  for (const [file, text] of Object.entries(sources)) {
    if (!(file in embedded)) {
      found.push(`${file}: the bundle does not have it`);
    } else if (embedded[file] !== text) {
      found.push(`${file}: the bundle draws it the way it was, not the way it is`);
    }
  }

  for (const file of Object.keys(embedded)) {
    if (!(file in sources)) {
      found.push(`${file}: the design folder no longer has it`);
    }
  }

  return found;
}

/**
 * The one line a document serializes to.
 *
 * `<` is escaped, and that is correctness rather than formatting: the payload
 * sits inside a `<script>` block and the artboards it carries are HTML, so an
 * unescaped `</script>` in any of them would end the block early and leave the
 * rest of the file as text on the page. It is also the only escape the editor
 * applies, which is why the round-trip over the real bundle holds.
 *
 * @param {CanvasDocument} doc
 * @returns {string}
 */
export function payloadFor(doc) {
  return JSON.stringify(doc).replaceAll("<", "\\u003c");
}

/**
 * Where the payload line sits in a bundle, by line index.
 *
 * Throws rather than answering nothing. A check that quietly finds no payload
 * is a check that passes on a file it never read, which is how this drifted in
 * the first place.
 *
 * @param {string[]} lines the bundle, split on newlines
 * @returns {number} the index of the payload line
 */
function payloadAt(lines) {
  const opens = lines.indexOf(OPENS);
  if (opens === -1) {
    throw new Error(`No ${OPENS} block in this bundle — it is not a canvas export.`);
  }
  if (lines[opens + 2] !== CLOSES) {
    throw new Error(
      `The appifact-doc block is not one line of JSON between its tags; ` +
        `line ${opens + 3} reads ${JSON.stringify(lines[opens + 2])}.`,
    );
  }
  return opens + 1;
}

/**
 * The document a bundle embeds.
 *
 * The payload is parsed as it stands, because \u003c is an escape JSON already
 * understands and undoing it textually first would be the one way to get this
 * wrong: an artboard whose script spells those six characters out is written
 * as an escaped backslash, and a blind replace over the line turns that into
 * \<, which JSON has no escape for.
 *
 * @param {string} bundle the whole exported file
 * @returns {CanvasDocument}
 */
export function documentIn(bundle) {
  const lines = bundle.split("\n");
  const payload = lines[payloadAt(lines)] ?? "";

  /** @type {unknown} */
  let doc;
  try {
    doc = JSON.parse(payload);
  } catch (error) {
    throw new Error(`The appifact-doc payload does not parse as JSON: ${error}`);
  }

  if (!isDocument(doc)) {
    throw new Error("The appifact-doc payload has no content.files to read.");
  }
  return doc;
}

/**
 * @param {unknown} doc
 * @returns {doc is CanvasDocument}
 */
function isDocument(doc) {
  if (typeof doc !== "object" || doc === null) return false;
  const content = /** @type {{ content?: unknown }} */ (doc).content;
  if (typeof content !== "object" || content === null) return false;
  const files = /** @type {{ files?: unknown }} */ (content).files;
  return typeof files === "object" && files !== null && !Array.isArray(files);
}

/**
 * The same bundle carrying a different document: one line replaced, every
 * other byte of the 2.6MB shell left exactly where the editor put it.
 *
 * @param {string} bundle
 * @param {CanvasDocument} doc
 * @returns {string}
 */
export function bundleWith(bundle, doc) {
  const lines = bundle.split("\n");
  lines[payloadAt(lines)] = payloadFor(doc);
  return lines.join("\n");
}
