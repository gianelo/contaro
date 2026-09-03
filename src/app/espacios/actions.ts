"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { database } from "@/db/client";
import {
  acceptInvitationAsMember,
  declineInvitationAsMember,
  inviteToSpaceByEmail,
  revokeInvitationInSpace,
} from "@/db/invitations";
import { findSpaceForMember } from "@/db/spaces";
import { answer } from "@/app/form";
import { report } from "@/app/report";
import {
  handleAcceptInvitation,
  handleDeclineInvitation,
  handleInvite,
  handleRevokeInvitation,
  invitationRefusalMessage,
  type InvitationFormState,
  type InvitationPorts,
} from "./invitations";

/**
 * All the behaviour is in `invitations.ts`, which is driven directly by tests.
 * This only says where a session, a Space and a store come from in production,
 * and where a Member goes once the seat is offered or taken.
 *
 * At `/espacios` and not inside `[id]/miembros/`, because two screens use
 * these and this is the one place both are under: the Space offers the seat
 * and the Space list is where the person invited answers. A module the list
 * reached for through `./[id]/miembros/` would be a path lying about what it
 * is.
 */
async function ports(): Promise<InvitationPorts> {
  return {
    readSession: async () => {
      const session = await auth();
      return session ? { memberId: session.user.id } : null;
    },
    findSpace: (id, memberId) => findSpaceForMember(database(), id, memberId),
    invite: (space, invitedBy, email) =>
      inviteToSpaceByEmail(database(), { space, invitedBy }, email),
    revoke: (space, by, invitationId) =>
      revokeInvitationInSpace(database(), space, by, invitationId),
    accept: (memberId, invitationId) =>
      acceptInvitationAsMember(database(), memberId, invitationId),
    decline: (memberId, invitationId) =>
      declineInvitationAsMember(database(), memberId, invitationId),
  };
}

export async function inviteAction(
  _previous: InvitationFormState,
  form: FormData,
): Promise<InvitationFormState> {
  const spaceId = answer(form, "spaceId");

  const outcome = await handleInvite(
    await ports(),
    spaceId,
    // Passed through raw, the way a Movement's amount is: normalising an
    // address here would mean two places decide what one is, and the domain
    // is where a claim becomes a fact.
    answer(form, "email"),
  );

  report("Inviting a Member", outcome);

  if (outcome.kind === "invited") {
    // Outside the handler's try on purpose: redirect works by throwing, so
    // catching around it would swallow the navigation. Back to the screen
    // that now shows the seat as taken.
    redirect(members(spaceId));
  }

  return { error: invitationRefusalMessage(outcome) };
}

export async function revokeInvitationAction(
  _previous: InvitationFormState,
  form: FormData,
): Promise<InvitationFormState> {
  const spaceId = answer(form, "spaceId");

  const outcome = await handleRevokeInvitation(
    await ports(),
    spaceId,
    answer(form, "invitationId"),
  );

  report("Taking an invitation back", outcome);

  if (outcome.kind === "revoked") {
    redirect(members(spaceId));
  }

  return { error: invitationRefusalMessage(outcome) };
}

export async function acceptInvitationAction(
  _previous: InvitationFormState,
  form: FormData,
): Promise<InvitationFormState> {
  const outcome = await handleAcceptInvitation(
    await ports(),
    answer(form, "invitationId"),
  );

  report("Accepting an invitation", outcome);

  if (outcome.kind === "joined") {
    // Into the Space, and not back to the list. Somebody who just said yes to
    // sharing money wants to see the money.
    redirect(`/espacios/${outcome.space.id}`);
  }

  return { error: invitationRefusalMessage(outcome) };
}

export async function declineInvitationAction(
  _previous: InvitationFormState,
  form: FormData,
): Promise<InvitationFormState> {
  const outcome = await handleDeclineInvitation(
    await ports(),
    answer(form, "invitationId"),
  );

  report("Turning an invitation down", outcome);

  if (outcome.kind === "declined") {
    // The list, which no longer has it on it.
    redirect("/espacios");
  }

  return { error: invitationRefusalMessage(outcome) };
}


/** The Space's Members screen, said in one place so three redirects cannot drift. */
function members(spaceId: string): string {
  return `/espacios/${spaceId}/miembros`;
}
