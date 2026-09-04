import type { ReadSession } from "@/auth/session";
import {
  UnusableInvitationError,
  type Invitation,
  type InvitationField,
} from "@/domain/space/invitation";
import type { Space } from "@/domain/space/space";
import { t } from "@/i18n";

/**
 * Everything these handlers need from the world outside them, as functions.
 *
 * The seam #9 is proven at, and the same one #7 is: a session, a Space and a
 * store arrive as arguments, so the whole path — an address typed into a box,
 * through to a second Member or a refusal — is driven in milliseconds with no
 * server, no database and no Google account.
 */
export type InvitationPorts = {
  readSession: ReadSession;
  findSpace: (spaceId: string, memberId: string) => Promise<Space | null>;
  invite: (
    space: Space,
    invitedBy: string,
    email: string,
  ) => Promise<Invitation>;
  revoke: (
    space: Space,
    by: string,
    invitationId: string,
  ) => Promise<boolean>;
  /** The Space joined, or nothing if the invitation was never this Member's. */
  accept: (memberId: string, invitationId: string) => Promise<Space | null>;
  decline: (memberId: string, invitationId: string) => Promise<boolean>;
};

/** The seat is on offer, and the Space's screen can say to whom. */
export type Invited = { kind: "invited"; invitation: Invitation };

/** The offer is withdrawn and the seat is free again. */
export type Revoked = { kind: "revoked" };

/** The seat is taken, and this is the Space it was in. */
export type Joined = { kind: "joined"; space: Space };

/** The offer was turned down. */
export type Declined = { kind: "declined" };

/**
 * Every way this can fail to happen, each one something a screen can act on.
 *
 * Apart from the four successes rather than one union with them, for the
 * reason `Refusal` in `record.ts` is: an action that can only revoke cannot be
 * handed a Space, and one that can only accept cannot be handed a withdrawal.
 */
export type InvitationRefusal =
  | { kind: "rejected"; field: InvitationField }
  | { kind: "not-signed-in" }
  | { kind: "no-such-space" }
  | { kind: "no-such-invitation" }
  | { kind: "failed"; cause: unknown };

/**
 * What a screen knows after a submission: nothing, or why it was refused.
 *
 * Here rather than beside the action itself, for the reason
 * `MovementFormState` is: a "use server" module may export async functions and
 * nothing else.
 */
export type InvitationFormState = { error: string | null };

export const nothingWrongYet: InvitationFormState = { error: null };

/**
 * A Member offers their Space's second seat to an address.
 *
 * Membership is asked again here, on a Space the form named. The GET that
 * rendered the screen proved it, but a form field is a claim: without this,
 * the Space someone invites into is the Space whose identifier they guessed.
 */
export async function handleInvite(
  ports: InvitationPorts,
  spaceId: string,
  email: string,
): Promise<Invited | InvitationRefusal> {
  return inSpace(ports, spaceId, async (space, memberId) => ({
    kind: "invited",
    invitation: await ports.invite(space, memberId, email),
  }));
}

/**
 * The Space takes its offer back — a mistyped address, or a change of mind.
 *
 * Without it one typo holds the seat forever and the Space can never be
 * shared at all, which is the price of a pending invitation reserving it
 * (ADR-0017).
 */
export async function handleRevokeInvitation(
  ports: InvitationPorts,
  spaceId: string,
  invitationId: string,
): Promise<Revoked | InvitationRefusal> {
  return inSpace(ports, spaceId, async (space, memberId) => {
    const revoked = await ports.revoke(space, memberId, invitationId);
    // Not found rather than forbidden: an invitation belonging to another
    // Space must read the same as one that never existed.
    return revoked ? { kind: "revoked" } : { kind: "no-such-invitation" };
  });
}

/**
 * The person a seat was offered to takes it.
 *
 * Nothing is proved about the Space first, and nothing can be: whoever is
 * accepting is by definition not in it yet, so asking `findSpace` would refuse
 * every acceptance there has ever been. The invitation is the proof — it
 * carries the address, and the store hands one back only to the Member whose
 * own verified address is written on it.
 */
export async function handleAcceptInvitation(
  ports: InvitationPorts,
  invitationId: string,
): Promise<Joined | InvitationRefusal> {
  return asMember(ports, async (memberId) => {
    const space = await ports.accept(memberId, invitationId);
    return space ? { kind: "joined", space } : { kind: "no-such-invitation" };
  });
}

/** The person a seat was offered to says no, and the offer is closed. */
export async function handleDeclineInvitation(
  ports: InvitationPorts,
  invitationId: string,
): Promise<Declined | InvitationRefusal> {
  return asMember(ports, async (memberId) => {
    const declined = await ports.decline(memberId, invitationId);
    return declined ? { kind: "declined" } : { kind: "no-such-invitation" };
  });
}

/**
 * Who is asking, and whether they are in this Space. Written once because it
 * is one rule, the way `inSpace` in `record.ts` is.
 */
async function inSpace<Done>(
  ports: InvitationPorts,
  spaceId: string,
  act: (space: Space, memberId: string) => Promise<Done | InvitationRefusal>,
): Promise<Done | InvitationRefusal> {
  return asMember(ports, async (memberId) => {
    const space = await ports.findSpace(spaceId, memberId);

    // Not found rather than forbidden, the way `currentSpace` refuses.
    if (space === null) {
      return { kind: "no-such-space" };
    }

    return act(space, memberId);
  });
}

/**
 * Who is asking, and nothing else — which is all accepting needs.
 *
 * The refusal for a bad answer is caught here rather than in each handler, so
 * a rule added to the domain reaches every screen that can trip it.
 */
async function asMember<Done>(
  ports: InvitationPorts,
  act: (memberId: string) => Promise<Done | InvitationRefusal>,
): Promise<Done | InvitationRefusal> {
  const session = await ports.readSession();

  if (session === null) {
    return { kind: "not-signed-in" };
  }

  try {
    return await act(session.memberId);
  } catch (error) {
    // A bad answer is the person's to fix and is named on the screen. Anything
    // else is ours, and saying "that is not an address" about a dropped
    // connection would send them to correct a field that was never the problem.
    if (error instanceof UnusableInvitationError) {
      return { kind: "rejected", field: error.field };
    }
    return { kind: "failed", cause: error };
  }
}

/**
 * What a refused invitation says on the screen.
 *
 * Kept beside the outcomes it maps, so adding an outcome without deciding what
 * a person is told about it is a type error rather than a blank screen.
 */
export function invitationRefusalMessage(
  refusal: InvitationRefusal,
): string {
  switch (refusal.kind) {
    case "not-signed-in":
      return t("members.error.signedOut");
    case "no-such-space":
      return t("members.error.space");
    case "no-such-invitation":
      return t("members.error.gone");
    case "failed":
      return t("members.error.failed");
    case "rejected":
      switch (refusal.field) {
        case "email":
          return t("members.error.email");
        case "seat":
          return t("members.error.full");
        case "space":
          // The form named a Space this Member was not proved to be in.
          // Nothing on the screen is the problem, so pointing at a field
          // would send them to fix the wrong thing.
          return t("members.error.space");
        case "inviter":
          // The Member sending it is not in the Space, which is the same
          // nothing-to-fix as above.
          return t("members.error.space");
        case "invitation":
          return t("members.error.gone");
      }
  }
}
