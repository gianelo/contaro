// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The rows' rules, with the prose between them taken out.
 *
 * The comments in that file name the declarations they are about -- including
 * the one this file bars from it -- so a test reading the raw bytes would find
 * a rule written down in a sentence explaining why it is not written down.
 * `summary.source.test.ts` reads its own stylesheet the same way.
 */
const stylesheet = readFileSync(
  path.join(import.meta.dirname, "variables.module.css"),
  "utf8",
).replace(/\/\*[\s\S]*?\*\//g, "");

const rule = (name: string) =>
  stylesheet.match(new RegExp(`\\.${name}\\s*\\{([^}]*)\\}`))?.[1] ?? "";

/*
 * ADR-0036's three answers, read on the tighter of the two lines it governs.
 *
 * The card states them for itself in `summary.source.test.ts`. They are stated
 * again here rather than shared, because "the meter rows do what the card
 * does" is the claim, and a claim held in one place is a claim only one of the
 * two files can break. The e2e measures the boxes and can say that the figures
 * no longer overlap; only this can say why.
 */
describe("what a Category's row does when its figures get wide", () => {
  /*
   * The pair separates rather than squeezing. `min-width: 0` is what let a
   * figure paint out of its own box and across the one beside it, and an
   * amount has no break in it to relieve the pressure -- so the answer is a
   * second line and never a narrower column.
   */
  it("wraps the figure onto its own line rather than shrinking it", () => {
    expect(rule("line")).toMatch(/flex-wrap:\s*wrap/);
    // Asked of the whole stylesheet, so it is barred from wherever on this row
    // somebody might write it next rather than only from the rules named here.
    expect(stylesheet).not.toMatch(/min-width:\s*0/);
  });

  /*
   * And on the day one half alone is wider than the row it breaks rather than
   * spills -- `break-word` and never `anywhere`, for the reason the card gives:
   * `anywhere` would drop the row's own minimum to a single digit, the line
   * would stop wrapping, and the pair would go back to being squeezed.
   */
  it("breaks the figure rather than letting it spill, and never anywhere", () => {
    expect(rule("figure")).toMatch(/overflow-wrap:\s*break-word/);
    expect(rule("figure")).not.toMatch(/overflow-wrap:\s*anywhere/);
  });

  /*
   * The pair is one figure a person reads as "two hundred and ten of four
   * hundred", so the half without the symbol may never be left on a line of
   * its own away from the slash that makes it a comparison. The first half
   * needs no rule: `Intl` joins a symbol to its digits with a non-breaking
   * space. The second half is bare digits and a slash, so it says so itself.
   */
  it("keeps the expected half whole, slash and all", () => {
    expect(rule("expectation")).toMatch(/white-space:\s*nowrap/);
  });
});
