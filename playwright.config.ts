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
    // Both clocks in one zone. The entry form dates a Movement from the
    // browser's own day; the month's list labels that day against the
    // server's, which is UTC. Unpinned, the browser takes the machine's zone,
    // and a machine west of Greenwich straddles a date boundary the server
    // does not: from seven in the evening in UTC-05 a row recorded a minute
    // ago is headed with its date instead of "Hoy". UTC because that is what
    // the server computes, not because it is anybody's zone. This is a pin
    // and not a frozen clock: the run still reads the real time.
    //
    // The stop-gap half, and written to be replaced. ADR-0018 gives the day a
    // screen names to the Reader, and the run that drives that path pins
    // "America/Bogota" here together with an `x-vercel-ip-timezone` to match
    // (#30) — pinning only the zone would pass through the fallback and look
    // like it worked by accident. Until that lands, a suite that fails by the
    // hour is worth stopping on its own: one that cries wolf every evening
    // teaches people to stop reading it.
    timezoneId: "UTC",
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
