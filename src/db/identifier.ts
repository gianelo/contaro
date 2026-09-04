/**
 * Whether a string from outside is shaped like one of our identifiers.
 *
 * It exists because an id arrives from a URL, which carries any string at all,
 * and Postgres refuses a malformed uuid with an error rather than an empty
 * result. "No such row" is the honest answer to a person who typed one wrong,
 * and it is not the domain's business what a uuid looks like.
 *
 * Said once because it is one rule: two copies of it is two places for one of
 * them to start letting a stack trace reach a screen.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isIdentifier(value: string): boolean {
  return UUID.test(value);
}
