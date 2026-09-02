import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { deliberateLoss, destructiveChanges } from "./destructive-migration.js";

// ADR-0008: expand/contract is enforced by a check, not written down and
// trusted. `drizzle-kit generate` emits DROP COLUMN without asking, so the SQL
// it writes is a draft and not a verdict — this is what reads the verdict.
const migrations = path.join(import.meta.dirname, "..", "src", "db", "migrations");

const failures = [];

for (const file of readdirSync(migrations).filter((f) => f.endsWith(".sql")).sort()) {
  const sql = readFileSync(path.join(migrations, file), "utf8");
  const changes = destructiveChanges(sql);
  if (changes.length === 0) continue;

  const reason = deliberateLoss(sql);
  if (reason) {
    console.log(`~ ${file}: ${changes.join(", ")} — deliberate: ${reason}`);
  } else {
    failures.push(`✗ ${file}: ${changes.join(", ")}`);
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  console.error(
    "\nExpand/contract (ADR-0008): add the new column, write both, move the reads,\n" +
      "and drop the old one a deploy later. If the loss is deliberate, say so in the\n" +
      "migration and say why:\n\n" +
      "    -- deliberate-loss: nothing has read spaces.nickname since #31.\n",
  );
  process.exit(1);
}

console.log("Migrations are safe to run against a deploy that has not caught up.");
