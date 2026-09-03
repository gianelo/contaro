/**
 * An Invitation: the offer of a Space's second seat, made to an email address
 * (#9). It is how a couple comes to share one Space, and it is the only way a
 * Member is ever added to one.
 *
 * A pending Invitation *holds* the seat rather than merely hoping for it. That
 * is the whole shape of this module: without it, three invitations go out and
 * whichever two people sign in first take the Space — a race nobody asked for
 * and nobody can see afterwards. So a Space of one Member with one Invitation
 * outstanding is as full as a Space of two.
 *
 * And it is *taken*, never given: an Invitation becomes a membership when the
 * person it names says yes, not when they happen to sign in. Anyone who knows
 * an address could otherwise drop a Space full of somebody else's money into
 * that person's list without ever asking them (ADR-0017).
 */

import type { Space } from "./space";

/**
 * How many Members a Space holds. Two, because a Space is one person's money
 * or a couple's (CONTEXT.md), and the third person is another Space.
 */
export const MAX_SPACE_MEMBERS = 2;

/**
 * The longest address there is, by the length of an SMTP path. Not a guess: it
 * is the point past which no mailbox can exist, so it refuses a paste rather
 * than a name.
 */
export const MAX_EMAIL_LENGTH = 254;

/**
 * Where an Invitation got to. Four words rather than a row that disappears,
 * because "she said no" and "he took it back" are two different things that
 * happened, and a Space whose second seat is free again should be able to say
 * which of them freed it.
 */
export type InvitationStatus = "pending" | "accepted" | "declined" | "revoked";

const STATUSES: readonly InvitationStatus[] = [
  "pending",
  "accepted",
  "declined",
  "revoked",
];

/** Whether a string from outside — a database row — names one of the four. */
export function isInvitationStatus(value: string): value is InvitationStatus {
  return STATUSES.some((status) => status === value);
}

export type Invitation = {
  id: string;
  spaceId: string;
  /**
   * The mailbox invited, normalised. Not a Member id: the whole point is that
   * the person may not exist here yet, and an address is the only name a
   * stranger has (#9).
   */
  email: string;
  /** The Member who sent it. Kept so the Space can say who did the inviting. */
  invitedBy: string;
  status: InvitationStatus;
};

/** An Invitation that does not exist yet, so it has no id to give. */
export type NewInvitation = Omit<Invitation, "id">;

/**
 * The Space an Invitation is being sent into, as the rules need to see it.
 *
 * Handed in rather than looked up, the way `Recording` is: every rule below
 * runs in milliseconds with no database (ADR-0005).
 */
export type Inviting = {
  space: Space;
  /** The signed-in Member. `invitedBy` is this and nothing else. */
  invitedBy: string;
  /** Everyone already in the Space, so the seat can be counted. */
  memberIds: readonly string[];
  /**
   * Their addresses, so an invitation to somebody already inside is refused
   * as the mistake it is rather than sent into a void.
   */
  memberEmails: readonly string[];
  /** The Invitations still outstanding. Each one is holding a seat. */
  pending: readonly Invitation[];
};

/**
 * An Invitation as the Space that sent it reads it: the address and who put it
 * there, so a Member can tell "I invited Ana" from "Ana invited me".
 */
export type PendingInvitation = {
  invitation: Invitation;
  invitedByName: string;
};

/**
 * An Invitation as the person it names reads it: which Space it opens, and
 * from whom.
 *
 * The one shape in this product that shows somebody a Space they are not in.
 * What makes it theirs to see is that their own verified address is written on
 * the row, and nothing else.
 */
export type WaitingInvitation = PendingInvitation & {
  space: Space;
};

/** Who is answering an Invitation, and what the Space looks like from here. */
export type Accepting = {
  /** The signed-in Member taking the seat. */
  memberId: string;
  /** Their own verified address, which is what the Invitation is matched to. */
  email: string;
  /** Everyone already in the Space. */
  memberIds: readonly string[];
};

/**
 * Which answer was the bad one, so a screen can point at the input rather than
 * showing one apology for a form of one field and a rule about seats.
 *
 * `seat` and `space` are two different refusals and not one. "There is no room
 * in this Space" is a fact about the Space that the person can read and act on;
 * "that is not the Space you were proved to be in" is a form carrying something
 * nobody typed. Telling somebody their Space is full when the real answer is
 * that a hidden field was tampered with sends them to fix a Space that is fine.
 */
export type InvitationField =
  | "email"
  | "seat"
  | "space"
  | "inviter"
  | "invitation";

/**
 * Thrown when an Invitation cannot be sent or answered as asked.
 *
 * The same shape `UnusableSpaceError` and `UnrecordableMovementError` take: a
 * `field` the screen switches over exhaustively, so a rule added here without
 * deciding what a person is told about it is a type error rather than a blank
 * screen.
 */
export class UnusableInvitationError extends Error {
  readonly field: InvitationField;

  constructor(field: InvitationField, reason: string) {
    super(`This invitation cannot be used: ${reason}.`);
    this.name = "UnusableInvitationError";
    this.field = field;
  }
}

/**
 * An address written the one way this product stores and compares it.
 *
 * Google hands back whatever the person typed the day they made the account,
 * so "Ana@Example.COM" and "ana@example.com" arrive as two strings for one
 * mailbox. Every comparison in this module goes through here, which is what
 * makes an Invitation redeemable by the person it was actually sent to.
 */
export function normaliseEmail(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Whether the Space still has its seat to offer.
 *
 * Anyone seated holds one, and so does anyone invited and still deciding
 * (ADR-0017). Exported because the screen asks the same question in order to
 * decide whether to show the form at all: a control whose only outcome is a
 * refusal is a control that should not be on the screen, and the arithmetic
 * behind it must not be re-typed there to say so.
 */
export function hasFreeSeat(
  memberIds: readonly string[],
  pending: readonly Invitation[],
): boolean {
  return memberIds.length + pending.length < MAX_SPACE_MEMBERS;
}

/**
 * The Invitations still holding a seat, whoever they are for.
 *
 * `invitationsAddressedTo` answers "is this one mine", which is the question a
 * reader asks. A Space asks a different one — "what have I got out on offer" —
 * and the address is no part of it.
 */
export function pendingInvitations(
  invitations: readonly Invitation[],
): readonly Invitation[] {
  return invitations.filter((invitation) => invitation.status === "pending");
}

/**
 * A Member's answers become an Invitation into a Space they are really in.
 *
 * The order of the refusals is the order they matter in: a Space with no free
 * seat has nothing to do with what was typed in the box, so it is refused
 * before the address is even looked at.
 */
export function inviteToSpace(
  draft: { spaceId: string; email: string },
  inviting: Inviting,
): NewInvitation {
  if (draft.spaceId !== inviting.space.id) {
    throw new UnusableInvitationError(
      "space",
      `it names Space ${draft.spaceId} and the Member was proved to be in ${inviting.space.id}`,
    );
  }

  if (!inviting.memberIds.includes(inviting.invitedBy)) {
    throw new UnusableInvitationError(
      "inviter",
      `${inviting.invitedBy} is not a Member of this Space`,
    );
  }

  // A pending Invitation is a seat somebody is already holding. This is the
  // rule ADR-0017 is about.
  if (!hasFreeSeat(inviting.memberIds, inviting.pending)) {
    throw new UnusableInvitationError(
      "seat",
      `this Space already holds its ${MAX_SPACE_MEMBERS} Members, counting anyone invited and not yet answered`,
    );
  }

  const email = address(draft.email);

  if (inviting.memberEmails.map(normaliseEmail).includes(email)) {
    throw new UnusableInvitationError(
      "email",
      `${email} is already a Member of this Space`,
    );
  }

  return {
    spaceId: inviting.space.id,
    email,
    // From the session, never from the draft, which has nowhere to say it.
    invitedBy: inviting.invitedBy,
    status: "pending",
  };
}

/**
 * Deliberately not an RFC parser.
 *
 * The address is only ever worth anything if Google later hands back the same
 * one, so Google is the real judge of whether a mailbox exists. What this
 * refuses is the answers that are certainly not addresses — a name, half of
 * one, a sentence — because those are typos a person can fix while they are
 * still looking at the field, and an Invitation to `ana` is one that silently
 * never arrives.
 */
function address(proposed: string): string {
  const email = normaliseEmail(proposed);

  if (email === "") {
    throw new UnusableInvitationError("email", "it names no address");
  }
  if (email.length > MAX_EMAIL_LENGTH) {
    throw new UnusableInvitationError(
      "email",
      `an address cannot be longer than ${MAX_EMAIL_LENGTH} characters`,
    );
  }
  // One @, something either side of it, a dot in the domain, and no spaces
  // anywhere. Everything past that is Google's to decide.
  if (!/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(email)) {
    throw new UnusableInvitationError(
      "email",
      `"${proposed.trim()}" is not an email address`,
    );
  }

  return email;
}

/**
 * A pending Invitation becomes the Member who was invited taking the seat.
 *
 * The address is the whole of who this was for. Without that comparison, any
 * signed-in person holding the identifier walks into somebody else's money —
 * which is the same reason `spaceVisibleTo` decides membership over rows
 * rather than trusting whoever asked.
 */
export function acceptInvitation(
  invitation: Invitation,
  accepting: Accepting,
): Invitation {
  stillOpen(invitation);

  if (invitation.email !== normaliseEmail(accepting.email)) {
    throw new UnusableInvitationError(
      "invitation",
      `it was sent to ${invitation.email}, which is not this Member's address`,
    );
  }

  if (accepting.memberIds.includes(accepting.memberId)) {
    throw new UnusableInvitationError(
      "invitation",
      "this Member is already in the Space",
    );
  }

  // An Invitation reserves a seat, but it can sit unanswered for months, and
  // the seat can be freed and filled another way in the meantime. Counted
  // again here, over the Space as it is now, rather than trusting the reserve
  // that was made when it was sent.
  if (!hasFreeSeat(accepting.memberIds, [])) {
    throw new UnusableInvitationError(
      "seat",
      `this Space already holds its ${MAX_SPACE_MEMBERS} Members`,
    );
  }

  return { ...invitation, status: "accepted" };
}

/**
 * The person invited says no. The seat is free again, and the row says which
 * of the two ways it was freed.
 */
export function declineInvitation(
  invitation: Invitation,
  by: { email: string },
): Invitation {
  stillOpen(invitation);

  if (invitation.email !== normaliseEmail(by.email)) {
    throw new UnusableInvitationError(
      "invitation",
      `it was sent to ${invitation.email}, which is not this Member's address`,
    );
  }

  return { ...invitation, status: "declined" };
}

/**
 * The Space takes the Invitation back — a mistyped address, or a change of
 * mind — and the seat is free again.
 *
 * Any Member of the Space may do it and not only whoever sent it: inside a
 * Space the money is one pot and so is the second seat, the same reason any
 * Member may strike out any Movement (ADR-0015). Without this, one typo holds
 * the seat forever and the Space can never be shared at all.
 */
export function revokeInvitation(
  invitation: Invitation,
  by: { memberIds: readonly string[]; by: string },
): Invitation {
  stillOpen(invitation);

  if (!by.memberIds.includes(by.by)) {
    throw new UnusableInvitationError(
      "inviter",
      `${by.by} is not a Member of this Space`,
    );
  }

  return { ...invitation, status: "revoked" };
}

/**
 * The Invitations waiting for a person, out of whatever was handed in.
 *
 * The order given is the order kept, the way `spacesVisibleTo` keeps it:
 * which Invitation comes first is a question about how they were fetched and
 * not a rule of the model.
 */
export function invitationsAddressedTo(
  email: string,
  invitations: readonly Invitation[],
): readonly Invitation[] {
  const mailbox = normaliseEmail(email);

  return pendingInvitations(invitations).filter(
    (invitation) => invitation.email === mailbox,
  );
}

/**
 * An Invitation can be answered once. Written here rather than three times,
 * because three copies of "it is still open" is three places for one of them
 * to stop checking.
 */
function stillOpen(invitation: Invitation): void {
  if (invitation.status !== "pending") {
    throw new UnusableInvitationError(
      "invitation",
      `it was already ${invitation.status}`,
    );
  }
}
