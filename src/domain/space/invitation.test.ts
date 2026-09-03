import { describe, expect, it } from "vitest";
import type { Space } from "./space";
import {
  MAX_SPACE_MEMBERS,
  UnusableInvitationError,
  acceptInvitation,
  declineInvitation,
  hasFreeSeat,
  invitationsAddressedTo,
  inviteToSpace,
  revokeInvitation,
  type Accepting,
  type Inviting,
} from "./invitation";

const CASA: Space = {
  id: "3f2b0c1e-0000-4000-8000-0000000000ca",
  name: "Casa",
  currency: "ARS",
};

const GIAN = "3f2b0c1e-0000-4000-8000-000000000001";
const ANA = "3f2b0c1e-0000-4000-8000-000000000002";

const inviting = (changes: Partial<Inviting> = {}): Inviting => ({
  space: CASA,
  invitedBy: GIAN,
  memberIds: [GIAN],
  memberEmails: ["gian@example.com"],
  pending: [],
  ...changes,
});

describe("inviting someone to a Space", () => {
  it("addresses the invitation to the Space and the address it was given", () => {
    const invitation = inviteToSpace(
      { spaceId: CASA.id, email: "ana@example.com" },
      inviting(),
    );

    expect(invitation).toEqual({
      spaceId: CASA.id,
      email: "ana@example.com",
      invitedBy: GIAN,
      status: "pending",
    });
  });

  it("writes the address down in one shape, so a sign-in can be matched to it", () => {
    // Google hands back whatever the person typed the day they made the
    // account. "Ana@Example.COM " and "ana@example.com" are one mailbox, and
    // an invitation only two of those three strings can redeem is an
    // invitation that silently never arrives.
    const invitation = inviteToSpace(
      { spaceId: CASA.id, email: "  Ana@Example.COM  " },
      inviting(),
    );

    expect(invitation.email).toBe("ana@example.com");
  });

  it("refuses an invitation to no address at all", () => {
    expect(() =>
      inviteToSpace({ spaceId: CASA.id, email: "   " }, inviting()),
    ).toThrow(UnusableInvitationError);
  });

  it("refuses something that is not an address", () => {
    for (const notAnAddress of [
      "ana",
      "ana@",
      "@example.com",
      "ana@example",
      "ana example@example.com",
      "ana@@example.com",
    ]) {
      expect(() =>
        inviteToSpace({ spaceId: CASA.id, email: notAnAddress }, inviting()),
      ).toThrow(UnusableInvitationError);
    }
  });

  it("refuses an invitation from someone who is not in the Space", () => {
    expect(() =>
      inviteToSpace(
        { spaceId: CASA.id, email: "ana@example.com" },
        inviting({ invitedBy: ANA, memberIds: [GIAN] }),
      ),
    ).toThrow(UnusableInvitationError);
  });

  it("refuses an invitation aimed at another Space than the one proved", () => {
    expect(() =>
      inviteToSpace(
        { spaceId: "3f2b0c1e-0000-4000-8000-0000000000ff", email: "a@b.com" },
        inviting(),
      ),
    ).toThrow(UnusableInvitationError);
  });

  it("refuses to invite someone who is already in the Space", () => {
    expect(() =>
      inviteToSpace(
        { spaceId: CASA.id, email: "Gian@Example.com" },
        inviting(),
      ),
    ).toThrow(UnusableInvitationError);
  });

  it("refuses a second Member once the Space already holds two", () => {
    expect(() =>
      inviteToSpace(
        { spaceId: CASA.id, email: "tercero@example.com" },
        inviting({
          memberIds: [GIAN, ANA],
          memberEmails: ["gian@example.com", "ana@example.com"],
        }),
      ),
    ).toThrow(UnusableInvitationError);
  });

  it("refuses a second invitation while one is still pending, because the seat is taken", () => {
    // A pending invitation holds the seat. Without this, three invitations go
    // out, and whichever two people happen to sign in first take the Space --
    // a race nobody asked for and nobody can see.
    expect(() =>
      inviteToSpace(
        { spaceId: CASA.id, email: "otra@example.com" },
        inviting({
          pending: [
            {
              id: "3f2b0c1e-0000-4000-8000-00000000000a",
              spaceId: CASA.id,
              email: "ana@example.com",
              invitedBy: GIAN,
              status: "pending",
            },
          ],
        }),
      ),
    ).toThrow(UnusableInvitationError);
  });

  it("says a Space holds two Members, which is what the seat is counted against", () => {
    expect(MAX_SPACE_MEMBERS).toBe(2);
  });
});

const PENDING = {
  id: "3f2b0c1e-0000-4000-8000-00000000000a",
  spaceId: CASA.id,
  email: "ana@example.com",
  invitedBy: GIAN,
  status: "pending",
} as const;

describe("accepting an invitation", () => {
  const accepting = (changes: Partial<Accepting> = {}): Accepting => ({
    memberId: ANA,
    email: "ana@example.com",
    memberIds: [GIAN],
    ...changes,
  });

  it("takes the seat, and says so on the invitation rather than losing the row", () => {
    expect(acceptInvitation(PENDING, accepting())).toEqual({
      ...PENDING,
      status: "accepted",
    });
  });

  it("matches the address however the person's Google account writes it", () => {
    expect(
      acceptInvitation(PENDING, accepting({ email: " Ana@Example.COM " }))
        .status,
    ).toBe("accepted");
  });

  it("refuses a Member whose address is not the one invited", () => {
    // The whole of who an invitation is for. Without this, any signed-in
    // person holding the identifier walks into somebody else's money.
    expect(() =>
      acceptInvitation(PENDING, accepting({ email: "otro@example.com" })),
    ).toThrow(UnusableInvitationError);
  });

  it("refuses an invitation that was already answered", () => {
    for (const status of ["accepted", "declined", "revoked"] as const) {
      expect(() =>
        acceptInvitation({ ...PENDING, status }, accepting()),
      ).toThrow(UnusableInvitationError);
    }
  });

  it("refuses the seat if the Space filled up while the invitation sat there", () => {
    expect(() =>
      acceptInvitation(PENDING, accepting({ memberIds: [GIAN, "otro"] })),
    ).toThrow(UnusableInvitationError);
  });

  it("refuses someone who is somehow already in the Space, rather than seating them twice", () => {
    expect(() =>
      acceptInvitation(PENDING, accepting({ memberIds: [ANA] })),
    ).toThrow(UnusableInvitationError);
  });
});

describe("turning an invitation down", () => {
  it("says no, and the row says who it was that said it", () => {
    expect(declineInvitation(PENDING, { email: "ANA@example.com" })).toEqual({
      ...PENDING,
      status: "declined",
    });
  });

  it("refuses a no from anyone but the person invited", () => {
    expect(() =>
      declineInvitation(PENDING, { email: "otro@example.com" }),
    ).toThrow(UnusableInvitationError);
  });

  it("refuses a no to an invitation already answered", () => {
    expect(() =>
      declineInvitation({ ...PENDING, status: "accepted" }, {
        email: "ana@example.com",
      }),
    ).toThrow(UnusableInvitationError);
  });
});

describe("taking an invitation back", () => {
  it("frees the seat, and the row says it was taken back rather than turned down", () => {
    expect(revokeInvitation(PENDING, { memberIds: [GIAN], by: GIAN })).toEqual({
      ...PENDING,
      status: "revoked",
    });
  });

  it("lets either Member of the Space take it back, not only whoever sent it", () => {
    // Inside a Space the money is one pot, and so is the second seat. The
    // same reason any Member may strike out any Movement (ADR-0015).
    expect(
      revokeInvitation(PENDING, { memberIds: [GIAN, ANA], by: ANA }).status,
    ).toBe("revoked");
  });

  it("refuses a withdrawal from outside the Space", () => {
    expect(() =>
      revokeInvitation(PENDING, { memberIds: [GIAN], by: "extraño" }),
    ).toThrow(UnusableInvitationError);
  });

  it("refuses to take back an invitation already answered", () => {
    expect(() =>
      revokeInvitation({ ...PENDING, status: "declined" }, {
        memberIds: [GIAN],
        by: GIAN,
      }),
    ).toThrow(UnusableInvitationError);
  });
});

describe("the invitations waiting for a person", () => {
  const forOtro = { ...PENDING, id: "otra", email: "otro@example.com" };

  it("hands back the pending ones addressed to them and nobody else's", () => {
    expect(
      invitationsAddressedTo("ana@example.com", [PENDING, forOtro]),
    ).toEqual([PENDING]);
  });

  it("matches however their Google account writes the address", () => {
    expect(invitationsAddressedTo(" Ana@Example.COM ", [PENDING])).toEqual([
      PENDING,
    ]);
  });

  it("leaves out the ones already answered, so nothing answered comes back", () => {
    expect(
      invitationsAddressedTo("ana@example.com", [
        { ...PENDING, status: "accepted" },
        { ...PENDING, id: "b", status: "declined" },
        { ...PENDING, id: "c", status: "revoked" },
      ]),
    ).toEqual([]);
  });

  it("keeps the order it was handed, the way `spacesVisibleTo` does", () => {
    const second = { ...PENDING, id: "segunda" };

    expect(
      invitationsAddressedTo("ana@example.com", [second, PENDING]),
    ).toEqual([second, PENDING]);
  });
});

describe("which answer a refusal points at", () => {
  // Two refusals that used to be one. "There is no room" is a fact about the
  // Space somebody can read; "that is not your Space" is a form carrying
  // something nobody typed, and telling them their Space is full would send
  // them to fix a Space that is fine.
  const fieldOf = (act: () => unknown) => {
    try {
      act();
    } catch (error) {
      return error instanceof UnusableInvitationError ? error.field : null;
    }
    return null;
  };

  it("blames the seat when the Space has no room", () => {
    expect(
      fieldOf(() =>
        inviteToSpace(
          { spaceId: CASA.id, email: "tercero@example.com" },
          inviting({ memberIds: [GIAN, ANA] }),
        ),
      ),
    ).toBe("seat");
  });

  it("blames the seat when it filled up before the invitation was answered", () => {
    expect(
      fieldOf(() =>
        acceptInvitation(PENDING, {
          memberId: ANA,
          email: "ana@example.com",
          memberIds: [GIAN, "otro"],
        }),
      ),
    ).toBe("seat");
  });

  it("blames the Space when the form named a different one", () => {
    expect(
      fieldOf(() =>
        inviteToSpace(
          { spaceId: "3f2b0c1e-0000-4000-8000-0000000000ff", email: "a@b.com" },
          inviting(),
        ),
      ),
    ).toBe("space");
  });
});

describe("the seat a Space has to offer", () => {
  it("is free while nobody is seated in it and nobody was offered it", () => {
    expect(hasFreeSeat([GIAN], [])).toBe(true);
  });

  it("is taken by a second Member", () => {
    expect(hasFreeSeat([GIAN, ANA], [])).toBe(false);
  });

  it("is taken by an invitation nobody has answered yet", () => {
    expect(hasFreeSeat([GIAN], [PENDING])).toBe(false);
  });
});
