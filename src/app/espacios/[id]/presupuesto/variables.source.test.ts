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

/*
 * The same three answers, asked of the tray this row opens (#63).
 *
 * A tray row is a name that takes the leftover width and an amount read back
 * from the right, which is the shape ADR-0036 was written about -- and the
 * card the whole list sits in is `overflow: hidden`
 * (`grouped-list.module.css`), so a row that negotiated nothing would not even
 * spill where somebody could see it. It would be cut, which is the one thing
 * that ADR forbids by name.
 *
 * Stated here rather than folded into the block above, because they are two
 * rows with two rules: the comparison's pair may only ever break between its
 * halves, and this row's amount is a whole figure that drops under the name.
 */
describe("what a row of a Category's plan does when its amount gets wide", () => {
  /*
   * The amount drops under the name rather than squeezing it. The row is the
   * canvas's three things on one line -- name, amount, chevron -- and the
   * honest way for it to give is a second line, the way the comparison above
   * gives.
   */
  it("wraps the amount onto its own line rather than shrinking the name", () => {
    expect(rule("planText")).toMatch(/flex-wrap:\s*wrap/);
  });

  /*
   * And on the day the amount alone is wider than the row, it breaks rather
   * than spills -- `break-word` and never `anywhere`, for the reason the
   * figure above gives.
   */
  it("breaks the amount rather than letting it spill, and never anywhere", () => {
    expect(rule("planAmount")).toMatch(/overflow-wrap:\s*break-word/);
    expect(rule("planAmount")).not.toMatch(/overflow-wrap:\s*anywhere/);
  });

  /*
   * The chevron stays put whatever the amount does, which is why it is the
   * row's own sibling rather than a third thing wrapping alongside the other
   * two: it is what says the row goes somewhere, and a row whose only
   * affordance got pushed onto a second line under a long amount would stop
   * looking tappable exactly when it got hardest to read. The same shape the
   * comparison above has, where `.chevron` sits beside `.body`.
   */
  it("keeps the chevron on the line however wide the amount gets", () => {
    expect(rule("planChevron")).toMatch(/flex-shrink:\s*0/);
  });
});

/*
 * The disclosure's two rules that only the stylesheet can hold (#63).
 *
 * Neither is provable from the rendered markup: which way the chevron points
 * and whether the browser is drawing a triangle of its own are both painted
 * rather than written down, and jsdom applies no stylesheet at all. So they
 * are read here, the way the wrapping rules above are.
 */
describe("what says a Category's row is open", () => {
  /*
   * One drawing turned, and not two swapped. `chevron-right` laid on its side
   * is `chevron-down` to the pixel, so the rotation gets the open state the
   * canvas draws out of the icon the closed state already had -- and there is
   * no second element that can fall out of step with the first.
   *
   * The direction is also the half of the state that survives everything: the
   * two greys are a second way of saying it, and a person who cannot tell them
   * apart still reads which way the chevron points.
   */
  it("turns the chevron rather than drawing a second one", () => {
    expect(stylesheet).toMatch(
      /details\[open\][^{]*\.chevron\s*\{[^}]*transform:\s*rotate\(90deg\)/,
    );
  });

  /*
   * And the browser's own marker goes, both ways it can be drawn: a list
   * marker in modern engines, `::-webkit-details-marker` in Safari. Left on,
   * it is a triangle at the *start* of the row pointing the other way from the
   * chevron at the end -- two answers to "is this open" facing opposite
   * directions on one line.
   */
  it("takes the browser's own disclosure triangle off the row", () => {
    expect(rule("summary")).toMatch(/list-style:\s*none/);
    expect(stylesheet).toMatch(
      /::-webkit-details-marker\s*\{[^}]*display:\s*none/,
    );
  });
});
