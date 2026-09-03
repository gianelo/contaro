// @vitest-environment node
import { afterAll, expect, it } from "vitest";
import { UnusableInvitationError } from "@/domain/space/invitation";
import { createDatabase, databaseUrl } from "./connection";
import {
  acceptInvitationAsMember,
  declineInvitationAsMember,
  inviteToSpaceByEmail,
  invitationsWaitingFor,
  pendingInvitationsInSpace,
  revokeInvitationInSpace,
} from "./invitations";
import { memberFromGoogle } from "./members";
import {
  createSpaceForMember,
  findSpaceForMember,
  membersOfSpace,
} from "./spaces";

// Run with `pnpm test:db`, which starts Postgres first.
const { db, sql } = createDatabase(databaseUrl(), { max: 1 });

afterAll(async () => {
  await sql.end();
});

/** The database outlives a run, so every test invents its own people. */
let next = 0;
const aMember = async (name: string) => {
  const unique = `invites-${process.pid}-${Date.now()}-${next++}`;
  return memberFromGoogle(db, {
    subject: unique,
    email: `${unique}@example.com`,
    name,
  });
};

const aSpace = async (creatorId: string, name = "Casa") =>
  createSpaceForMember(db, creatorId, { name, currency: "ARS" });

it("sends an invitation to an address, and the Space can see it waiting", async () => {
  const ana = await aMember("Ana");
  const casa = await aSpace(ana.id);

  await inviteToSpaceByEmail(db, { space: casa, invitedBy: ana.id }, "Beto@Example.com");

  const pending = await pendingInvitationsInSpace(db, casa.id);

  expect(pending).toEqual([
    {
      invitation: expect.objectContaining({
        spaceId: casa.id,
        email: "beto@example.com",
        invitedBy: ana.id,
        status: "pending",
      }),
      invitedByName: "Ana",
    },
  ]);
});

it("shows the invitation to the person it names, with the Space it is for", async () => {
  const cami = await aMember("Cami");
  const dani = await aMember("Dani");
  const casa = await aSpace(cami.id, "Depto");

  await inviteToSpaceByEmail(db, { space: casa, invitedBy: cami.id }, dani.email);

  const waiting = await invitationsWaitingFor(db, dani.id);

  expect(waiting).toEqual([
    {
      invitation: expect.objectContaining({ spaceId: casa.id, status: "pending" }),
      invitedByName: "Cami",
      space: casa,
    },
  ]);
});

it("shows nothing to somebody else's address", async () => {
  const eli = await aMember("Eli");
  const fede = await aMember("Fede");
  const gaby = await aMember("Gaby");
  const casa = await aSpace(eli.id);

  await inviteToSpaceByEmail(db, { space: casa, invitedBy: eli.id }, fede.email);

  await expect(invitationsWaitingFor(db, gaby.id)).resolves.toEqual([]);
});

it("seats the person who accepts, and both Members then see the one Space", async () => {
  const hugo = await aMember("Hugo");
  const ines = await aMember("Ines");
  const casa = await aSpace(hugo.id);

  const [waiting] = await (async () => {
    await inviteToSpaceByEmail(db, { space: casa, invitedBy: hugo.id }, ines.email);
    return invitationsWaitingFor(db, ines.id);
  })();

  const joined = await acceptInvitationAsMember(db, ines.id, waiting!.invitation.id);

  expect(joined).toEqual(casa);
  await expect(findSpaceForMember(db, casa.id, ines.id)).resolves.toEqual(casa);
  await expect(findSpaceForMember(db, casa.id, hugo.id)).resolves.toEqual(casa);
  await expect(membersOfSpace(db, casa.id)).resolves.toEqual([
    { id: hugo.id, name: "Hugo" },
    { id: ines.id, name: "Ines" },
  ]);
});

it("frees nothing by accepting twice: the invitation was answered once", async () => {
  const juan = await aMember("Juan");
  const kari = await aMember("Kari");
  const casa = await aSpace(juan.id);

  await inviteToSpaceByEmail(db, { space: casa, invitedBy: juan.id }, kari.email);
  const [waiting] = await invitationsWaitingFor(db, kari.id);

  await acceptInvitationAsMember(db, kari.id, waiting!.invitation.id);

  // Answered, so it is no longer waiting for anyone and no longer acceptable.
  await expect(invitationsWaitingFor(db, kari.id)).resolves.toEqual([]);
  await expect(
    acceptInvitationAsMember(db, kari.id, waiting!.invitation.id),
  ).resolves.toBeNull();
});

it("does not let a Member accept an invitation addressed to somebody else", async () => {
  const lucas = await aMember("Lucas");
  const mara = await aMember("Mara");
  const nico = await aMember("Nico");
  const casa = await aSpace(lucas.id);

  await inviteToSpaceByEmail(db, { space: casa, invitedBy: lucas.id }, mara.email);
  const [waiting] = await invitationsWaitingFor(db, mara.id);

  // No such invitation rather than forbidden, the way a Space someone is not
  // in is not found: knowing the identifier must buy nothing.
  await expect(
    acceptInvitationAsMember(db, nico.id, waiting!.invitation.id),
  ).resolves.toBeNull();
  await expect(findSpaceForMember(db, casa.id, nico.id)).resolves.toBeNull();
});

it("frees the seat when the person says no, so the Space can invite somebody else", async () => {
  const olga = await aMember("Olga");
  const pablo = await aMember("Pablo");
  const rita = await aMember("Rita");
  const casa = await aSpace(olga.id);

  await inviteToSpaceByEmail(db, { space: casa, invitedBy: olga.id }, pablo.email);
  const [waiting] = await invitationsWaitingFor(db, pablo.id);

  await expect(
    declineInvitationAsMember(db, pablo.id, waiting!.invitation.id),
  ).resolves.toBe(true);

  await expect(pendingInvitationsInSpace(db, casa.id)).resolves.toEqual([]);
  await expect(
    inviteToSpaceByEmail(db, { space: casa, invitedBy: olga.id }, rita.email),
  ).resolves.toMatchObject({ email: rita.email, status: "pending" });
});

it("frees the seat when the Space takes the invitation back, which is what a typo needs", async () => {
  const sofi = await aMember("Sofi");
  const tomas = await aMember("Tomas");
  const casa = await aSpace(sofi.id);

  await inviteToSpaceByEmail(db, { space: casa, invitedBy: sofi.id }, "typo@example.com");
  const [pending] = await pendingInvitationsInSpace(db, casa.id);

  await expect(
    revokeInvitationInSpace(db, casa, sofi.id, pending!.invitation.id),
  ).resolves.toBe(true);

  await expect(pendingInvitationsInSpace(db, casa.id)).resolves.toEqual([]);
  await expect(
    inviteToSpaceByEmail(db, { space: casa, invitedBy: sofi.id }, tomas.email),
  ).resolves.toMatchObject({ status: "pending" });
});

it("refuses a second invitation while one is still waiting, because the seat is held", async () => {
  const uma = await aMember("Uma");
  const casa = await aSpace(uma.id);

  await inviteToSpaceByEmail(db, { space: casa, invitedBy: uma.id }, "primera@example.com");

  await expect(
    inviteToSpaceByEmail(db, { space: casa, invitedBy: uma.id }, "segunda@example.com"),
  ).rejects.toThrow(UnusableInvitationError);
});

it("refuses a third Member however the row is written", async () => {
  const vera = await aMember("Vera");
  const wal = await aMember("Wal");
  const casa = await aSpace(vera.id);

  await inviteToSpaceByEmail(db, { space: casa, invitedBy: vera.id }, wal.email);
  const [waiting] = await invitationsWaitingFor(db, wal.id);
  await acceptInvitationAsMember(db, wal.id, waiting!.invitation.id);

  // Straight at the table, past every rule the domain holds. A Space holds two
  // Members, and the trigger in migration 0006 is what makes that true of the
  // database and not only of the code that usually writes to it.
  const extra = await aMember("Extra");
  await expect(
    sql`INSERT INTO space_members (space_id, member_id) VALUES (${casa.id}, ${extra.id})`,
  ).rejects.toThrow(/two Members at most/);
});

it("refuses an invitation sent by someone outside the Space, however the row is written", async () => {
  const xime = await aMember("Xime");
  const yago = await aMember("Yago");
  const casa = await aSpace(xime.id);

  await expect(
    sql`INSERT INTO space_invitations (space_id, email, invited_by)
        VALUES (${casa.id}, 'quien@example.com', ${yago.id})`,
  ).rejects.toThrow(/not a Member/);
});

it("refuses an address stored in a shape no sign-in could ever match", async () => {
  const zoe = await aMember("Zoe");
  const casa = await aSpace(zoe.id);

  await expect(
    sql`INSERT INTO space_invitations (space_id, email, invited_by)
        VALUES (${casa.id}, ' Gritado@EXAMPLE.com ', ${zoe.id})`,
  ).rejects.toThrow(/space_invitations_email_is_normalised/);
});

it("reads an invitation somebody took back mid-tap as one that is no longer there", async () => {
  // The race that used to come back as "we could not send the invitation" --
  // wrong about the act and wrong about the cause. Ana withdraws while Beto's
  // thumb is on Entrar; what Beto is owed is "that invitation is gone".
  const ana = await aMember("Ana Retira");
  const beto = await aMember("Beto Tarde");
  const casa = await aSpace(ana.id);

  await inviteToSpaceByEmail(db, { space: casa, invitedBy: ana.id }, beto.email);
  const [waiting] = await invitationsWaitingFor(db, beto.id);

  // Read by Beto's request, then answered by Ana's before his write lands.
  await revokeInvitationInSpace(db, casa, ana.id, waiting!.invitation.id);

  await expect(
    acceptInvitationAsMember(db, beto.id, waiting!.invitation.id),
  ).resolves.toBeNull();
  await expect(findSpaceForMember(db, casa.id, beto.id)).resolves.toBeNull();
});

it("matches an address however the Member's Google account writes it", async () => {
  // The invitation is stored normalised and the Member's record is not, so
  // the two only ever meet through `normaliseEmail`.
  const cami = await aMember("Cami Grita");
  const casa = await aSpace(cami.id);
  const shouty = await memberFromGoogle(db, {
    subject: `invites-shouty-${process.pid}-${Date.now()}`,
    email: `Gritado-${process.pid}-${Date.now()}@EXAMPLE.com`,
    name: "Dani Grita",
  });

  await inviteToSpaceByEmail(db, { space: casa, invitedBy: cami.id }, shouty.email);

  const waiting = await invitationsWaitingFor(db, shouty.id);

  expect(waiting).toHaveLength(1);
  await expect(
    acceptInvitationAsMember(db, shouty.id, waiting[0]!.invitation.id),
  ).resolves.toEqual(casa);
});
