/**
 * The conventions an amount is written under when nothing is known about who
 * is reading it.
 *
 * Colombian, because that is where contaro's Members are and a fallback has to
 * be somebody's. It is a last resort and not a default: a request that says
 * how its reader reads numbers is never formatted with this. Plain "es" was
 * rejected as the neutral-looking choice — it writes an amount as
 * "1234,50 MXN", with the code trailing and no thousands separator below five
 * digits, which is nobody's idea of a figure.
 *
 * It was Argentine until the Members moved (ADR-0014, amended). The move
 * costs a figure nothing: the two write every separator the same way, so no
 * amount is read differently under one than the other. What changes is which
 * peso gets the bare "$" and which gets its code, and that is a clumsy line
 * rather than a wrong one -- which is why the constant is here and correct
 * rather than in the same commit as a decimal point.
 */
export const fallbackNumberLocale = "es-CO";

/**
 * How many tags of an `Accept-Language` header are worth reading.
 *
 * A browser sends two or three. The header is attacker-controlled and every
 * locale in the list is one more lookup on every amount on the page, so the
 * tail of a long one is dropped rather than walked.
 */
const MOST_TAGS_WORTH_READING = 10;

type Preference = { locale: string; weight: number };

/**
 * The locales a reader reads numbers under, most wanted first, always ending
 * in the fallback.
 *
 * `Accept-Language` is what the person set their browser to, which is the only
 * statement contaro ever gets about how they read a figure. It is deliberately
 * not the country the request came from: that is a guess about where a body
 * is, and ADR-0013 already keeps it to ordering a picker, where being wrong
 * costs an annoyance rather than a decimal point.
 *
 * A header is not code (ADR-0013), so anything in it that is not a language
 * tag is dropped instead of thrown: `Intl.NumberFormat` refuses a malformed
 * tag with a `RangeError`, and a browser sending junk must not be a screen
 * that will not render.
 */
export function numberLocalesFrom(
  acceptLanguage: string | null | undefined,
): readonly string[] {
  const preferences: Preference[] = [];

  for (const part of (acceptLanguage ?? "").split(",")) {
    const preference = preferenceIn(part);
    if (preference) preferences.push(preference);
  }

  // Stable, so tags that want the same thing stay in the order the browser
  // wrote them: it asked for them in that order for a reason.
  preferences.sort((a, b) => b.weight - a.weight);

  const locales = new Set(
    preferences.slice(0, MOST_TAGS_WORTH_READING).map((it) => it.locale),
  );
  locales.add(fallbackNumberLocale);

  return [...locales];
}

/**
 * One comma-separated entry of the header, or nothing if it names no
 * conventions: a wildcard, a weight of zero, or something that is not a tag.
 */
function preferenceIn(part: string): Preference | null {
  const [tag, ...parameters] = part.split(";");
  const locale = canonical(tag?.trim() ?? "");
  if (!locale) return null;

  const weight = weightIn(parameters);
  return weight > 0 ? { locale, weight } : null;
}

/**
 * The conventions a tag names, and nothing else: language, script and region,
 * as Intl spells them — "ES-mx" is "es-MX". Nothing, if Intl will not have it.
 *
 * `*` is dropped here too: it is a valid thing to send and it says only
 * "anything", which is what the fallback already means.
 *
 * The extension subtags are dropped rather than passed on, because they reach
 * past what this decides. `-u-nu-thai` is a well-formed thing to send and it
 * writes an amount as "ARS ๑,๒๓๔.๕๐" — different digits, not different
 * separators, which is more than ADR-0014 says a header may change.
 */
function canonical(tag: string): string | null {
  if (!tag || tag === "*") return null;

  try {
    return new Intl.Locale(tag).baseName;
  } catch {
    return null;
  }
}

/**
 * The `q` parameter, between 0 and 1, or 1 for a tag that did not say.
 *
 * An unweighted tag is the most wanted one, which outranks anything that named
 * a number. A `q` nobody can read — "q=", "q", "q=zzz" — is treated as one
 * that was never there, rather than as a refusal: the tag itself is a plain
 * statement about how its reader reads, and throwing that away over a broken
 * parameter is the silent inversion #24 exists to close. Only a weight that
 * really parses and really is zero drops a tag, which is what `q=0` means.
 */
function weightIn(parameters: readonly string[]): number {
  for (const parameter of parameters) {
    const [name, value] = parameter.split("=");
    if (name?.trim().toLowerCase() !== "q") continue;

    const said = value?.trim();
    if (!said) return 1;

    const weight = Number(said);
    return Number.isFinite(weight) ? Math.min(Math.max(weight, 0), 1) : 1;
  }

  return 1;
}
