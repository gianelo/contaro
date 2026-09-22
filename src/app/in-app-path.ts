/**
 * A path somebody's form says to go back to, or the fallback if it is not a
 * path in this app (#152).
 *
 * The value decides a `redirect()`, and a form field is whatever the request
 * says it is, so it is never handed over raw: an open redirect is a link with
 * this product's name on it that lands somewhere else.
 *
 * Resolved against a throwaway origin rather than pattern-matched, because the
 * browser is the one that reads it in the end and it is more forgiving than
 * any pattern — `//host` and `/\host` both leave the site. Whatever resolves to
 * another origin, or needed the base to mean anything at all, is refused.
 */
export function inAppPath(raw: string, fallback: string): string {
  // A slash first, and nothing a URL parser would quietly strip or fold.
  if (!raw.startsWith("/") || /[\\\u0000-\u001f\u007f]/.test(raw)) {
    return fallback;
  }

  const base = "http://in-app.invalid";
  const url = new URL(raw, base);
  if (url.origin !== base) return fallback;

  return `${url.pathname}${url.search}${url.hash}`;
}
