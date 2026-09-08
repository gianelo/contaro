// @vitest-environment node
import { afterAll, expect, it } from "vitest";
import { calendarDate, month } from "@/domain/calendar/month";
import { UnclosableMonthError } from "@/domain/space/closure";
import { createDatabase, databaseUrl } from "./connection";
import { memberFromGoogle } from "./members";
import { createSpaceForMember } from "./spaces";
import {
  ClosedMonthError,
  closeMonthInSpace,
  closedMonthsFrom,
  refuseAClosedMonth,
} from "./closed-months";

// Run with `pnpm test:db`, which starts Postgres first.
const { db, sql } = createDatabase(databaseUrl(), { max: 1 });

afterAll(async () => {
  await sql.end();
});

/** The database outlives a run, so every test invents its own Member. */
let next = 0;
const aMember = async (name: string) =>
  memberFromGoogle(db, {
    subject: `closed-months-${process.pid}-${Date.now()}-${next++}`,
    email: `${name.toLowerCase()}@example.com`,
    name,
  });

const aSpace = async (name: string) => {
  const creator = await aMember(name);
  const space = await createSpaceForMember(db, creator.id, {
    name: "Casa",
    currency: "ARS",
  });
  return { creator, space };
};

const SEPTEMBER = month("2026-09");
const IN_OCTOBER = calendarDate("2026-10-03");

it("closes a month and says who closed it, and on which day", async () => {
  const { creator, space } = await aSpace("Ana");

  await expect(
    closeMonthInSpace(db, { space, closedBy: creator.id, today: IN_OCTOBER }, SEPTEMBER),
  ).resolves.toEqual({
    spaceId: space.id,
    month: "2026-09",
    closedBy: creator.id,
    closedOn: "2026-10-03",
  });
});

it("does not close a month somebody already closed", async () => {
  const { creator, space } = await aSpace("Beto");
  const closing = { space, closedBy: creator.id, today: IN_OCTOBER };

  await closeMonthInSpace(db, closing, SEPTEMBER);

  await expect(closeMonthInSpace(db, closing, SEPTEMBER)).resolves.toBeNull();
});

it("does not let the invited Member close a month", async () => {
  const { space } = await aSpace("Cami");
  const dani = await aMember("Dani");

  await expect(
    closeMonthInSpace(db, { space, closedBy: dani.id, today: IN_OCTOBER }, SEPTEMBER),
  ).rejects.toThrow(UnclosableMonthError);
});

it("does not close a month that is still running", async () => {
  const { creator, space } = await aSpace("Eli");

  await expect(
    closeMonthInSpace(
      db,
      { space, closedBy: creator.id, today: calendarDate("2026-09-30") },
      SEPTEMBER,
    ),
  ).rejects.toThrow(UnclosableMonthError);
});

it("says nothing about a month nobody has closed", async () => {
  const { space } = await aSpace("Fede");

  await expect(refuseAClosedMonth(db, space.id, SEPTEMBER)).resolves.toBeUndefined();
});

it("refuses a write into a month that is closed", async () => {
  const { creator, space } = await aSpace("Gala");
  await closeMonthInSpace(db, { space, closedBy: creator.id, today: IN_OCTOBER }, SEPTEMBER);

  await expect(refuseAClosedMonth(db, space.id, SEPTEMBER)).rejects.toThrow(
    ClosedMonthError,
  );
});

it("leaves every other month of the Space open", async () => {
  const { creator, space } = await aSpace("Hugo");
  await closeMonthInSpace(db, { space, closedBy: creator.id, today: IN_OCTOBER }, SEPTEMBER);

  await expect(
    refuseAClosedMonth(db, space.id, month("2026-10")),
  ).resolves.toBeUndefined();
  await expect(
    refuseAClosedMonth(db, space.id, month("2026-08")),
  ).resolves.toBeUndefined();
});

/*
 * A month is closed inside one Space. Two Spaces sharing a Member share no
 * months, and a close reaching across them would freeze a plan its own creator
 * never touched.
 */
it("closes the month of one Space and not the same month of another", async () => {
  const { creator, space } = await aSpace("Ines");
  const other = await createSpaceForMember(db, creator.id, {
    name: "Personal",
    currency: "ARS",
  });

  await closeMonthInSpace(db, { space, closedBy: creator.id, today: IN_OCTOBER }, SEPTEMBER);

  await expect(
    refuseAClosedMonth(db, other.id, SEPTEMBER),
  ).resolves.toBeUndefined();
});

/*
 * ADR-0002 has no unlock, and a guarantee only the code enforces is a guarantee
 * that lasts until the second caller. Migration 0016 refuses both ways a row
 * here could stop saying what it says.
 */
it("refuses to reopen a closed month from outside the code entirely", async () => {
  const { creator, space } = await aSpace("Kira");
  await closeMonthInSpace(db, { space, closedBy: creator.id, today: IN_OCTOBER }, SEPTEMBER);

  await expect(
    sql`DELETE FROM closed_months WHERE space_id = ${space.id}`,
  ).rejects.toThrow(/never be reopened/);

  await expect(
    sql`UPDATE closed_months SET month = '2026-08' WHERE space_id = ${space.id}`,
  ).rejects.toThrow(/never be reopened or moved/);
});

/*
 * A Space going away takes its months with it, and that is not a reopening.
 *
 * The trigger above cannot be unconditional, because `closed_months` cascades
 * from `spaces`: a refusal that did not tell the two apart would make a Space
 * that ever closed a month impossible to delete -- which is exactly the hazard
 * migration 0016 names as its reason for putting no trigger on `budget_items`
 * or `movements`, and it would be no better for being on this table instead.
 */
it("lets a Space that closed a month be deleted, months and all", async () => {
  const { creator, space } = await aSpace("Nico");
  await closeMonthInSpace(db, { space, closedBy: creator.id, today: IN_OCTOBER }, SEPTEMBER);

  await expect(
    sql`DELETE FROM spaces WHERE id = ${space.id}`,
  ).resolves.toBeDefined();

  await expect(
    sql`SELECT 1 FROM closed_months WHERE space_id = ${space.id}`,
  ).resolves.toHaveLength(0);
});

it("refuses a month written under no calendar", async () => {
  const { creator, space } = await aSpace("Lena");

  await expect(
    sql`INSERT INTO closed_months (space_id, month, closed_by, closed_on)
        VALUES (${space.id}, '2026-13', ${creator.id}, '2027-01-01')`,
  ).rejects.toThrow(/closed_months_month_is_a_month/);
});

it("refuses a close dated inside the month it closes", async () => {
  const { creator, space } = await aSpace("Mateo");

  await expect(
    sql`INSERT INTO closed_months (space_id, month, closed_by, closed_on)
        VALUES (${space.id}, '2026-09', ${creator.id}, '2026-09-30')`,
  ).rejects.toThrow(/closed_months_is_closed_after_it_ended/);
});

/*
 * The same fact the refusal is built on, asked by a screen rather than by a
 * write, and asked about a stretch of months because finding the oldest one
 * still open means knowing about all of them (#118).
 */
it("answers which months are closed, from a month onwards", async () => {
  const { creator, space } = await aSpace("Vera");

  await expect(closedMonthsFrom(db, space.id, month("2026-01"))).resolves
    .toEqual(new Set());

  for (const of of [month("2026-08"), SEPTEMBER]) {
    await closeMonthInSpace(
      db,
      { space, closedBy: creator.id, today: IN_OCTOBER },
      of,
    );
  }

  await expect(
    closedMonthsFrom(db, space.id, month("2026-01")),
  ).resolves.toEqual(new Set(["2026-08", "2026-09"]));

  // The bound is a bound: months before it are not the screen's question.
  await expect(closedMonthsFrom(db, space.id, SEPTEMBER)).resolves.toEqual(
    new Set(["2026-09"]),
  );
});
