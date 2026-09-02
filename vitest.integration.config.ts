import { defineConfig } from "vitest/config";
import { config } from "dotenv";

// dotenv is loaded inline here rather than through a shared helper: a module
// with an import-time side effect trips this loader. A pure import is fine —
// drizzle.config.ts imports one.
config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["src/**/*.integration.test.ts"],
  },
});
