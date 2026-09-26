// @vitest-environment node
import { afterAll, expect, it } from "vitest";
import { createDatabase, databaseUrl } from "@/db/connection";
import { memberFromGoogle } from "@/db/members";
import { createSpaceForMember, markSpaceOpened } from "@/db/spaces";
import { calendarDate } from "@/domain/calendar/month";
import { dayForReader } from "@/app/reader";
import { closeWaitingOn, theWaitingMonth } from "./waiting";

const { db, sql } = createDatabase(databaseUrl(), { max: 1 });
afterAll(async () => { await sql.end(); });
let next = 0;
const fixture = async (joined = "2026-08-02T12:00:00.000Z") => {
  const creator = await memberFromGoogle(db, {
    subject: `waiting-${process.pid}-${Date.now()}-${next++}`,
    email: `waiting-${process.pid}-${Date.now()}-${next++}@example.com`,
    name: "Ana",
  });
  const space = await createSpaceForMember(db, creator.id, { name: "Casa", currency: "ARS" });
  await sql`UPDATE space_members SET joined_at = ${joined} WHERE space_id = ${space.id} AND member_id = ${creator.id}`;
  return { creator, space };
};
const reader = { locales: ["es-AR"], today: calendarDate("2026-11-03") };
const headers = new Headers({ "x-vercel-ip-timezone": "America/Bogota" });
const ask = (memberId: string, spaceId: string, today = reader.today, zone = headers) =>
  theWaitingMonth(db, memberId, spaceId, { ...reader, today }, zone);
const close = async (spaceId: string, creatorId: string, month: string) => {
  await sql`INSERT INTO closed_months (space_id, month, closed_by, closed_on)
    VALUES (${spaceId}, ${month}, ${creatorId}, '2026-11-02')`;
};

it("answers the oldest ended unclosed month, skipping closed months", async () => {
  const { creator, space } = await fixture();
  await close(space.id, creator.id, "2026-08");
  await close(space.id, creator.id, "2026-10");
  await expect(ask(creator.id, space.id)).resolves.toBe("2026-09");
});

it("starts at the Member's join month, including its last day", async () => {
  const { creator, space } = await fixture("2026-09-30T12:00:00.000Z");
  await expect(ask(creator.id, space.id, calendarDate("2026-10-02"))).resolves.toBe("2026-09");
  const later = await fixture("2026-10-01T12:00:00.000Z");
  await expect(ask(later.creator.id, later.space.id, calendarDate("2026-10-02"))).resolves.toBeNull();
});

it("returns nothing when all ended months are closed or none has ended", async () => {
  const { creator, space } = await fixture("2026-09-01T12:00:00.000Z");
  await close(space.id, creator.id, "2026-09");
  await expect(ask(creator.id, space.id, calendarDate("2026-10-03"))).resolves.toBeNull();
  await expect(ask(creator.id, space.id, calendarDate("2026-09-30"))).resolves.toBeNull();
});

it("does not disclose another Member's Space or throw for a malformed id", async () => {
  const mine = await fixture();
  const other = await fixture();
  await expect(ask(mine.creator.id, other.space.id)).resolves.toBeNull();
  await expect(ask(mine.creator.id, "invalid")).resolves.toBeNull();
});

it("interprets a midnight UTC join in the Reader's timezone", async () => {
  const { creator, space } = await fixture("2026-10-01T02:00:00.000Z");
  await expect(ask(creator.id, space.id, calendarDate("2026-10-02"))).resolves.toBe("2026-09");
  await expect(ask(creator.id, space.id, calendarDate("2026-10-02"), new Headers({ "x-vercel-ip-timezone": "UTC" }))).resolves.toBeNull();
});

it("leaves the previous opening untouched until the actual opening", async () => {
  const { creator, space } = await fixture("2026-09-01T12:00:00.000Z");
  const previous = "2026-09-28T12:00:00.000Z";
  await sql`UPDATE space_members SET last_opened_at = ${previous} WHERE space_id = ${space.id} AND member_id = ${creator.id}`;
  await ask(creator.id, space.id, calendarDate("2026-10-03"));
  await ask(creator.id, space.id, calendarDate("2026-10-03"));
  const [row] = await sql`SELECT last_opened_at FROM space_members WHERE space_id = ${space.id} AND member_id = ${creator.id}`;
  expect(new Date(row?.last_opened_at as string).toISOString()).toBe(previous);
  const opening = await markSpaceOpened(db, space.id, creator.id);
  expect(opening?.lastOpenedAt?.toISOString()).toBe(previous);
  expect(opening).not.toBeNull();
  if (opening === null) throw new Error("Creator membership disappeared");

  const waiting = closeWaitingOn({
    space,
    memberId: creator.id,
    creatorName: creator.name,
    today: calendarDate("2026-10-03"),
    closed: new Set<string>(),
    history: {
      joined: dayForReader(headers, opening.joinedAt),
      lastOpened: opening.lastOpenedAt && dayForReader(headers, opening.lastOpenedAt),
    },
  });
  expect(waiting).toMatchObject({ month: "2026-09", announces: true });
});
