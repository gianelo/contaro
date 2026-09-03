import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";
import { authSecret } from "./e2e/secret";

// The seam tests seed a Member, so the run needs the same DATABASE_URL the
// server does. Inline for the same reason the vitest configs are: a module
// with an import-time side effect trips this loader. A pure import is fine —
// this file already imports one from ./e2e/secret.
loadEnv({ path: ".env.local", quiet: true });
loadEnv({ path: ".env", quiet: true });

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
    // The run signs its own session cookies, so the server it starts has to
    // verify them with the same secret. No Google credentials are needed: the
    // handshake never happens (see e2e/session.ts).
    env: {
      AUTH_SECRET: authSecret,
      // Auth.js refuses an untrusted host outside Vercel, and the run serves
      // itself on localhost. Production sets this too (see README).
      AUTH_TRUST_HOST: "true",
    },
  },
});
