/** The two shapes ADR-0008 forbids outright, each named as the report names it. */
const FORBIDDEN = [
  { name: "DROP TABLE", pattern: /\bDROP\s+TABLE\b/i },
  { name: "DROP COLUMN", pattern: /\bDROP\s+COLUMN\b/i },
];

const REQUIRED_COLUMN = "ADD COLUMN NOT NULL without DEFAULT";

/**
 * Reads a migration file and reports the changes ADR-0008 forbids.
 *
 * @param {string} sql the contents of one migration file
 * @returns {string[]} one entry per destructive change, empty when there is none
 */
export function destructiveChanges(sql) {
  sql = withoutComments(sql);
  const found = FORBIDDEN.filter(({ pattern }) => pattern.test(sql)).map(
    ({ name }) => name,
  );
  if (addsRequiredColumnWithoutDefault(sql)) found.push(REQUIRED_COLUMN);
  return found;
}

/**
 * `NOT NULL` and `DEFAULT` are matched per statement, not per file: a file that
 * adds one column with a default and another without still loses the rows.
 *
 * @param {string} sql
 * @returns {boolean}
 */
function addsRequiredColumnWithoutDefault(sql) {
  return sql
    .split(";")
    .some(
      (statement) =>
        /\bADD\s+COLUMN\b/i.test(statement) &&
        /\bNOT\s+NULL\b/i.test(statement) &&
        !/\bDEFAULT\b/i.test(statement),
    );
}

/**
 * Drops `--` line comments and `/* *\/` blocks, so a destructive statement that
 * someone only wrote about does not fail the build. It also disposes of the
 * `--> statement-breakpoint` markers drizzle-kit writes between statements.
 *
 * @param {string} sql
 * @returns {string}
 */
function withoutComments(sql) {
  return sql.replace(/--[^\n]*/g, " ").replace(/\/\*[\s\S]*?\*\//g, " ");
}

/**
 * The reason a migration gives for the rows it destroys, written as a comment:
 *
 *     -- deliberate-loss: nothing has read spaces.nickname since #31.
 *
 * The marker authorises the whole file, which is blunt on purpose: ADR-0008
 * speaks of "a migration containing" a destructive change, and a per-statement
 * marker is ceremony two people would only learn to paste. A marker with
 * nothing after it does not count — the point is the reason, not the token.
 *
 * @param {string} sql the contents of one migration file
 * @returns {string|null} the reason, or null when the file gives none
 */
export function deliberateLoss(sql) {
  const reason = /--\s*deliberate-loss:([^\n]*)/i.exec(sql)?.[1]?.trim();
  return reason ? reason : null;
}
