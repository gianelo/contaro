// @vitest-environment node
import { afterAll, expect, it } from "vitest";
import { createDatabase, databaseUrl } from "@/db/connection";
import { memberFromGoogle } from "@/db/members";
import { acceptInvitationAsMember, inviteToSpaceByEmail } from "@/db/invitations";
import { createSpaceForMember } from "@/db/spaces";
import { calendarDate } from "@/domain/calendar/month";
import { readAvisos } from "./avisos";

const { db, sql } = createDatabase(databaseUrl(), { max: 1 });
afterAll(async () => { await sql.end(); });
let serial = 0;
const member = () => memberFromGoogle(db, {
  subject: `avisos-${process.pid}-${Date.now()}-${serial++}`,
  email: `avisos-${process.pid}-${Date.now()}-${serial++}@example.com`,
  name: "Ana",
});
const reader = { locales: ["es-AR"], today: calendarDate("2026-11-03") };
const headers = new Headers({ "x-vercel-ip-timezone": "UTC" });

it("composes account invitations and only the verified Space's passive waiting month and current-month Fixed count", async () => {
  const creator = await member();
  const other = await member();
  const space = await createSpaceForMember(db, creator.id, { name: "Casa", currency: "ARS" });
  const elsewhere = await createSpaceForMember(db, other.id, { name: "Other", currency: "ARS" });
  await sql`UPDATE space_members SET joined_at = '2026-09-01T12:00:00Z', last_opened_at = '2026-09-28T12:00:00Z' WHERE space_id = ${space.id} AND member_id = ${creator.id}`;
  await sql`INSERT INTO space_invitations (space_id, email, invited_by) VALUES (${elsewhere.id}, ${creator.email}, ${other.id})`;
  const [category] = await sql`INSERT INTO categories (space_id, name) VALUES (${space.id}, 'Rent') RETURNING id`;
  const [otherCategory] = await sql`INSERT INTO categories (space_id, name) VALUES (${elsewhere.id}, 'Rent') RETURNING id`;
  await sql`INSERT INTO budget_items (space_id, category_id, month, amount, kind, name, due_on) VALUES
    (${space.id}, ${category?.id}, '2026-11', 100, 'fixed', 'Rent', '2026-11-29'),
    (${space.id}, ${category?.id}, '2026-10', 100, 'fixed', 'Old', '2026-10-01'),
    (${elsewhere.id}, ${otherCategory?.id}, '2026-11', 100, 'fixed', 'Other', '2026-11-01')`;

  const result = await readAvisos(db, creator.id, space, reader, headers);
  expect(result).not.toBeNull();
  if (!result) throw new Error("Creator lost membership");
  expect(result.invitations).toHaveLength(1);
  expect(result.invitations[0]?.space.id).toBe(elsewhere.id);
  expect(result.waitingMonth).toBe("2026-09");
  expect(result.unpaidFixedCount).toBe(1);
  const [opening] = await sql`SELECT last_opened_at FROM space_members WHERE space_id = ${space.id} AND member_id = ${creator.id}`;
  expect(new Date(opening?.last_opened_at as string).toISOString()).toBe("2026-09-28T12:00:00.000Z");
  // Even an authenticated account with invitations cannot read another Space's notices.
  await expect(readAvisos(db, other.id, space, reader, headers)).resolves.toBeNull();
  await expect(readAvisos(db, creator.id, elsewhere, reader, headers)).resolves.toBeNull();
});

it("reads an invited Member's join-bound waiting month and shared Fixed count without leaking others' invitations", async () => {
  const creator = await member();
  const invited = await member();
  const stranger = await member();
  const space = await createSpaceForMember(db, creator.id, { name: "Shared", currency: "ARS" });
  // The creator was here before the invited Member, so their waiting months differ.
  await sql`UPDATE space_members SET joined_at = '2026-08-01T12:00:00Z' WHERE space_id = ${space.id} AND member_id = ${creator.id}`;
  const invitation = await inviteToSpaceByEmail(db, { space, invitedBy: creator.id }, invited.email);
  await expect(acceptInvitationAsMember(db, invited.id, invitation.id)).resolves.toEqual(space);
  await sql`UPDATE space_members SET joined_at = '2026-10-01T12:00:00Z' WHERE space_id = ${space.id} AND member_id = ${invited.id}`;
  // This offer is addressed to the creator, not the invited Member.
  const otherSpace = await createSpaceForMember(db, stranger.id, { name: "Elsewhere", currency: "ARS" });
  await inviteToSpaceByEmail(db, { space: otherSpace, invitedBy: stranger.id }, creator.email);
  const [category] = await sql`INSERT INTO categories (space_id, name) VALUES (${space.id}, 'Rent') RETURNING id`;
  await sql`INSERT INTO budget_items (space_id, category_id, month, amount, kind, name, due_on)
    VALUES (${space.id}, ${category?.id}, '2026-11', 100, 'fixed', 'Rent', '2026-11-29')`;

  const creatorNotice = await readAvisos(db, creator.id, space, reader, headers);
  const memberNotice = await readAvisos(db, invited.id, space, reader, headers);
  expect(creatorNotice?.waitingMonth).toBe("2026-08");
  expect(memberNotice).toMatchObject({ waitingMonth: "2026-10", unpaidFixedCount: 1, invitations: [] });
  expect(memberNotice?.unpaidFixedCount).toBe(creatorNotice?.unpaidFixedCount);
  expect(creatorNotice?.invitations.map((entry) => entry.space.id)).toEqual([otherSpace.id]);
});
