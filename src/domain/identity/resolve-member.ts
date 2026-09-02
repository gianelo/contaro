/**
 * The one place a person from outside becomes a Member.
 *
 * Google is the only identity provider (#3), and it is the only thing in this
 * product that comes from outside the domain. What arrives here is already a
 * verified Google account; the rule below decides which Member it is.
 */

/** A Google account as it reaches us, already verified by Google. */
export type GoogleIdentity = {
  /** Google's stable per-account identifier (`sub`). Never reused. */
  subject: string;
  email: string;
  name: string;
};

/** A Member as it is stored: identity only. Spaces arrive with #4. */
export type Member = {
  id: string;
  googleSubject: string;
  email: string;
  name: string;
};

/** A Member that does not exist yet, so it has no id to give. */
export type NewMember = Omit<Member, "id">;

export type MemberResolution =
  | { kind: "created"; member: NewMember }
  | { kind: "refreshed"; member: Member }
  | { kind: "unchanged"; member: Member };

/**
 * Thrown when an identity cannot be turned into a Member. It means the caller
 * handed us something Google should never produce, so the only safe answer is
 * to refuse the sign-in rather than guess who this is.
 */
export class UnusableIdentityError extends Error {
  constructor(reason: string) {
    super(`This Google account cannot be resolved to a Member: ${reason}.`);
    this.name = "UnusableIdentityError";
  }
}

const isBlank = (value: string) => value.trim() === "";

export function resolveMember(
  identity: GoogleIdentity,
  existing: Member | null,
): MemberResolution {
  if (isBlank(identity.subject)) {
    throw new UnusableIdentityError("it carries no Google subject");
  }
  if (isBlank(identity.email)) {
    throw new UnusableIdentityError("it carries no email address");
  }
  if (existing !== null && existing.googleSubject !== identity.subject) {
    // The caller looked the Member up by something other than this subject, so
    // returning it would hand one person another person's Space.
    throw new UnusableIdentityError(
      "it belongs to a different Google account than the Member given",
    );
  }

  // A Member is addressed by name everywhere in the interface, so one is
  // always chosen here rather than left to whatever a screen decides to show.
  const name = isBlank(identity.name)
    ? (existing?.name ?? identity.email)
    : identity.name;

  if (existing === null) {
    return {
      kind: "created",
      member: {
        googleSubject: identity.subject,
        email: identity.email,
        name,
      },
    };
  }

  const profileChanged =
    existing.email !== identity.email || existing.name !== name;

  if (profileChanged) {
    return {
      kind: "refreshed",
      member: { ...existing, email: identity.email, name },
    };
  }

  return { kind: "unchanged", member: existing };
}
