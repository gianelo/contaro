import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Connection = ReturnType<typeof createDatabase>;

/**
 * Somewhere queries can be run: the pool, or a transaction open on it.
 *
 * Every reader and writer in `src/db` takes this rather than the pool itself,
 * so one of them can be called from inside another's transaction. Paying a
 * Fixed item is what needs it (#13) -- the Movement and the link to it are
 * both writes or neither -- and taking the pool there would have meant a
 * second, transaction-shaped copy of `recordMovementInSpace` with the rules
 * of the first one written out again.
 */
export type Queries =
  | Connection["db"]
  | Parameters<Parameters<Connection["db"]["transaction"]>[0]>[0];

/**
 * Opens a connection pool and wraps it in Drizzle. Kept free of any Next or
 * React import so an integration test can drive it directly.
 */
export function createDatabase(url: string, options?: postgres.Options<Record<string, postgres.PostgresType>>) {
  const sql = postgres(url, options);
  return { db: drizzle(sql, { schema }), sql };
}

export function databaseUrl(
  env: Record<string, string | undefined> = process.env,
): string {
  const url = env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and run `pnpm db:up`.",
    );
  }
  return url;
}
