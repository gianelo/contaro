// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  citationsIn,
  commentsIn,
  driftIn,
  matchable,
} from "./adr-citations";

describe("commentsIn", () => {
  it("reads a line comment without its slashes", () => {
    expect(commentsIn("// ADR-0008 says so\n")).toEqual([
      { text: "ADR-0008 says so", line: 1 },
    ]);
  });

  it("joins consecutive line comments, so a quote may wrap", () => {
    const source = ['// ADR-0008 says "Making it', '// NOT NULL"'].join("\n");

    expect(commentsIn(source)).toEqual([
      { text: 'ADR-0008 says "Making it\nNOT NULL"', line: 1 },
    ]);
  });

  it("separates line comments that code stands between", () => {
    const source = ["// first", "const a = 1;", "// second"].join("\n");

    expect(commentsIn(source)).toEqual([
      { text: "first", line: 1 },
      { text: "second", line: 3 },
    ]);
  });

  it("reads a block comment without its fence or its stars", () => {
    const source = ["/**", " * ADR-0008 says", " * so.", " */"].join("\n");

    expect(commentsIn(source)).toEqual([
      { text: "ADR-0008 says\nso.", line: 1 },
    ]);
  });

  it("ignores a comment's shape inside a string literal", () => {
    const source = 'const url = "https://example.test";\n';

    expect(commentsIn(source)).toEqual([]);
  });

  it("ignores a comment's shape inside a template literal", () => {
    const source = "const url = `https://example.test`;\n";

    expect(commentsIn(source)).toEqual([]);
  });

  it("ignores an escaped quote, so the string it closes is the right one", () => {
    const source = 'const s = "a \\" // not a comment";\n';

    expect(commentsIn(source)).toEqual([]);
  });

  it("counts the lines a template literal spans, so what follows is placed", () => {
    const source = ["const sql = `first", "second`;", "// ADR-0008 says so"].join(
      "\n",
    );

    expect(commentsIn(source)).toEqual([
      { text: "ADR-0008 says so", line: 3 },
    ]);
  });

  it("reads a trailing comment on a line that also holds code", () => {
    const source = "const a = 1; // ADR-0008 says so\n";

    expect(commentsIn(source)).toEqual([
      { text: "ADR-0008 says so", line: 1 },
    ]);
  });
});

describe("matchable", () => {
  it("collapses the whitespace a wrapped line left behind", () => {
    expect(matchable("Making it\n   NOT   NULL")).toBe("Making it NOT NULL");
  });

  it("takes off the backticks an ADR writes an identifier in", () => {
    expect(matchable("Making it `NOT NULL` is a third deploy")).toBe(
      "Making it NOT NULL is a third deploy",
    );
  });

  it("takes off bold, which an ADR uses to stress the word that moved", () => {
    expect(matchable("Making **it** `NOT NULL`")).toBe("Making it NOT NULL");
  });

  it("takes off italics written either way", () => {
    expect(matchable("a build that fails *after* migrating")).toBe(
      "a build that fails after migrating",
    );
    expect(matchable("a build that fails _after_ migrating")).toBe(
      "a build that fails after migrating",
    );
  });

  it("keeps the underscores inside a name, which are not italics", () => {
    expect(matchable("`0009_fixed_items.sql` added it")).toBe(
      "0009_fixed_items.sql added it",
    );
  });

  it("keeps a link's words and drops where it points", () => {
    expect(matchable("see [the docs](https://example.test) for it")).toBe(
      "see the docs for it",
    );
  });

  it("leaves prose that carries no markup alone", () => {
    expect(matchable("income is not spending")).toBe("income is not spending");
  });
});

const comment = (text: string) => [{ text, line: 1 }];

describe("citationsIn", () => {
  it("reads a quote the marker announces", () => {
    expect(citationsIn(comment('ADR-0008 says "Making it NOT NULL".'))).toEqual(
      [{ adr: "0008", quote: "Making it NOT NULL", line: 1 }],
    );
  });

  it("reads the marker's other verb", () => {
    expect(citationsIn(comment('ADR-0005 is "not good intentions".'))).toEqual([
      { adr: "0005", quote: "not good intentions", line: 1 },
    ]);
  });

  it("reads a quote that wrapped, as one sentence", () => {
    const wrapped = 'ADR-0008 says "Making it\nNOT NULL is a third deploy".';

    expect(citationsIn(comment(wrapped))).toEqual([
      { adr: "0008", quote: "Making it NOT NULL is a third deploy", line: 1 },
    ]);
  });

  it("reads every citation a comment makes", () => {
    const both = 'ADR-0008 says "a" and ADR-0009 says "b".';

    expect(citationsIn(comment(both))).toEqual([
      { adr: "0008", quote: "a", line: 1 },
      { adr: "0009", quote: "b", line: 1 },
    ]);
  });

  it("passes over the codebase's own slogan, which cites nothing", () => {
    const slogan = 'Asked through `spent`: "income is not spending" and "two';

    expect(citationsIn(comment(slogan))).toEqual([]);
  });

  it("passes over a claim credited to an issue and not to an ADR", () => {
    const issue = '"The row leaves only when it is closed" (#118), which the';

    expect(citationsIn(comment(issue))).toEqual([]);
  });

  it("passes over the parenthetical citation this repo writes everywhere", () => {
    const parenthetical = "the Space's and is never the locale's guess (ADR-0014)";

    expect(citationsIn(comment(parenthetical))).toEqual([]);
  });

  it("passes over prose where the verb leads somewhere other than a quote", () => {
    const prose = 'ADR-0024 is where that lives, and "pace" is the word for it';

    expect(citationsIn(comment(prose))).toEqual([]);
  });

  it("passes over a quote the ADR reference follows", () => {
    const after = '"income is not spending", which is ADR-0016';

    expect(citationsIn(comment(after))).toEqual([]);
  });
});

const citation = (quote: string, adr = "0008") => ({ adr, quote, line: 1 });

describe("driftIn", () => {
  const adr = "Making it `NOT NULL` is a third deploy, after a second one has\nfilled it.";

  it("finds nothing wrong with a quote the ADR still holds", () => {
    expect(driftIn(citation("Making it NOT NULL is a third deploy"), adr)).toBe(
      null,
    );
  });

  it("finds nothing wrong with a quote that wrapped elsewhere", () => {
    expect(
      driftIn(citation("a third deploy, after a second one has filled it"), adr),
    ).toBe(null);
  });

  it("names the drift when the ADR no longer says it", () => {
    const stale = driftIn(citation("Making a column NOT NULL"), adr);

    expect(stale).toContain("ADR-0008");
    expect(stale).toContain("Making a column NOT NULL");
  });

  it("says so when the ADR it credits does not exist", () => {
    const missing = driftIn(citation("anything", "0099"), null);

    expect(missing).toContain("ADR-0099");
  });
});

/**
 * The tree this check reads, and the scoping call #96 left to whoever built it.
 *
 * `src/` and `e2e/` because that is where the drift has cost work. `scripts/`
 * because the checks in it argue from ADR-0008 as much as any module does, and
 * a rule's enforcement drifting from the rule is the worst of the shapes.
 *
 * And `docs/adr/` itself, which the issue named as a call rather than a
 * technical question: ADRs quote each other -- 0014, 0018, 0028, 0033, 0037
 * and 0045 each quote another one -- and a decision restating another's words
 * is exactly the claim that goes false when the other is amended, which
 * happens here
 * (ADR-0003 carries an `## Amended by #120`). Since the marker is opt-in,
 * including them costs nothing today and catches that tomorrow. There is no
 * comment syntax in markdown, so an ADR is read whole.
 *
 * `docs/agents/` and the rest of `docs/` are out: they address an agent rather
 * than argue a decision, and nothing in them cites an ADR's words.
 */
const root = path.join(import.meta.dirname, "..");

const under = (dir: string, extensions: string[]) =>
  readdirSync(path.join(root, dir), { recursive: true, encoding: "utf8" })
    .filter((name) => extensions.some((extension) => name.endsWith(extension)))
    .map((name) => `${dir}/${name.split(path.sep).join("/")}`)
    .sort();

const adrFiles = under("docs/adr", [".md"]);

const scanned = [
  ...under("src", [".ts", ".tsx"]),
  ...under("e2e", [".ts"]),
  ...under("scripts", [".ts", ".js"]),
  ...adrFiles,
];

const adrs = new Map(
  adrFiles.map((file) => [
    path.basename(file).slice(0, 4),
    readFileSync(path.join(root, file), "utf8"),
  ]),
);

const cited = scanned.flatMap((file) => {
  const text = readFileSync(path.join(root, file), "utf8");
  const prose = file.endsWith(".md") ? [{ text, line: 1 }] : commentsIn(text);

  return citationsIn(prose).map((citation) => ({ ...citation, file }));
});

describe("the ADRs this codebase quotes", () => {
  it("still say what the comments quoting them say they say", () => {
    const stale = cited
      .map((citation) => {
        const drift = driftIn(citation, adrs.get(citation.adr) ?? null);

        return drift === null ? null : `${citation.file}:${citation.line} ${drift}`;
      })
      .filter((failure) => failure !== null);

    expect(stale).toEqual([]);
  });

  /**
   * Without this the check above passes on an empty list, which is what a
   * broken walk and a clean tree look like from the outside. Coverage of the
   * marker starts near zero on purpose, so "found nothing" is the expected
   * shape of a bug here rather than of success.
   */
  it("is reading a tree that has marked citations in it", () => {
    expect(scanned.length).toBeGreaterThan(100);
    expect(adrs.size).toBeGreaterThan(50);
    expect(cited.length).toBeGreaterThan(0);
  });
});
