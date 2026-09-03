/**
 * The three shapes ADR-0008 forbids, each named as the report names it.
 *
 * One table rather than two rules and a special case: the last one cannot be a
 * plain pattern, because `NOT NULL` and `DEFAULT` have to be weighed against
 * each other within a single statement.
 */
const FORBIDDEN = [
  { name: "DROP TABLE", found: (sql) => /\bDROP\s+TABLE\b/i.test(sql) },
  { name: "DROP COLUMN", found: (sql) => /\bDROP\s+COLUMN\b/i.test(sql) },
  { name: "ADD COLUMN NOT NULL without DEFAULT", found: addsRequiredColumnWithoutDefault },
];

/**
 * Reads a migration file and reports the changes ADR-0008 forbids.
 *
 * @param {string} sql the contents of one migration file
 * @returns {string[]} one entry per destructive change, empty when there is none
 */
export function destructiveChanges(sql) {
  const executable = onlyExecutable(sql);
  return FORBIDDEN.filter(({ found }) => found(executable)).map(({ name }) => name);
}

/**
 * A file that adds one column with a default and another without still loses
 * the rows, so the two words are weighed per statement rather than per file.
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
 * Blanks out everything Postgres would not execute as SQL — comments, string
 * literals and quoted identifiers — so that only statements are matched
 * against.
 *
 * A pass rather than a chain of `.replace()` calls, because the constructs
 * hide each other: `--` inside a string literal is not a comment, and if it is
 * treated as one it swallows the rest of the line, which in a check like this
 * one means silently missing a real DROP.
 *
 * Dollar-quoted bodies (`$$ ... $$`) are deliberately left alone. What is
 * inside one is a function that really runs, so a DROP written there is a DROP.
 *
 * @param {string} sql
 * @returns {string} the same text with every non-executable run replaced by spaces
 */
function onlyExecutable(sql) {
  let out = "";
  let i = 0;

  while (i < sql.length) {
    const rest = sql.slice(i);

    if (rest.startsWith("--")) {
      const end = sql.indexOf("\n", i);
      i = end === -1 ? sql.length : end;
      out += " ";
    } else if (rest.startsWith("/*")) {
      const end = sql.indexOf("*/", i + 2);
      i = end === -1 ? sql.length : end + 2;
      out += " ";
    } else if (sql[i] === "'" || sql[i] === '"') {
      i = endOfQuoted(sql, i);
      out += " ";
    } else {
      out += sql[i];
      i += 1;
    }
  }

  return out;
}

/**
 * The index just past the quoted run starting at `start`. Postgres escapes a
 * quote by doubling it, so `'it''s'` is one literal and not two.
 *
 * @param {string} sql
 * @param {number} start index of the opening quote
 * @returns {number}
 */
function endOfQuoted(sql, start) {
  const quote = sql[start];
  let i = start + 1;

  while (i < sql.length) {
    if (sql[i] !== quote) {
      i += 1;
    } else if (sql[i + 1] === quote) {
      i += 2;
    } else {
      return i + 1;
    }
  }

  return sql.length;
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
