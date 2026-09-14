/**
 * The prose that argues this codebase, checked where it is checkable (#96).
 *
 * This repo cites its ADRs everywhere -- hundreds of comments across `src/`
 * and `e2e/` that do not restate the code but name the decision the code came
 * from. `tsc` checks shape and a test checks behaviour; a comment saying what
 * an ADR decided is an assertion about a file nobody compares it against, and
 * it has already gone false while sitting still twice (ADR-0033's second
 * paragraph, and three of #90's review findings).
 *
 * Only one shape of that claim is decidable: a quoted run presented as an
 * ADR's own words is either in that file or it is not. So this checks exactly
 * that shape, and announces it with an opt-in marker -- `ADR-00NN says "..."`
 * -- rather than guessing from proximity. Double-quoted text near an ADR
 * reference is routinely not a quotation of it in this tree: `budget.ts`
 * quotes the codebase's own slogan `"income is not spending"` thirty-five
 * lines from a real ADR-0016 citation, `money.ts` paraphrases its own module,
 * and `closure.test.ts` quotes a claim and credits it to `(#118)`, a GitHub
 * issue and not an ADR at all. A proximity rule flags the first two and a
 * length rule lets the slogan through by accident; a check with false
 * positives is a check that gets deleted, so the writer opts in instead.
 *
 * The price is that coverage starts at zero and grows only where somebody
 * writes the marker. That is the accepted trade: this is a cheap check for
 * the one shape that is decidable, not a claim to have solved comment drift.
 * Attribution errors where nothing is quoted, and claims that were true when
 * written, still need somebody reading.
 *
 * Every function here is pure: it takes text and returns data, the way
 * `design-palette.js`'s functions do, so `adr-citations.test.ts` is the only
 * place that touches a filesystem. It is TypeScript rather than the `.js` its
 * neighbours in this folder are, because no `node` script runs it -- the
 * check is a test -- so there is nothing to lose by letting `pnpm typecheck`
 * read it.
 */

/** A comment's text, stripped of the syntax that marked it as one. */
export type Comment = {
  /** The comment's own words. Consecutive `//` lines arrive as one. */
  text: string;
  /** 1-based, so a failure can name the line a person has to open. */
  line: number;
};

type Token = Comment & { endLine: number; codeBefore: boolean };

/**
 * Every comment in a TypeScript source, in the order they are written.
 *
 * It scans rather than matches, because `//` inside a string literal is not a
 * comment and this file's whole job is to not cry wolf: `"https://..."` would
 * otherwise open one on every URL in the tree.
 *
 * Consecutive `//` lines are returned as a single comment, since a sentence
 * long enough to be worth quoting is a sentence long enough to wrap, and a
 * quote that wrapped would otherwise arrive as two halves of nothing. Lines
 * with code between them do not join: a trailing comment is its own remark.
 *
 * What it does not model is a regular-expression literal, because telling one
 * from division needs a parser. A regex holding `//` or `/*` would be read as
 * opening a comment -- harmless unless that text also carries the marker.
 */
export function commentsIn(source: string): Comment[] {
  const tokens: Token[] = [];
  let line = 1;
  let codeOnLine = false;

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    const next = source[i + 1];

    if (char === "\n") {
      line += 1;
      codeOnLine = false;
      continue;
    }

    if (char === '"' || char === "'" || char === "`") {
      codeOnLine = true;
      const close = endOfLiteral(source, i);
      // A template literal is skipped whole, newlines and all, so the lines it
      // spans are counted here rather than by the loop that never sees them.
      line += countLines(source.slice(i, close + 1));
      i = close;
      continue;
    }

    if (char === "/" && next === "/") {
      const end = source.indexOf("\n", i);
      const stop = end === -1 ? source.length : end;
      tokens.push({
        text: source.slice(i + 2, stop).trim(),
        line,
        endLine: line,
        codeBefore: codeOnLine,
      });
      i = stop - 1;
      continue;
    }

    if (char === "/" && next === "*") {
      const end = source.indexOf("*/", i + 2);
      const stop = end === -1 ? source.length : end;
      const body = source.slice(i + 2, stop);
      tokens.push({
        text: undecorate(body),
        line,
        endLine: line + countLines(body),
        codeBefore: codeOnLine,
      });
      line += countLines(source.slice(i, stop + 2));
      i = stop + 1;
      codeOnLine = true;
      continue;
    }

    if (!/\s/.test(char ?? "")) codeOnLine = true;
  }

  return join(tokens);
}

/** Where the literal opening at `start` closes, honouring its escapes. */
function endOfLiteral(source: string, start: number): number {
  const quote = source[start];
  for (let i = start + 1; i < source.length; i += 1) {
    const char = source[i];
    if (char === "\\") {
      i += 1;
      continue;
    }
    if (char === quote) return i;
    if (char === "\n" && quote !== "`") return i - 1;
  }
  return source.length - 1;
}

function countLines(text: string): number {
  return text.split("\n").length - 1;
}

/** A block comment's words, with the leading stars a JSDoc draws taken off. */
function undecorate(body: string): string {
  return body
    .split("\n")
    .map((row) => row.replace(/^\s*\*+ ?/, "").trimEnd())
    .join("\n")
    .replace(/^\s*\n/, "")
    .trim();
}

/** Consecutive `//` lines are one remark, so a quote may wrap across them. */
function join(tokens: Token[]): Comment[] {
  const comments: Comment[] = [];
  let previous: Token | null = null;

  for (const token of tokens) {
    const runsOn =
      previous !== null &&
      previous.line === previous.endLine &&
      token.line === token.endLine &&
      token.line === previous.endLine + 1 &&
      !token.codeBefore;

    if (runsOn && previous !== null) {
      previous.text = `${previous.text}\n${token.text}`;
      previous.endLine = token.endLine;
      continue;
    }

    const comment: Token = { ...token };
    comments.push(comment);
    previous = comment;
  }

  return comments.map(({ text, line }) => ({ text, line }));
}

/**
 * One text reduced to the words it says, so two copies can be compared.
 *
 * Two things stand between a quote in a comment and the sentence it came
 * from. The first is the wrapping: a comment breaks a sentence wherever the
 * column ran out, and the ADR broke it somewhere else, so every run of
 * whitespace becomes one space. The second is markdown: ADR-0008 says
 * "Making it `NOT NULL` is a third deploy", with the identifier in backticks,
 * and elsewhere it stresses a word in bold -- and #90's review found a comment
 * quoting that exact sentence with the markup dropped, which is what a person
 * copying it out does. Comparing the raw bytes would fail every honest quote
 * and pass none, so the markup comes off both sides and the words are what is
 * compared.
 *
 * What does not come off is an underscore inside a name: `0009_fixed_items`
 * is a file this repo cites by name, not an emphasis, so italics are taken
 * only where a word boundary stands on both sides.
 */
export function matchable(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/`+/g, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/(?<![A-Za-z0-9])\*([^*\n]+)\*(?![A-Za-z0-9])/g, "$1")
    .replace(/(?<![A-Za-z0-9_])_([^_\n]+)_(?![A-Za-z0-9_])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/** A comment presenting a run of words as an ADR's own. */
export type Citation = {
  /** The ADR's four-digit number, as `docs/adr/` names it. */
  adr: string;
  /** What the comment says the ADR says, ready to be compared. */
  quote: string;
  /** 1-based, the line the marker opens on. */
  line: number;
};

/**
 * The marker a citation announces itself with: `ADR-00NN says "..."`.
 *
 * The quote has to open on the verb, with nothing between them but space.
 * That is what tells a citation from the parenthetical `(ADR-0014)` this repo
 * writes several hundred times, and from the prose that reaches for an ADR
 * mid-sentence -- `ADR-0024 is where that lives` is a phrasing already in the
 * tree, and it is a citation of a decision rather than of a sentence, so a
 * quote later on the same line is not its.
 *
 * A quote therefore cannot itself contain a double quote. Nothing in the tree
 * needs one, and the alternative is escaping rules inside prose.
 */
const MARKER = /ADR-(\d{4})\s+(?:says|is)\s+"([^"]*)"/g;

/** Every marked citation these comments make, in the order they are written. */
export function citationsIn(comments: Comment[]): Citation[] {
  return comments.flatMap(({ text, line }) =>
    [...text.matchAll(MARKER)].map((match) => ({
      adr: match[1] ?? "",
      quote: matchable(match[2] ?? ""),
      line: line + countLines(text.slice(0, match.index)),
    })),
  );
}

/**
 * What is wrong with one citation, or `null` where nothing is.
 *
 * `adr` is the named decision's markdown, or `null` where `docs/adr/` holds
 * no such file -- which is its own kind of drift and the one a renumbering
 * would cause, so it is answered here rather than thrown somewhere earlier.
 *
 * The sentence it returns is what a person reads when the check fails, so it
 * carries the quote and not only the verdict: the whole point is that the two
 * copies have parted, and the one in hand is the half they are looking at.
 */
export function driftIn(citation: Citation, adr: string | null): string | null {
  if (adr === null) {
    return `ADR-${citation.adr} is cited and docs/adr/ has no such decision.`;
  }

  if (matchable(adr).includes(citation.quote)) return null;

  return `ADR-${citation.adr} no longer says "${citation.quote}".`;
}
