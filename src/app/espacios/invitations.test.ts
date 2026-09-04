import { describe, expect, it, vi } from "vitest";
import {
  UnusableInvitationError,
  type Invitation,
} from "@/domain/space/invitation";
import type { Space } from "@/domain/space/space";
import {
  handleAcceptInvitation,
  handleDeclineInvitation,
  handleInvite,
  handleRevokeInvitation,
  invitationRefusalMessage,
  type InvitationPorts,
} from "./invitations";

const CASA: Space = { id: "space-casa", name: "Casa", currency: "ARS" };
const GIAN = "member-gian";

const SENT: Invitation = {
  id: "invitation-1",
  spaceId: CASA.id,
  email: "ana@example.com",
  invitedBy: GIAN,
  status: "pending",
};

const ports = (changes: Partial<InvitationPorts> = {}): InvitationPorts => ({
  readSession: async () => ({ memberId: GIAN }),
  findSpace: async () => CASA,
  invite: async () => SENT,
  revoke: async () => true,
  accept: async () => CASA,
  decline: async () => true,
  ...changes,
});

describe("inviting from the Space's screen", () => {
  it("sends it, once the Member has been proved to be in the Space", async () => {
    const outcome = await handleInvite(ports(), CASA.id, "ana@example.com");

    expect(outcome).toEqual({ kind: "invited", invitation: SENT });
  });

  it("sends it as the Member the session names and nobody else", async () => {
    const invite = vi.fn(async () => SENT);

    await handleInvite(
      ports({ readSession: async () => ({ memberId: "member-ana" }), invite }),
      CASA.id,
      "beto@example.com",
    );

    expect(invite).toHaveBeenCalledWith(CASA, "member-ana", "beto@example.com");
  });

  it("refuses a Member with no session", async () => {
    const outcome = await handleInvite(
      ports({ readSession: async () => null }),
      CASA.id,
      "ana@example.com",
    );

    expect(outcome).toEqual({ kind: "not-signed-in" });
  });

  it("refuses a Space this Member is not in, without saying it exists", async () => {
    // Membership is asked again here, on a Space the form named: the GET that
    // rendered the screen proved it, but a form field is a claim.
    const outcome = await handleInvite(
      ports({ findSpace: async () => null }),
      "space-de-otro",
      "ana@example.com",
    );

    expect(outcome).toEqual({ kind: "no-such-space" });
  });

  it("hands the screen the field that was the bad one", async () => {
    const outcome = await handleInvite(
      ports({
        invite: async () => {
          throw new UnusableInvitationError("email", "it names no address");
        },
      }),
      CASA.id,
      "   ",
    );

    expect(outcome).toEqual({ kind: "rejected", field: "email" });
  });

  it("keeps a dropped connection apart from a typo", async () => {
    const outcome = await handleInvite(
      ports({
        invite: async () => {
          throw new Error("the connection went away");
        },
      }),
      CASA.id,
      "ana@example.com",
    );

    expect(outcome).toMatchObject({ kind: "failed" });
  });
});

describe("taking an invitation back", () => {
  it("takes it back, and says so", async () => {
    const outcome = await handleRevokeInvitation(ports(), CASA.id, SENT.id);

    expect(outcome).toEqual({ kind: "revoked" });
  });

  it("reads an invitation this Space does not have as one that never existed", async () => {
    const outcome = await handleRevokeInvitation(
      ports({ revoke: async () => false }),
      CASA.id,
      "invitation-de-otro",
    );

    expect(outcome).toEqual({ kind: "no-such-invitation" });
  });
});

describe("answering an invitation from the Space list", () => {
  it("seats the Member and hands back the Space they just joined", async () => {
    const outcome = await handleAcceptInvitation(ports(), SENT.id);

    expect(outcome).toEqual({ kind: "joined", space: CASA });
  });

  it("proves nothing about a Space first, because the invitation is the proof", async () => {
    // The person accepting is by definition not in the Space yet, so asking
    // `findSpace` would refuse every acceptance there has ever been.
    const findSpace = vi.fn(async () => null);

    const outcome = await handleAcceptInvitation(
      ports({ findSpace }),
      SENT.id,
    );

    expect(findSpace).not.toHaveBeenCalled();
    expect(outcome).toEqual({ kind: "joined", space: CASA });
  });

  it("reads an invitation addressed to somebody else as one that never existed", async () => {
    const outcome = await handleAcceptInvitation(
      ports({ accept: async () => null }),
      SENT.id,
    );

    expect(outcome).toEqual({ kind: "no-such-invitation" });
  });

  it("says which rule refused a seat that is no longer free", async () => {
    const outcome = await handleAcceptInvitation(
      ports({
        accept: async () => {
          throw new UnusableInvitationError("space", "it already holds two");
        },
      }),
      SENT.id,
    );

    expect(outcome).toEqual({ kind: "rejected", field: "space" });
  });

  it("turns one down", async () => {
    expect(await handleDeclineInvitation(ports(), SENT.id)).toEqual({
      kind: "declined",
    });
  });

  it("refuses to answer at all with no session", async () => {
    const noSession = ports({ readSession: async () => null });

    expect(await handleAcceptInvitation(noSession, SENT.id)).toEqual({
      kind: "not-signed-in",
    });
    expect(await handleDeclineInvitation(noSession, SENT.id)).toEqual({
      kind: "not-signed-in",
    });
  });
});

describe("what a refused invitation says on the screen", () => {
  it("says something a person can act on for every way it can fail", () => {
    const refusals = [
      { kind: "not-signed-in" },
      { kind: "no-such-space" },
      { kind: "no-such-invitation" },
      { kind: "failed", cause: new Error("boom") },
      { kind: "rejected", field: "email" },
      { kind: "rejected", field: "space" },
      { kind: "rejected", field: "inviter" },
      { kind: "rejected", field: "invitation" },
    ] as const;

    for (const refusal of refusals) {
      expect(invitationRefusalMessage(refusal)).not.toBe("");
    }
  });

  it("never blames a field for a dropped connection", () => {
    // "The address is wrong" about a database that went away sends somebody to
    // correct a field that was never the problem.
    expect(invitationRefusalMessage({ kind: "failed", cause: null })).not.toBe(
      invitationRefusalMessage({ kind: "rejected", field: "email" }),
    );
  });
});
