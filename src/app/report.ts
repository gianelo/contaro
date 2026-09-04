/**
 * What the server is told when something went wrong that is nobody's typo.
 *
 * The person is told by `refusalMessage`, which says nothing about the cause: a
 * dropped connection reported as "the amount is wrong" sends them to correct a
 * field that was never the problem. This is the other half — the cause has to
 * go somewhere, and that somewhere is the log.
 *
 * One module and not one copy per section, because it is one rule and the
 * comment that used to sit above each copy already said so: several copies of
 * "log what failed" is several places for one of them to stop logging.
 */
export function report(
  what: string,
  outcome: { kind: string; cause?: unknown },
): void {
  if (outcome.kind === "failed") {
    console.error(`${what} failed.`, outcome.cause);
  }
}
