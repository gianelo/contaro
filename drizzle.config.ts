import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

// Two lines, inline in both configs on purpose: importing a shared .ts module
// from a Vite/drizzle config trips their native config loaders.
config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
});
