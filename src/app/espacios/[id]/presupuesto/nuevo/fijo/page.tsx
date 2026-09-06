import { permanentRedirect } from "next/navigation";

/**
 * Where the second way into the plan used to be (#13, and gone at #80).
 *
 * There is one form now, and it asks the day question the way in used to
 * stand for. This route is kept rather than deleted because ADR-0010 says the
 * address bar stays honest: a link somebody kept, or a tab left open since
 * before the merge, lands on the one form still holding the month it was
 * opened on, and the URL then says where they actually are. A 404 would be
 * this codebase telling a person their bookmark was wrong when what changed
 * was us.
 *
 * Permanent, because it is: the route it replaced is not coming back.
 *
 * Nothing is proved here. Whose Space this is, and whether it exists at all,
 * is the question the screen on the far side asks (`currentSpace`) — and
 * asking it here would be this route answering it out loud for an identifier
 * somebody guessed.
 */
export default async function TheOldFixedItemRoute({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mes?: string }>;
}) {
  const [{ id }, { mes }] = await Promise.all([params, searchParams]);

  const plan = `/espacios/${id}/presupuesto/nuevo`;

  // The month is carried across, because landing on "this month" would take
  // somebody planning October in September off the month they were working
  // on. It came out of a URL, so it is escaped on the way back into one: it is
  // a string somebody typed until `monthInView` reads it, and an unescaped `&`
  // here would be a second answer nobody gave.
  permanentRedirect(
    mes === undefined ? plan : `${plan}?mes=${encodeURIComponent(mes)}`,
  );
}
