import { defineConfig, devices } from "@playwright/test";

const port = 3100;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "on-first-retry",
  },
  // The product is mobile-first: the default project is a phone.
  projects: [{ name: "mobile", use: { ...devices["iPhone 13"] } }],
  webServer: {
    command: `pnpm build && pnpm start --port ${port}`,
    url: `http://localhost:${port}`,
    // Never reuse: with `pnpm build` in the command, a reused server would
    // silently test the previous build.
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
