import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { bundleWith, disagreements, documentIn, rebuilt, sourcesIn } from "./design-bundle.js";

// ADR-0049: the export's content half is built from `design/`, and the check
// is what makes that true rather than intended. The editor shell around it is
// still only ever produced by re-exporting from the canvas — this rewrites one
// line of the file and never the other 11008.
const design = path.join(import.meta.dirname, "..", "design");
const exported = path.join(design, "contaro-app.html");

const write = process.argv.includes("--write");

const bundle = readFileSync(exported, "utf8");
const doc = documentIn(bundle);
const sources = sourcesIn(design);

if (write) {
  writeFileSync(exported, bundleWith(bundle, rebuilt(doc, sources)));
  const where = path.relative(process.cwd(), exported);
  console.log(`Rebuilt ${where} from the ${Object.keys(sources).length} sources in design/.`);
  process.exit(0);
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
