// @vitest-environment node
import { afterAll, expect, it } from "vitest";
import { createDatabase, databaseUrl } from "./connection";
import { sql as raw } from "drizzle-orm";

// Run with `pnpm test:db`, which starts Postgres first.
const { db, sql } = createDatabase(databaseUrl(), { max: 1 });

afterAll(async () => {
  await sql.end();
});

it("reaches Postgres through Drizzle", async () => {
  const rows = await db.execute<{ one: number }>(raw`select 1 as one`);
  expect(rows[0]?.one).toBe(1);
});

it("has the first migration applied", async () => {
  const rows = await db.execute<{ extname: string }>(
    raw`select extname from pg_extension where extname = 'pgcrypto'`,
  );
  expect(rows).toHaveLength(1);
});
