import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";
import { migrationUrl } from "./src/db/migration-url";

// dotenv is loaded inline here and in the vitest configs rather than through a
// shared helper: a module with an import-time side effect trips their native
// loaders. A pure import like migrationUrl is fine — drizzle-kit bundles this
// config before it runs it.
config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dbCredentials: {
    // The direct endpoint, never the pooled one (ADR-0008).
    url: migrationUrl(),
  },
});
