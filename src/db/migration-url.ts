/**
 * The endpoint drizzle-kit migrates through.
 *
 * ADR-0008: migrations run against Neon's direct endpoint, never the pooled
 * one, which Neon says "can lead to errors" because the tools do not survive
 * transaction pooling. The app is the other way round — `databaseUrl` in
 * `connection.ts` takes the pooled `DATABASE_URL` and wants it.
 *
 * The refusal is one-sided on purpose: a pooled URL used for migrations is
 * always wrong, while local Postgres has one endpoint and no pooler, so there
 * is nothing to insist on in the other direction.
 */
export function migrationUrl(
  env: Record<string, string | undefined> = process.env,
): string {
  const url = env.DATABASE_URL_UNPOOLED ?? env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "Neither DATABASE_URL_UNPOOLED nor DATABASE_URL is set. Locally, copy " +
        ".env.example to .env.local and run `pnpm db:up`.",
    );
  }
  if (isPooled(url)) {
    throw new Error(
      "This is Neon's pooled endpoint, and migrations must not run through it " +
        "(ADR-0008). Set DATABASE_URL_UNPOOLED to the direct connection string.",
    );
  }
  return url;
}

/** Neon spells its pooled host `<endpoint>-pooler.<region>...`. */
function isPooled(url: string): boolean {
  return url.includes("-pooler.");
}
