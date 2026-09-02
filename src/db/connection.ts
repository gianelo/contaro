import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Connection = ReturnType<typeof createDatabase>;

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
