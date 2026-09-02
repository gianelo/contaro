import { defineConfig } from "vitest/config";
import { config } from "dotenv";

// Two lines, inline in both configs on purpose: importing a shared .ts module
// from a Vite/drizzle config trips their native config loaders.
config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["src/**/*.integration.test.ts"],
  },
});
