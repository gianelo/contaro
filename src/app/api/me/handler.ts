import type { Member } from "@/domain/identity/resolve-member";

/** The Member a session claims to belong to, or no session at all. */
export type ReadSession = () => Promise<{ memberId: string } | null>;

export type FindMember = (id: string) => Promise<Member | null>;

/**
 * The seam ticket #3 is proven at: a Google session resolves to the Member it
 * belongs to, and a request without one is refused.
 *
 * Both the session and the lookup arrive as arguments, so the whole path — a
 * session naming a Member, that Member being fetched by that id — is driven
 * without a server, a browser or a Google account.
 */
export async function handleMeRequest(
  readSession: ReadSession,
  findMember: FindMember,
): Promise<Response> {
  const session = await readSession();

  if (session === null) {
    return Response.json({ error: "not_signed_in" }, { status: 401 });
  }

  const member = await findMember(session.memberId);

  if (member === null) {
    // The session is properly signed, but the Member it names is gone. Saying
    // "not signed in" would send a person to sign in again and land them right
    // back here, because the token they would be handed says the same thing.
    return Response.json({ error: "unknown_member" }, { status: 401 });
  }

  // Deliberately not the whole Member: the Google subject is how a session is
  // resolved, so it stays on the server, and the email address is nobody's
  // business until a ticket asks for it.
  return Response.json({ id: member.id, name: member.name });
}
