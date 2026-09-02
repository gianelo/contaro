import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", "eslint-rules/**/*.test.ts"],
    // Integration tests need a running Postgres; `pnpm test:db` runs them.
    exclude: [
      "node_modules/**",
      "e2e/**",
      ".next/**",
      "**/*.integration.test.ts",
    ],
  },
});
