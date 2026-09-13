import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { bundleWith, disagreements, documentIn, MANIFEST, rebuilt, sourcesIn } from "./design-bundle.js";
import { classifyColoursIn, helmetPaletteIn, paletteBlockFor, schemeFor, withPalette } from "./design-palette.js";

// ADR-0049: the export's content half is built from `design/`, and the check
// is what makes that true rather than intended. The editor shell around it is
// still only ever produced by re-exporting from the canvas — this rewrites one
// line of the file and never the other 11008.
const design = path.join(import.meta.dirname, "..", "design");
const exported = path.join(design, "contaro-app.html");
const tokensCssPath = path.join(import.meta.dirname, "..", "src", "ui", "tokens.css");

const write = process.argv.includes("--write");

const tokensCss = readFileSync(tokensCssPath, "utf8");

/**
 * An artboard names a token, not a colour (#138, ADR-0057). Every artboard's
 * `<helmet><style>` gets the palette `tokens.css` declares, generated rather
 * than hand-copied, and every colour left outside the generated block or a
 * `--canvas-*` declaration is the drift this whole check exists to catch.
 *
 * Ordering matters and is the reason this happens before a single byte of the
 * bundle is touched: the bundle serializes the artboards' bytes, so normalize
 * the artboards first, and only then rebuild the bundle from what normalizing
 * left behind. Doing it the other way round would bundle a palette that was
 * about to change on the very same run.
 */
if (write) {
  const artboardFiles = Object.keys(sourcesIn(design)).filter((file) => file !== MANIFEST);
  for (const file of artboardFiles) {
    const at = path.join(design, file);
    const before = readFileSync(at, "utf8");
    const block = paletteBlockFor(tokensCss, schemeFor(file));
    const after = withPalette(before, block);
    if (after !== before) writeFileSync(at, after);
  }
}

report(design);

const bundle = readFileSync(exported, "utf8");
const doc = documentIn(bundle);
// Re-read design/ rather than reuse the sources read above: --write may just
// have changed bytes on disk, and the bundle has to be rebuilt from what is
// actually there now, not from what was there before normalizing ran.
const sources = sourcesIn(design);

if (write) {
  writeFileSync(exported, bundleWith(bundle, rebuilt(doc, sources)));
  const where = path.relative(process.cwd(), exported);
  console.log(`Rebuilt ${where} from the ${Object.keys(sources).length} sources in design/.`);
  process.exit(0);
}

const paletteAndColourProblems = colourProblems(sources);

if (paletteAndColourProblems.length > 0) {
  console.error(paletteAndColourProblems.map((line) => `✗ ${line}`).join("\n"));
  console.error(
    "\nAn artboard names a token, not a colour (#138, ADR-0057): its palette is\n" +
      "generated from src/ui/tokens.css and nothing on it hardcodes a colour hex\n" +
      "outside a --canvas-* declaration. Regenerate the palette and re-check —\n" +
      "it is generated, never hand-edited:\n\n" +
      "    pnpm build:design\n",
  );
  process.exit(1);
}

const drifted = disagreements(sources, doc.content.files);

if (drifted.length > 0) {
  console.error(drifted.map((line) => `✗ ${line}`).join("\n"));
  console.error(
    "\nThe exported bundle embeds the artboards and canvas.json, so it stops\n" +
      "agreeing with them the moment either is edited (ADR-0049). Rebuild its\n" +
      "payload from the sources — it is generated, never hand-edited:\n\n" +
      "    pnpm build:design\n",
  );
  process.exit(1);
}

console.log("The exported bundle draws the artboards the design folder holds.");

/**
 * What is wrong with an artboard's colours, said the way `disagreements`
 * already says a bundle disagreement: which file, which line, and what is
 * wrong with it — never just "the palette or colours are wrong somewhere".
 *
 * Two independent things can be wrong, and both are reported rather than the
 * first one stopping the check before the second is even looked at: a stale
 * or missing palette block (`tokens.css` moved on, or the artboard never got
 * one), and a hardcoded colour outside the generated block or a `--canvas-*`
 * declaration (someone typed a hex where a `var(--color-…)` belongs).
 *
 * @param {Record<string, string>} sources every file `sourcesIn` returned,
 *   `canvas.json` included — filtered down to the artboards here
 * @returns {string[]}
 */
function colourProblems(sources) {
  /** @type {string[]} */
  const problems = [];

  for (const [file, text] of Object.entries(sources)) {
    if (file === MANIFEST) continue;

    const expectedBlock = paletteBlockFor(tokensCss, schemeFor(file));
    const currentBlock = helmetPaletteIn(text);
    if (currentBlock !== expectedBlock) {
      problems.push(
        currentBlock === null
          ? `${file}: carries no generated palette block`
          : `${file}: carries a palette block that has drifted from src/ui/tokens.css`,
      );
    }

    const { hardcoded } = classifyColoursIn(text);
    for (const { line, colour } of hardcoded) {
      problems.push(`${file}:${line}: hardcodes ${colour} instead of naming a token`);
    }
  }

  return problems;
}

/**
 * The classification report acceptance criterion 1 asks for: the count of
 * colour occurrences per artboard, and how each classifies — generated,
 * canvas-staged, or hardcoded — including the ones that were already
 * correct. Printed unconditionally, pass or fail, because a check that only
 * ever shows its failures cannot be read to confirm what it is *not*
 * flagging, and "how many did we already get right" is exactly the number
 * six previous fixes (#37, #62, #64, #67, #68, #95) never had.
 *
 * @param {string} designDir
 */
function report(designDir) {
  const artboardFiles = Object.keys(sourcesIn(designDir)).filter((file) => file !== MANIFEST);

  let totalGenerated = 0;
  let totalCanvas = 0;
  let totalHardcoded = 0;

  console.log("Colour occurrences per artboard (#138 — generated / canvas / hardcoded):");
  for (const file of artboardFiles) {
    const text = readFileSync(path.join(designDir, file), "utf8");
    const { generated, canvas, hardcoded } = classifyColoursIn(text);
    const total = generated.length + canvas.length + hardcoded.length;

    totalGenerated += generated.length;
    totalCanvas += canvas.length;
    totalHardcoded += hardcoded.length;

    console.log(
      `  ${file}: ${total} total — ${generated.length} generated, ${canvas.length} canvas, ` +
        `${hardcoded.length} hardcoded`,
    );
  }

  const total = totalGenerated + totalCanvas + totalHardcoded;
  console.log(
    `Total: ${artboardFiles.length} artboards, ${total} colour occurrences — ` +
      `${totalGenerated} generated, ${totalCanvas} canvas, ${totalHardcoded} hardcoded.\n`,
  );
}
